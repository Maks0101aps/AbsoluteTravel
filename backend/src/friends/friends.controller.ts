import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { FriendsService } from './friends.service';
import type { SendFriendRequestDto } from './friends.service';

// Identification follows the app-wide convention: the client passes its
// userId explicitly (query for GET/DELETE, body for POST).
@Controller('api/friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  sendRequest(@Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendRequest(dto);
  }

  @Post('accept/:id')
  accept(@Param('id', ParseIntPipe) id: number, @Body('userId') userId: unknown) {
    return this.friendsService.accept(id, userId);
  }

  @Get('requests')
  requests(@Query('userId') userId: string) {
    return this.friendsService.incomingRequests(userId);
  }

  @Get('search')
  search(@Query('userId') userId: string, @Query('q') q: string) {
    return this.friendsService.search(userId, q);
  }

  @Get()
  list(@Query('userId') userId: string) {
    return this.friendsService.list(userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Query('userId') userId: string) {
    return this.friendsService.remove(id, userId);
  }
}
