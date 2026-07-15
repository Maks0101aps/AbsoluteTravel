import { Body, Controller, Get, Param, Put, Post, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('api/users')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // PUT /api/users/me/location-visible { userId, visible }
  // Declared before ':id/location' so "me" isn't parsed as a user id.
  @Put('me/location-visible')
  setVisibility(@Body('userId') userId: unknown, @Body('visible') visible: unknown) {
    return this.locationsService.setVisibility(userId, visible);
  }

  // POST /api/users/profile { userId, name, avatar }
  @Post('profile')
  updateProfile(
    @Body('userId') userId: unknown,
    @Body('name') name: unknown,
    @Body('avatar') avatar: unknown,
  ) {
    return this.locationsService.updateProfile(userId, name, avatar);
  }

  // GET /api/users/:id/location?viewerId=1 — friends-only (403 otherwise).
  @Get(':id/location')
  location(@Param('id') id: string, @Query('viewerId') viewerId: string) {
    return this.locationsService.locationFor(viewerId, id);
  }
}

