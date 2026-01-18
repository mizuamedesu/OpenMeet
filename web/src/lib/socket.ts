import { io, Socket } from 'socket.io-client';

// Use same host as the web app, but port 4000 for signaling server
const getSignalingUrl = () => {
  if (import.meta.env.VITE_SIGNALING_URL) {
    return import.meta.env.VITE_SIGNALING_URL;
  }
  // In development, use the same hostname but port 4000
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000`;
};

const SIGNALING_URL = getSignalingUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SIGNALING_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
