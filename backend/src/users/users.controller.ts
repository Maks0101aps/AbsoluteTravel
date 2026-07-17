import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';

// Identification follows the app-wide convention (see friends.controller.ts):
// the client passes its own userId explicitly, here as `viewerId` on reads.
// Shares the 'api/users' prefix with LocationsController, which owns the
// location routes; the paths don't overlap.
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/users/profile { userId, name, avatar, profile? }
  // Declared before ':id/profile' so "profile" isn't parsed as a user id.
  @Post('profile')
  updateProfile(
    @Body('userId') userId: unknown,
    @Body('name') name: unknown,
    @Body('avatar') avatar: unknown,
    @Body('profile') profile?: unknown,
  ) {
    return this.usersService.updateProfile(userId, name, avatar, profile);
  }

  // GET /api/users/:id/profile?viewerId= — any signed-in traveler may look.
  @Get(':id/profile')
  profile(@Param('id') id: string, @Query('viewerId') viewerId: string) {
    return this.usersService.publicProfile(id, viewerId);
  }
}
