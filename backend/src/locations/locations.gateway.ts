import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { LocationsService } from './locations.service';

interface LocationUpdatePayload {
  lat?: number;
  lng?: number;
}

const BROADCAST_INTERVAL_MS = 10_000;

// Live-GPS events. Shares the socket.io server with the other gateways.
@WebSocketGateway({ cors: { origin: true } })
export class LocationsGateway implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly locationsService: LocationsService) {}

  private timer: NodeJS.Timeout | null = null;

  onModuleInit() {
    // Broadcast friend locations to all connected users every 10 seconds.
    this.timer = setInterval(() => {
      void this.locationsService.broadcastToOnlineUsers();
    }, BROADCAST_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  @SubscribeMessage('location:update')
  onLocationUpdate(@ConnectedSocket() client: Socket, @MessageBody() payload: LocationUpdatePayload) {
    const userId = client.data.userId as number | undefined;
    if (!userId) return { ok: false, error: 'Не авторизовано' };
    try {
      const loc = this.locationsService.update(userId, payload?.lat, payload?.lng);
      return { ok: true, updatedAt: loc.updatedAt };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Некоректні координати' };
    }
  }
}
