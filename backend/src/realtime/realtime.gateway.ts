import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from './presence.service';

// Owns the socket lifecycle: authenticates the connection (userId in the
// handshake, consistent with the app's userId-based REST auth), registers
// presence and notifies the user's friends when they go on/offline.
// Feature gateways (chat, locations) share this socket.io server and only
// subscribe to their own message types.
@WebSocketGateway({ cors: { origin: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly presence: PresenceService) {}

  afterInit(server: Server) {
    this.presence.setServer(server);
  }

  private extractUserId(client: Socket): number | null {
    const raw =
      (client.handshake.auth as Record<string, unknown> | undefined)?.userId ??
      client.handshake.query.userId;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    const wasOnline = this.presence.isOnline(userId);
    client.data.userId = userId;
    this.presence.register(userId, client.id);
    if (!wasOnline) {
      this.server.emit('presence:online', { userId });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.presence.unregister(client.id);
    if (userId !== null && !this.presence.isOnline(userId)) {
      this.server.emit('presence:offline', { userId, lastSeenAt: new Date().toISOString() });
    }
  }
}
