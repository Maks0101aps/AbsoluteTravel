import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module';
import { WallController } from './wall.controller';
import { WallService } from './wall.service';

@Module({
  // Wall visibility is a friends-list check.
  imports: [FriendsModule],
  controllers: [WallController],
  providers: [WallService],
})
export class WallModule {}
