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
import { PlacesController } from './places/places.controller';
import { PlacesService } from './places/places.service';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    AuthController,
    EconomyController,
    AiController,
    PlacesController,
    AdminController,
  ],
  providers: [
    AppService,
    AuthService,
    EconomyService,
    AiService,
    PlacesService,
    AdminService,
    PrismaService,
  ],
})
export class AppModule {}
