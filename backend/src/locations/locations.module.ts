import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module';
import { LocationsController } from './locations.controller';
import { LocationsGateway } from './locations.gateway';
import { LocationsService } from './locations.service';

@Module({
  imports: [FriendsModule],
  controllers: [LocationsController],
  providers: [LocationsService, LocationsGateway],
})
export class LocationsModule {}
