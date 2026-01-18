export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  canChat: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}
