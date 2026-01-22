import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';
import { webrtcManager } from '../lib/webrtc';
import { useRoomStore } from '../stores/roomStore';
import { nanoid } from 'nanoid';
import type { DataChannelMessage, FileTransferMetadata } from '../lib/types';

const CHUNK_SIZE = 16 * 1024; // 16KB chunks

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
    setAdmin,
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
    addFileTransfer,
    updateFileTransfer,
    setRemoteStream,
    removeRemoteStream,
    setIceServers,
    reset,
  } = useRoomStore();

  // Store incoming file chunks
  const pendingChunks = useRef<Map<string, { metadata: FileTransferMetadata; chunks: Map<number, string> }>>(new Map());

  const socket = getSocket();

  useEffect(() => {
    // Remove existing listeners first to prevent duplicates
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
    socket.off('admin:promoted');

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

    socket.on('admin:promoted', () => {
      setAdmin(true);
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
      onDataChannelMessage: (peerId, message) => {
        handleDataChannelMessage(peerId, message);
      },
      onDataChannelOpen: (peerId) => {
        console.log(`Data channel opened with peer ${peerId}`);
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
      socket.off('admin:promoted');
    };
  }, []);

  const createOfferForPeer = async (peerId: string) => {
    const offer = await webrtcManager.createOffer(peerId);
    socket.emit('webrtc:offer', { targetId: peerId, offer });
  };

  const handleDataChannelMessage = (_peerId: string, message: DataChannelMessage) => {
    switch (message.type) {
      case 'file-metadata': {
        const metadata = message.payload;
        pendingChunks.current.set(metadata.id, {
          metadata,
          chunks: new Map(),
        });
        // Add to UI as pending transfer
        addFileTransfer({
          id: metadata.id,
          fileName: metadata.fileName,
          fileSize: metadata.fileSize,
          fileType: metadata.fileType,
          fromId: metadata.fromId,
          fromUsername: metadata.fromUsername,
          progress: 0,
          status: 'transferring',
          timestamp: Date.now(),
        });
        break;
      }
      case 'file-chunk': {
        const { transferId, chunkIndex, data } = message.payload;
        const pending = pendingChunks.current.get(transferId);
        if (!pending) return;

        pending.chunks.set(chunkIndex, data);

        // Update progress
        const progress = Math.round((pending.chunks.size / pending.metadata.totalChunks) * 100);
        updateFileTransfer(transferId, { progress });
        break;
      }
      case 'file-complete': {
        const { transferId } = message.payload;
        const pending = pendingChunks.current.get(transferId);
        if (!pending) return;

        // Reassemble file from chunks
        const chunks: string[] = [];
        for (let i = 0; i < pending.metadata.totalChunks; i++) {
          const chunk = pending.chunks.get(i);
          if (chunk) chunks.push(chunk);
        }

        // Convert base64 chunks back to blob
        const binaryString = atob(chunks.join(''));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: pending.metadata.fileType });

        updateFileTransfer(transferId, {
          progress: 100,
          status: 'completed',
          blob,
        });

        pendingChunks.current.delete(transferId);
        break;
      }
    }
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

  const sendFile = useCallback(
    async (file: File) => {
      const transferId = nanoid();
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // Add to own UI
      addFileTransfer({
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fromId: userId || '',
        fromUsername: username,
        progress: 0,
        status: 'transferring',
        timestamp: Date.now(),
      });

      // Send metadata to all peers
      const metadata: FileTransferMetadata = {
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fromId: userId || '',
        fromUsername: username,
        totalChunks,
      };

      webrtcManager.broadcastDataChannelMessage({
        type: 'file-metadata',
        payload: metadata,
      });

      // Helper to convert ArrayBuffer slice to base64
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          binary += String.fromCharCode(...chunk);
        }
        return btoa(binary);
      };

      // Wait for DataChannel buffer to drain
      const waitForBuffer = async (): Promise<void> => {
        const maxBufferedAmount = 1024 * 1024; // 1MB threshold
        const channels = webrtcManager.getAllDataChannels();

        for (const channel of channels) {
          while (channel.bufferedAmount > maxBufferedAmount) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      };

      // Send chunks with streaming read
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);
        const buffer = await blob.arrayBuffer();
        const chunkData = arrayBufferToBase64(buffer);

        // Wait if buffer is too full
        await waitForBuffer();

        webrtcManager.broadcastDataChannelMessage({
          type: 'file-chunk',
          payload: {
            transferId,
            chunkIndex: i,
            data: chunkData,
          },
        });

        // Update progress (throttle to every 5 chunks or last chunk)
        if (i % 5 === 0 || i === totalChunks - 1) {
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          updateFileTransfer(transferId, { progress });
        }

        // Yield to UI thread periodically
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Send completion
      webrtcManager.broadcastDataChannelMessage({
        type: 'file-complete',
        payload: { transferId },
      });

      updateFileTransfer(transferId, { progress: 100, status: 'completed' });
    },
    [userId, username, addFileTransfer, updateFileTransfer]
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

  const transferAdmin = useCallback(
    (targetId: string) => {
      socket.emit('admin:transfer', { targetId });
      setAdmin(false);
    },
    [socket, setAdmin]
  );

  const setUserPriority = useCallback(
    (targetId: string, priority: number) => {
      socket.emit('admin:set-priority', { targetId, priority });
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
    sendFile,
    kickUser,
    muteUser,
    setUserVideoOff,
    setUserChatPermission,
    transferAdmin,
    setUserPriority,
  };
}
