import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  login(@Body() body: { login?: string; password?: string }) {
    return this.adminService.login(body?.login, body?.password);
  }

  @Post('logout')
  logout(@Headers('x-admin-token') token?: string) {
    return this.adminService.logout(token);
  }

  @Get('me')
  me(@Headers('x-admin-token') token?: string) {
    return this.adminService.me(token);
  }

  @Get('admins')
  listAdmins(@Headers('x-admin-token') token?: string) {
    return this.adminService.listAdmins(token);
  }

  @Post('admins')
  createAdmin(
    @Body() body: { login?: string; password?: string; name?: string },
    @Headers('x-admin-token') token?: string,
  ) {
    return this.adminService.createAdmin(token, body);
  }

  @Delete('admins/:id')
  deleteAdmin(@Param('id', ParseIntPipe) id: number, @Headers('x-admin-token') token?: string) {
    return this.adminService.deleteAdmin(token, id);
  }
}
