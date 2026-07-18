import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AchievementsService, type ClaimDto } from './achievements.service';

@Controller('api/achievements')
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  // Progress + claim state for a user's achievements (weekly + regular).
  @Get('list')
  list(@Query('userId') userId: string) {
    return this.achievements.list(Number(userId));
  }

  // Claim a completed achievement's XP + coin reward.
  @Post('claim')
  claim(@Body() dto: ClaimDto) {
    return this.achievements.claim(dto);
  }
}
