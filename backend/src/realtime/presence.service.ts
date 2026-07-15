import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

// Tracks which users are connected over WebSocket right now, and when they
// were last seen. Shared by friends (online dots), chat (delivery) and
// locations (who receives live-GPS broadcasts).
@Injectable()
export class PresenceService {
  private server: Server | null = null;
  private readonly socketsByUser = new Map<number, Set<string>>();
  private readonly userBySocket = new Map<string, number>();
  private readonly lastSeen = new Map<number, Date>();

  setServer(server: Server) {
    this.server = server;
  }

  register(userId: number, socketId: string) {
    let set = this.socketsByUser.get(userId);
    if (!set) {
      set = new Set();
      this.socketsByUser.set(userId, set);
    }
    set.add(socketId);
    this.userBySocket.set(socketId, userId);
    this.lastSeen.set(userId, new Date());
  }

  /** Returns the userId that owned the socket, if any. */
  unregister(socketId: string): number | null {
    const userId = this.userBySocket.get(socketId);
    if (userId === undefined) return null;
    this.userBySocket.delete(socketId);
    const set = this.socketsByUser.get(userId);
    if (set) {
      set.delete(socketId);
      if (set.size === 0) this.socketsByUser.delete(userId);
    }
    this.lastSeen.set(userId, new Date());
    return userId;
  }

  userForSocket(socketId: string): number | null {
    return this.userBySocket.get(socketId) ?? null;
  }

  isOnline(userId: number): boolean {
    return this.socketsByUser.has(userId);
  }

  onlineUserIds(): number[] {
    return [...this.socketsByUser.keys()];
  }

  lastSeenAt(userId: number): Date | null {
    return this.lastSeen.get(userId) ?? null;
  }

  touch(userId: number) {
    this.lastSeen.set(userId, new Date());
  }

  /** Emit an event to every open socket of the given user. */
  emitToUser(userId: number, event: string, payload: unknown) {
    if (!this.server) return;
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) return;
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }
}
