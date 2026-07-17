import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { FriendLabelsService, CreateLabelDto } from './friend-labels.service';

@Controller('api/friend-labels')
export class FriendLabelsController {
  constructor(private readonly friendLabelsService: FriendLabelsService) {}

  @Post()
  create(@Body() dto: CreateLabelDto) {
    return this.friendLabelsService.create(dto);
  }

  @Get()
  list(@Query('userId', ParseIntPipe) userId: number) {
    return this.friendLabelsService.list(userId);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.friendLabelsService.delete(id, userId);
  }

  @Post(':id/react')
  react(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) userId: number,
    @Body('type') type: 'LIKE' | 'DISLIKE' | null,
  ) {
    return this.friendLabelsService.react(id, userId, type);
  }

  @Post(':id/report')
  report(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) userId: number,
    @Body('reason') reason: string,
  ) {
    return this.friendLabelsService.report(id, userId, reason);
  }
}
