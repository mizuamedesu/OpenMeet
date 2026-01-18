import { io, Socket } from 'socket.io-client';

// Get signaling server URL
const getSignalingUrl = (): string | undefined => {
  // If explicitly set via env var, use that
  if (import.meta.env.VITE_SIGNALING_URL) {
    return import.meta.env.VITE_SIGNALING_URL;
  }

  // Check if we're in production (same domain via reverse proxy)
  // In production, signaling is on the same origin (Traefik routes /socket.io)
  const port = window.location.port;
  if (!port || port === '80' || port === '443') {
    // Production: use same origin (undefined means same origin in socket.io)
    return undefined;
  }

  // Development: use the same hostname but port 4000
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
