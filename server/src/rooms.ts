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

    // If admin left, assign new admin to first user
    if (room.adminId === userId) {
      const firstUser = room.users.values().next().value;
      if (firstUser) {
        firstUser.isAdmin = true;
        room.adminId = firstUser.id;
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
}

export const roomManager = new RoomManager();
