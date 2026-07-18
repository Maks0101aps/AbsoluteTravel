import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
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
  // `requesterId` is optional for backward compatibility (self-view), but
  // required in practice to view anyone else's — see ExplorationService.cells.
  @Get('cells/:userId')
  async cells(@Param('userId', ParseIntPipe) userId: number, @Query('requesterId') requesterId?: string) {
    const cells = await this.exploration.cells(userId, requesterId ? Number(requesterId) : undefined);
    return { cells };
  }

  // Aggregate exploration progress (cells + regions) for the profile card.
  @Get('stats/:userId')
  stats(@Param('userId', ParseIntPipe) userId: number, @Query('requesterId') requesterId?: string) {
    return this.exploration.stats(userId, requesterId ? Number(requesterId) : undefined);
  }
}
