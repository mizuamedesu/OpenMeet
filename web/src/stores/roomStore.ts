import { create } from 'zustand';
import type { User, ChatMessage, IceServer } from '../lib/types';

interface RoomState {
  // Room info
  roomId: string | null;
  userId: string | null;
  username: string;
  isAdmin: boolean;
  isConnected: boolean;

  // Users
  users: User[];

  // Media state
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isMutedByAdmin: boolean;
  isVideoOffByAdmin: boolean;
  canChat: boolean;

  // Chat
  messages: ChatMessage[];

  // Remote streams
  remoteStreams: Map<string, MediaStream>;

  // ICE servers
  iceServers: IceServer[];

  // Actions
  setRoom: (roomId: string, userId: string, isAdmin: boolean) => void;
  setUsername: (username: string) => void;
  setConnected: (connected: boolean) => void;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;
  setMutedByAdmin: (muted: boolean) => void;
  setVideoOffByAdmin: (off: boolean) => void;
  setCanChat: (canChat: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  setRemoteStream: (peerId: string, stream: MediaStream) => void;
  removeRemoteStream: (peerId: string) => void;
  setIceServers: (servers: IceServer[]) => void;
  reset: () => void;
}

const initialState = {
  roomId: null,
  userId: null,
  username: '',
  isAdmin: false,
  isConnected: false,
  users: [],
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  isMutedByAdmin: false,
  isVideoOffByAdmin: false,
  canChat: true,
  messages: [],
  remoteStreams: new Map<string, MediaStream>(),
  iceServers: [],
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  setRoom: (roomId, userId, isAdmin) =>
    set({ roomId, userId, isAdmin }),

  setUsername: (username) => set({ username }),

  setConnected: (connected) => set({ isConnected: connected }),

  setUsers: (users) => set({ users }),

  addUser: (user) =>
    set((state) => ({
      users: [...state.users, user],
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
    })),

  updateUser: (userId, updates) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, ...updates } : u
      ),
    })),

  setAudioEnabled: (enabled) => set({ isAudioEnabled: enabled }),

  setVideoEnabled: (enabled) => set({ isVideoEnabled: enabled }),

  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),

  setMutedByAdmin: (muted) => set({ isMutedByAdmin: muted }),

  setVideoOffByAdmin: (off) => set({ isVideoOffByAdmin: off }),

  setCanChat: (canChat) => set({ canChat }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setRemoteStream: (peerId, stream) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams);
      newStreams.set(peerId, stream);
      return { remoteStreams: newStreams };
    }),

  removeRemoteStream: (peerId) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams);
      newStreams.delete(peerId);
      return { remoteStreams: newStreams };
    }),

  setIceServers: (servers) => set({ iceServers: servers }),

  reset: () => set(initialState),
}));
