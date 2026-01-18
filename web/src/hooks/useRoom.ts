import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';
import { webrtcManager } from '../lib/webrtc';
import { useRoomStore } from '../stores/roomStore';
import { nanoid } from 'nanoid';

interface RoomResponse {
  success: boolean;
  roomId?: string;
  error?: string;
}

interface JoinResponse {
  success: boolean;
  userId?: string;
  isAdmin?: boolean;
  error?: string;
}

export function useRoom() {
  const navigate = useNavigate();
  const {
    roomId,
    userId,
    username,
    isAdmin,
    users,
    setRoom,
    setUsername,
    setConnected,
    setUsers,
    addUser,
    removeUser,
    updateUser,
    setMutedByAdmin,
    setVideoOffByAdmin,
    setCanChat,
    addMessage,
    setRemoteStream,
    removeRemoteStream,
    setIceServers,
    reset,
  } = useRoomStore();

  const socket = getSocket();

  useEffect(() => {
    // Socket event listeners
    socket.on('room:joined', (data) => {
      setUsers(data.users);
      setIceServers(data.iceServers);
      webrtcManager.setIceServers(data.iceServers);
      setConnected(true);

      // Create offers for existing users
      for (const user of data.users) {
        if (user.id !== data.userId) {
          createOfferForPeer(user.id);
        }
      }
    });

    socket.on('room:user-joined', (data) => {
      addUser(data.user);
      // Don't create offer here, let the new user initiate
    });

    socket.on('room:user-left', (data) => {
      removeUser(data.userId);
      webrtcManager.closePeerConnection(data.userId);
      removeRemoteStream(data.userId);
    });

    socket.on('room:error', (data) => {
      console.error('Room error:', data.message);
      alert(data.message);
    });

    // WebRTC signaling
    socket.on('webrtc:offer', async (data) => {
      const answer = await webrtcManager.handleOffer(data.fromId, data.offer);
      socket.emit('webrtc:answer', { targetId: data.fromId, answer });
    });

    socket.on('webrtc:answer', async (data) => {
      await webrtcManager.handleAnswer(data.fromId, data.answer);
    });

    socket.on('webrtc:ice-candidate', async (data) => {
      await webrtcManager.handleIceCandidate(data.fromId, data.candidate);
    });

    // Chat
    socket.on('chat:message', (data) => {
      addMessage({
        id: nanoid(),
        fromId: data.fromId,
        username: data.username,
        message: data.message,
        timestamp: data.timestamp,
      });
    });

    // Admin actions
    socket.on('admin:kicked', () => {
      alert('You have been kicked from the room');
      leaveRoom();
      navigate('/');
    });

    socket.on('admin:muted', (data) => {
      setMutedByAdmin(data.muted);
      if (data.muted) {
        webrtcManager.toggleAudio(false);
      }
    });

    socket.on('admin:video-off', (data) => {
      setVideoOffByAdmin(data.videoOff);
      if (data.videoOff) {
        webrtcManager.toggleVideo(false);
      }
    });

    socket.on('admin:chat-permission', (data) => {
      setCanChat(data.canChat);
    });

    socket.on('admin:user-updated', (data) => {
      updateUser(data.userId, data.updates);
    });

    // Setup WebRTC callbacks
    webrtcManager.setCallbacks({
      onTrack: (peerId, stream) => {
        setRemoteStream(peerId, stream);
      },
      onIceCandidate: (peerId, candidate) => {
        socket.emit('webrtc:ice-candidate', { targetId: peerId, candidate });
      },
      onConnectionStateChange: (peerId, state) => {
        console.log(`Peer ${peerId} connection state: ${state}`);
        if (state === 'failed' || state === 'disconnected') {
          // Try to reconnect
          webrtcManager.closePeerConnection(peerId);
          createOfferForPeer(peerId);
        }
      },
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:user-joined');
      socket.off('room:user-left');
      socket.off('room:error');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('chat:message');
      socket.off('admin:kicked');
      socket.off('admin:muted');
      socket.off('admin:video-off');
      socket.off('admin:chat-permission');
      socket.off('admin:user-updated');
    };
  }, []);

  const createOfferForPeer = async (peerId: string) => {
    const offer = await webrtcManager.createOffer(peerId);
    socket.emit('webrtc:offer', { targetId: peerId, offer });
  };

  const createRoom = useCallback(
    async (name: string, password?: string) => {
      connectSocket();
      setUsername(name);

      return new Promise<string>((resolve, reject) => {
        socket.emit('room:create', { username: name, password }, (response: RoomResponse) => {
          if (response.success && response.roomId) {
            setRoom(response.roomId, '', true);
            resolve(response.roomId);
          } else {
            reject(new Error(response.error || 'Failed to create room'));
          }
        });
      });
    },
    [socket, setUsername, setRoom]
  );

  const joinRoom = useCallback(
    async (id: string, name: string, password?: string) => {
      connectSocket();
      setUsername(name);

      return new Promise<void>((resolve, reject) => {
        socket.emit('room:join', { roomId: id, username: name, password }, (response: JoinResponse) => {
          if (response.success && response.userId) {
            setRoom(id, response.userId, response.isAdmin || false);
            resolve();
          } else {
            reject(new Error(response.error || 'Failed to join room'));
          }
        });
      });
    },
    [socket, setUsername, setRoom]
  );

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    webrtcManager.cleanup();
    disconnectSocket();
    reset();
  }, [socket, reset]);

  const sendMessage = useCallback(
    (message: string) => {
      socket.emit('chat:message', { message });
    },
    [socket]
  );

  const kickUser = useCallback(
    (targetId: string) => {
      socket.emit('admin:kick', { targetId });
    },
    [socket]
  );

  const muteUser = useCallback(
    (targetId: string, muted: boolean) => {
      socket.emit('admin:mute', { targetId, muted });
    },
    [socket]
  );

  const setUserVideoOff = useCallback(
    (targetId: string, videoOff: boolean) => {
      socket.emit('admin:video-off', { targetId, videoOff });
    },
    [socket]
  );

  const setUserChatPermission = useCallback(
    (targetId: string, canChat: boolean) => {
      socket.emit('admin:chat-permission', { targetId, canChat });
    },
    [socket]
  );

  return {
    roomId,
    userId,
    username,
    isAdmin,
    users,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    kickUser,
    muteUser,
    setUserVideoOff,
    setUserChatPermission,
  };
}
