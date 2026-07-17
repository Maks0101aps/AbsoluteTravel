import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { WallService } from './wall.service';

// Identification follows the app-wide convention (see friends.controller.ts):
// the client passes its own userId explicitly, here as `requesterId`.
// Readable by the owner and their friends (see WallService).
@Controller('api/wall')
export class WallController {
  constructor(private readonly wallService: WallService) {}

  // GET /api/wall/:userId?requesterId=&cursor=
  @Get(':userId')
  list(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('requesterId') requesterId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.wallService.listForUser(userId, Number(requesterId), cursor ? Number(cursor) : undefined);
  }
}
