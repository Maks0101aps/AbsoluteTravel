// Singleton socket.io connection, authenticated with the app's userId
// convention (see backend RealtimeGateway). Reused by chat, friends
// presence and live GPS.
import { io, Socket } from 'socket.io-client';
import { resolveApiBase } from './api';

let socket: Socket | null = null;
let socketUserId: number | null = null;
let connecting: Promise<Socket> | null = null;

export async function getSocket(userId: number): Promise<Socket> {
  // Live socket already open for this user.
  if (socket && socketUserId === userId) return socket;
  // A connect for this same user is already in flight — share it.
  if (connecting && socketUserId === userId) return connecting;

  // Anything else belongs to a different user. Note `socket` is still null while
  // a connect is in flight, so the old code fell through to `return connecting`
  // here and handed the new user the *previous* user's socket — authenticated as
  // them, and receiving their friends' live locations.
  if (socket) socket.disconnect();
  socket = null;
  socketUserId = userId;

  const pending = resolveApiBase().then((base) => {
    const s = io(base, {
      auth: { userId },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
    });
    // Another getSocket() superseded us while the API base was resolving. This
    // socket must not become the shared one, or it would clobber the newer
    // user's connection.
    if (socketUserId !== userId) {
      s.disconnect();
      return s;
    }
    socket = s;
    return s;
  });
  connecting = pending;
  return pending;
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
