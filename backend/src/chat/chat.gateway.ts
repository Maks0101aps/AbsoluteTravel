import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface ChatSendPayload {
  toUserId?: number;
  text?: string;
}

interface ChatReadPayload {
  fromUserId?: number;
}

// Shares the socket.io server created by RealtimeGateway (same default
// namespace); only subscribes to chat events. The sender is taken from the
// authenticated socket, never from the payload.
@WebSocketGateway({ cors: { origin: true } })
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('chat:send')
  async onSend(@ConnectedSocket() client: Socket, @MessageBody() payload: ChatSendPayload) {
    const userId = client.data.userId as number | undefined;
    if (!userId) return { ok: false, error: 'Не авторизовано' };
    try {
      const message = await this.chatService.send(userId, payload?.toUserId, payload?.text);
      // Ack for the emitting socket (delivery confirmation with the real id).
      return { ok: true, id: message.id, createdAt: message.createdAt.toISOString() };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Не вдалося надіслати повідомлення' };
    }
  }

  @SubscribeMessage('chat:read')
  async onRead(@ConnectedSocket() client: Socket, @MessageBody() payload: ChatReadPayload) {
    const userId = client.data.userId as number | undefined;
    if (!userId) return { ok: false, error: 'Не авторизовано' };
    try {
      return await this.chatService.markRead(userId, payload?.fromUserId);
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Не вдалося позначити як прочитане' };
    }
  }
}
