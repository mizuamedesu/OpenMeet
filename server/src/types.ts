export interface User {
  id: string;
  socketId: string;
  username: string;
  roomId: string;
  isAdmin: boolean;
  canChat: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  adminPriority: number; // Lower = higher priority for succession
}

export interface Room {
  id: string;
  password: string | null;
  adminId: string;
  users: Map<string, User>;
  createdAt: Date;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface ServerConfig {
  turnEnabled: boolean;
  turnUrl: string;
  turnUsername: string;
  turnPassword: string;
}

// Socket.IO Events
export interface ClientToServerEvents {
  'room:create': (data: { password?: string; username: string }, callback: (response: RoomResponse) => void) => void;
  'room:join': (data: { roomId: string; password?: string; username: string }, callback: (response: JoinResponse) => void) => void;
  'room:leave': () => void;

  'webrtc:offer': (data: { targetId: string; offer: RTCSessionDescriptionInit }) => void;
  'webrtc:answer': (data: { targetId: string; answer: RTCSessionDescriptionInit }) => void;
  'webrtc:ice-candidate': (data: { targetId: string; candidate: RTCIceCandidateInit }) => void;

  'chat:message': (data: { message: string }) => void;

  'admin:kick': (data: { targetId: string }) => void;
  'admin:mute': (data: { targetId: string; muted: boolean }) => void;
  'admin:video-off': (data: { targetId: string; videoOff: boolean }) => void;
  'admin:chat-permission': (data: { targetId: string; canChat: boolean }) => void;
  'admin:transfer': (data: { targetId: string }) => void;
  'admin:set-priority': (data: { targetId: string; priority: number }) => void;
}

export interface ServerToClientEvents {
  'room:created': (data: { roomId: string; iceServers: IceServer[] }) => void;
  'room:joined': (data: { userId: string; users: UserInfo[]; iceServers: IceServer[] }) => void;
  'room:user-joined': (data: { user: UserInfo }) => void;
  'room:user-left': (data: { userId: string }) => void;
  'room:error': (data: { message: string }) => void;

  'webrtc:offer': (data: { fromId: string; offer: RTCSessionDescriptionInit }) => void;
  'webrtc:answer': (data: { fromId: string; answer: RTCSessionDescriptionInit }) => void;
  'webrtc:ice-candidate': (data: { fromId: string; candidate: RTCIceCandidateInit }) => void;

  'chat:message': (data: { fromId: string; username: string; message: string; timestamp: number }) => void;

  'admin:kicked': () => void;
  'admin:muted': (data: { muted: boolean }) => void;
  'admin:video-off': (data: { videoOff: boolean }) => void;
  'admin:chat-permission': (data: { canChat: boolean }) => void;
  'admin:user-updated': (data: { userId: string; updates: Partial<UserInfo> }) => void;
  'admin:promoted': () => void;
}

export interface RoomResponse {
  success: boolean;
  roomId?: string;
  error?: string;
}

export interface JoinResponse {
  success: boolean;
  userId?: string;
  users?: UserInfo[];
  isAdmin?: boolean;
  error?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  isAdmin: boolean;
  canChat: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  adminPriority: number;
}
