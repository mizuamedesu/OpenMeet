import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, IceServer, ServerConfig } from './types.js';
import { roomManager } from './rooms.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: TypedServer, config: ServerConfig): void {
  const getIceServers = (): IceServer[] => {
    const servers: IceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (config.turnEnabled && config.turnUrl) {
      servers.push({
        urls: config.turnUrl,
        username: config.turnUsername,
        credential: config.turnPassword,
      });
    }

    return servers;
  };

  io.on('connection', (socket: TypedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Room creation
    socket.on('room:create', (data, callback) => {
      const roomId = roomManager.createRoom(data.password || null);
      const user = roomManager.addUser(roomId, socket.id, data.username);

      if (!user) {
        callback({ success: false, error: 'Failed to create room' });
        return;
      }

      socket.join(roomId);
      socket.data.userId = user.id;
      socket.data.roomId = roomId;

      callback({ success: true, roomId });
      socket.emit('room:joined', {
        userId: user.id,
        users: roomManager.getUsersInfo(roomId),
        iceServers: getIceServers(),
      });
    });

    // Room join
    socket.on('room:join', (data, callback) => {
      const room = roomManager.getRoom(data.roomId);

      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      if (!roomManager.validatePassword(data.roomId, data.password)) {
        callback({ success: false, error: 'Invalid password' });
        return;
      }

      const user = roomManager.addUser(data.roomId, socket.id, data.username);

      if (!user) {
        callback({ success: false, error: 'Failed to join room' });
        return;
      }

      socket.join(data.roomId);
      socket.data.userId = user.id;
      socket.data.roomId = data.roomId;

      // Notify existing users
      socket.to(data.roomId).emit('room:user-joined', {
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          canChat: user.canChat,
          isMuted: user.isMuted,
          isVideoOff: user.isVideoOff,
        },
      });

      callback({
        success: true,
        userId: user.id,
        users: roomManager.getUsersInfo(data.roomId),
        isAdmin: user.isAdmin,
      });

      socket.emit('room:joined', {
        userId: user.id,
        users: roomManager.getUsersInfo(data.roomId),
        iceServers: getIceServers(),
      });
    });

    // Room leave
    socket.on('room:leave', () => {
      handleDisconnect(socket);
    });

    // WebRTC signaling
    socket.on('webrtc:offer', (data) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const targetUser = room.users.get(data.targetId);
      if (!targetUser) return;

      io.to(targetUser.socketId).emit('webrtc:offer', {
        fromId: socket.data.userId!,
        offer: data.offer,
      });
    });

    socket.on('webrtc:answer', (data) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const targetUser = room.users.get(data.targetId);
      if (!targetUser) return;

      io.to(targetUser.socketId).emit('webrtc:answer', {
        fromId: socket.data.userId!,
        answer: data.answer,
      });
    });

    socket.on('webrtc:ice-candidate', (data) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const targetUser = room.users.get(data.targetId);
      if (!targetUser) return;

      io.to(targetUser.socketId).emit('webrtc:ice-candidate', {
        fromId: socket.data.userId!,
        candidate: data.candidate,
      });
    });

    // Chat
    socket.on('chat:message', (data) => {
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;
      if (!roomId || !userId) return;

      const user = roomManager.getUser(roomId, userId);
      if (!user || !user.canChat) return;

      io.to(roomId).emit('chat:message', {
        fromId: userId,
        username: user.username,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    // Admin actions
    socket.on('admin:kick', (data) => {
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;
      if (!roomId || !userId) return;

      if (!roomManager.isAdmin(roomId, userId)) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const targetUser = room.users.get(data.targetId);
      if (!targetUser || targetUser.isAdmin) return;

      io.to(targetUser.socketId).emit('admin:kicked');
      roomManager.removeUser(roomId, data.targetId);
      io.to(roomId).emit('room:user-left', { userId: data.targetId });
    });

    socket.on('admin:mute', (data) => {
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;
      if (!roomId || !userId) return;

      if (!roomManager.isAdmin(roomId, userId)) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const targetUser = room.users.get(data.targetId);
      if (!targetUser) return;

      roomManager.updateUser(roomId, data.targetId, { isMuted: data.muted });

      io.to(targetUser.socketId).emit('admin:muted', { muted: data.muted });
      io.to(roomId).emit('admin:user-updated', {
        userId: data.targetId,
        updates: { isMuted: data.muted },
      });
    });

    socket.on('admin:video-off', (data) => {
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;
      if (!roomId || !userId) return;

      if (!roomManager.isAdmin(roomId, userId)) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const targetUser = room.users.get(data.targetId);
      if (!targetUser) return;

      roomManager.updateUser(roomId, data.targetId, { isVideoOff: data.videoOff });

      io.to(targetUser.socketId).emit('admin:video-off', { videoOff: data.videoOff });
      io.to(roomId).emit('admin:user-updated', {
        userId: data.targetId,
        updates: { isVideoOff: data.videoOff },
      });
    });

    socket.on('admin:chat-permission', (data) => {
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;
      if (!roomId || !userId) return;

      if (!roomManager.isAdmin(roomId, userId)) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const targetUser = room.users.get(data.targetId);
      if (!targetUser) return;

      roomManager.updateUser(roomId, data.targetId, { canChat: data.canChat });

      io.to(targetUser.socketId).emit('admin:chat-permission', { canChat: data.canChat });
      io.to(roomId).emit('admin:user-updated', {
        userId: data.targetId,
        updates: { canChat: data.canChat },
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  function handleDisconnect(socket: TypedSocket): void {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;

    if (roomId && userId) {
      roomManager.removeUser(roomId, userId);
      socket.to(roomId).emit('room:user-left', { userId });
      socket.leave(roomId);
    }

    console.log(`Client disconnected: ${socket.id}`);
  }
}
