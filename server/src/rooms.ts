import { nanoid } from 'nanoid';
import type { Room, User, UserInfo } from './types.js';

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(password: string | null): string {
    const roomId = nanoid(8);
    const room: Room = {
      id: roomId,
      password,
      adminId: '',
      users: new Map(),
      createdAt: new Date(),
    };
    this.rooms.set(roomId, room);
    return roomId;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  validatePassword(roomId: string, password: string | undefined): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (!room.password) return true;
    return room.password === password;
  }

  addUser(roomId: string, socketId: string, username: string): User | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const isFirstUser = room.users.size === 0;
    const userId = nanoid(10);

    const user: User = {
      id: userId,
      socketId,
      username,
      roomId,
      isAdmin: isFirstUser,
      canChat: true,
      isMuted: false,
      isVideoOff: false,
      adminPriority: room.users.size, // New users get lowest priority
    };

    if (isFirstUser) {
      room.adminId = userId;
    }

    room.users.set(userId, user);
    return user;
  }

  removeUser(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.delete(userId);

    // If room is empty, delete it
    if (room.users.size === 0) {
      this.deleteRoom(roomId);
      return;
    }

    // If admin left, assign new admin based on priority
    if (room.adminId === userId) {
      const usersArray = Array.from(room.users.values());
      // Sort by priority (lower = higher priority)
      usersArray.sort((a, b) => a.adminPriority - b.adminPriority);
      const newAdmin = usersArray[0];
      if (newAdmin) {
        newAdmin.isAdmin = true;
        room.adminId = newAdmin.id;
      }
    }
  }

  getUser(roomId: string, userId: string): User | undefined {
    const room = this.rooms.get(roomId);
    return room?.users.get(userId);
  }

  getUserBySocketId(socketId: string): { room: Room; user: User } | null {
    for (const room of this.rooms.values()) {
      for (const user of room.users.values()) {
        if (user.socketId === socketId) {
          return { room, user };
        }
      }
    }
    return null;
  }

  getUsersInfo(roomId: string): UserInfo[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.users.values()).map((user) => ({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      canChat: user.canChat,
      isMuted: user.isMuted,
      isVideoOff: user.isVideoOff,
      adminPriority: user.adminPriority,
    }));
  }

  updateUser(roomId: string, userId: string, updates: Partial<Pick<User, 'canChat' | 'isMuted' | 'isVideoOff'>>): User | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.get(userId);
    if (!user) return null;

    Object.assign(user, updates);
    return user;
  }

  isAdmin(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    return room?.adminId === userId;
  }

  transferAdmin(roomId: string, fromUserId: string, toUserId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.adminId !== fromUserId) return false;

    const fromUser = room.users.get(fromUserId);
    const toUser = room.users.get(toUserId);
    if (!fromUser || !toUser) return false;

    fromUser.isAdmin = false;
    toUser.isAdmin = true;
    room.adminId = toUserId;
    return true;
  }

  setAdminPriority(roomId: string, userId: string, priority: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const user = room.users.get(userId);
    if (!user) return false;

    user.adminPriority = priority;
    return true;
  }
}

export const roomManager = new RoomManager();
