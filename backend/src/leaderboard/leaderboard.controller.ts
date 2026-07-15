import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('api/leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  // /api/leaderboard?type=global&limit=100
  // /api/leaderboard?type=regional&region=Львівська область
  @Get()
  top(
    @Query('type') type?: string,
    @Query('region') region?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboardService.top(type, region, limit);
  }

  // /api/leaderboard/me?userId=1 — rank globally and in the user's region.
  @Get('me')
  me(@Query('userId') userId?: string) {
    return this.leaderboardService.me(userId);
  }
}
