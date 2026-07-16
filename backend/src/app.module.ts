import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// PrismaService now comes from the global PrismaModule.
import { PrismaModule } from './prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { FriendsModule } from './friends/friends.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ChatModule } from './chat/chat.module';
import { LocationsModule } from './locations/locations.module';
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
import { CheckmarksController } from './checkmarks/checkmarks.controller';
import { CheckmarksService } from './checkmarks/checkmarks.service';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    FriendsModule,
    LeaderboardModule,
    ChatModule,
    LocationsModule,
  ],
  controllers: [
    AppController,
    AuthController,
    EconomyController,
    AiController,
    PlacesController,
    AdminController,
    CheckmarksController,
  ],
  providers: [
    AppService,
    AuthService,
    EconomyService,
    AiService,
    PlacesService,
    AdminService,
    CheckmarksService,
  ],
})
export class AppModule {}
