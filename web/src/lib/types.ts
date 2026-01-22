export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  canChat: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  adminPriority: number;
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

// File Transfer types
export interface FileTransferMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fromId: string;
  fromUsername: string;
  totalChunks: number;
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fromId: string;
  fromUsername: string;
  progress: number; // 0-100
  status: 'pending' | 'transferring' | 'completed' | 'error';
  blob?: Blob;
  timestamp: number;
}

export interface FileChunk {
  transferId: string;
  chunkIndex: number;
  data: ArrayBuffer;
}

export type DataChannelMessage =
  | { type: 'file-metadata'; payload: FileTransferMetadata }
  | { type: 'file-chunk'; payload: { transferId: string; chunkIndex: number; data: string } }
  | { type: 'file-complete'; payload: { transferId: string } };
