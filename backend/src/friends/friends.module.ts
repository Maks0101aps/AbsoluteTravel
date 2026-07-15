import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  controllers: [FriendsController],
  providers: [FriendsService],
  // Chat and Locations reuse the friendship checks.
  exports: [FriendsService],
})
export class FriendsModule {}
