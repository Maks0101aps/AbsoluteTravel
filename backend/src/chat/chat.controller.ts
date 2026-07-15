import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Declared before ':friendId' so "unread" isn't captured as a friend id.
  @Get('unread')
  unread(@Query('userId') userId: string) {
    return this.chatService.unreadCounts(userId);
  }

  // GET /api/chat/:friendId?userId=1&limit=50&before=<messageId>
  @Get(':friendId')
  history(
    @Param('friendId') friendId: string,
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.history(userId, friendId, limit, before);
  }

  // REST fallback when the WebSocket is disconnected.
  @Post(':friendId')
  send(
    @Param('friendId') friendId: string,
    @Body('userId') userId: unknown,
    @Body('text') text: unknown,
  ) {
    return this.chatService.send(userId, friendId, text);
  }

  @Post(':friendId/read')
  markRead(@Param('friendId') friendId: string, @Body('userId') userId: unknown) {
    return this.chatService.markRead(userId, friendId);
  }
}
