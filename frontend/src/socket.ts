// Singleton socket.io connection, authenticated with the app's userId
// convention (see backend RealtimeGateway). Reused by chat, friends
// presence and live GPS.
import { io, Socket } from 'socket.io-client';
import { resolveApiBase } from './api';

let socket: Socket | null = null;
let socketUserId: number | null = null;
let connecting: Promise<Socket> | null = null;

export async function getSocket(userId: number): Promise<Socket> {
  if (socket && socketUserId === userId) return socket;
  if (socket && socketUserId !== userId) {
    socket.disconnect();
    socket = null;
    connecting = null;
  }
  if (!connecting) {
    socketUserId = userId;
    connecting = resolveApiBase().then((base) => {
      socket = io(base, {
        auth: { userId },
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
      });
      return socket;
    });
  }
  return connecting;
}

/** Synchronous accessor — null until getSocket() has resolved once. */
export function currentSocket(): Socket | null {
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
  socketUserId = null;
  connecting = null;
}
