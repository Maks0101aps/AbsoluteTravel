import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EconomyService } from './economy.service';
import type { EarnDto, PurchaseDto, OpenCaseDto } from './economy.service';

@Controller('api/economy')
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('wallet')
  wallet(@Query('userId') userId: string) {
    return this.economyService.wallet(Number(userId));
  }

  @Post('earn')
  earn(@Body() dto: EarnDto) {
    return this.economyService.earn(dto);
  }

  @Post('purchase')
  purchase(@Body() dto: PurchaseDto) {
    return this.economyService.purchase(dto);
  }

  @Get('cases')
  casesState(@Query('userId') userId: string) {
    return this.economyService.casesState(Number(userId));
  }

  @Post('case/open')
  openCase(@Body() dto: OpenCaseDto) {
    return this.economyService.openCase(dto);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.economyService.leaderboard();
  }
}
