import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ExplorationService } from './exploration.service';
import type { VisitCellDto } from './exploration.service';

@Controller('api/exploration')
export class ExplorationController {
  constructor(private readonly exploration: ExplorationService) {}

  // Unlock the H3 cell the user currently stands in; awards XP if it's new.
  @Post('visit')
  visit(@Body() dto: VisitCellDto) {
    return this.exploration.visit(dto);
  }

  // Every cell id the user has already unlocked (to paint the map on load).
  @Get('cells/:userId')
  async cells(@Param('userId', ParseIntPipe) userId: number) {
    const cells = await this.exploration.cells(userId);
    return { cells };
  }

  // Aggregate exploration progress (cells + regions) for the profile card.
  @Get('stats/:userId')
  stats(@Param('userId', ParseIntPipe) userId: number) {
    return this.exploration.stats(userId);
  }
}
