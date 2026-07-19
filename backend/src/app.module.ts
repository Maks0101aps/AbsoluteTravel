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
import { MailService } from './mail/mail.service';
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
import { ExplorationController } from './exploration/exploration.controller';
import { ExplorationService } from './exploration/exploration.service';
import { WallModule } from './wall/wall.module';
import { UsersModule } from './users/users.module';
import { FriendLabelsController } from './friend-labels/friend-labels.controller';
import { FriendLabelsService } from './friend-labels/friend-labels.service';
import { AchievementsController } from './achievements/achievements.controller';
import { AchievementsService } from './achievements/achievements.service';


@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    FriendsModule,
    LeaderboardModule,
    ChatModule,
    LocationsModule,
    WallModule,
    UsersModule,
  ],
  controllers: [
    AppController,
    AuthController,
    EconomyController,
    AiController,
    PlacesController,
    AdminController,
    CheckmarksController,
    ExplorationController,
    FriendLabelsController,
    AchievementsController,
  ],
  providers: [
    AppService,
    AuthService,
    MailService,
    EconomyService,
    AiService,
    PlacesService,
    AdminService,
    CheckmarksService,
    ExplorationService,
    FriendLabelsService,
    AchievementsService,
  ],
})
export class AppModule {}
