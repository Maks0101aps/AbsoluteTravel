import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { EconomyController } from './economy/economy.controller';
import { EconomyService } from './economy/economy.service';

@Module({
  imports: [],
  controllers: [AppController, AuthController, EconomyController],
  providers: [AppService, AuthService, EconomyService, PrismaService],
})
export class AppModule {}
