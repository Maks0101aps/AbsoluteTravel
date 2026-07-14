import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { EconomyController } from './economy/economy.controller';
import { EconomyService } from './economy/economy.service';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';

@Module({
  imports: [],
  controllers: [AppController, AuthController, EconomyController, AiController],
  providers: [AppService, AuthService, EconomyService, AiService, PrismaService],
})
export class AppModule {}
