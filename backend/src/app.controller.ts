import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('data')
  getLandingData() {
    return this.appService.getLandingData();
  }

  @Get('users')
  getUsers() {
    return this.appService.getUsers();
  }

  @Get('destinations')
  getDestinations() {
    return this.appService.getDestinations();
  }

  @Get('achievements')
  getAchievements() {
    return this.appService.getAchievements();
  }
}
