import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import type { SubmitPlaceDto, UpdatePlaceDto } from './places.service';

@Controller('api/places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  // Public: approved places for the explore map.
  @Get()
  list() {
    return this.placesService.listApproved();
  }

  // Public: a user submits a place → AI moderation decides the outcome.
  @Post('submit')
  submit(@Body() dto: SubmitPlaceDto) {
    return this.placesService.submit(dto);
  }

  // --- Admin: authenticated via an `x-admin-token` session token ------------

  @Get('admin/list')
  adminList(@Headers('x-admin-token') token?: string, @Query('status') status?: string) {
    return this.placesService.adminList(token, status);
  }

  @Get('admin/counts')
  adminCounts(@Headers('x-admin-token') token?: string) {
    return this.placesService.adminCounts(token);
  }

  @Post('admin/create')
  adminCreate(@Body() dto: SubmitPlaceDto, @Headers('x-admin-token') token?: string) {
    return this.placesService.adminCreate(token, dto);
  }

  @Post('admin/:id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlaceDto,
    @Headers('x-admin-token') token?: string,
  ) {
    return this.placesService.adminUpdate(token, id, dto);
  }

  @Post('admin/:id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Headers('x-admin-token') token?: string) {
    return this.placesService.adminSetStatus(token, id, 'approved');
  }

  @Post('admin/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Headers('x-admin-token') token?: string) {
    return this.placesService.adminSetStatus(token, id, 'rejected');
  }

  @Delete('admin/:id')
  remove(@Param('id', ParseIntPipe) id: number, @Headers('x-admin-token') token?: string) {
    return this.placesService.adminDelete(token, id);
  }
}
