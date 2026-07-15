import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CheckmarksService } from './checkmarks.service';
import type { VerifyCheckmarkDto } from './checkmarks.service';

@Controller('api/checkmarks')
export class CheckmarksController {
  constructor(private readonly checkmarksService: CheckmarksService) {}

  // Verify a claimed visit: distance + AI photo check, then award XP/coins.
  @Post('verify')
  verify(@Body() dto: VerifyCheckmarkDto) {
    return this.checkmarksService.verify(dto);
  }

  // Places the user has already verified (for the profile / "opened places").
  @Get('user/:userId')
  listForUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.checkmarksService.listForUser(userId);
  }
}
