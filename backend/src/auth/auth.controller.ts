import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import type { GoogleAuthDto, LoginDto, RegisterDto } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  loginWithGoogle(@Body() dto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(dto);
  }

  // Dev-only shortcut around Mailtrap sandbox not delivering real mail — see
  // AuthService.devVerify. Refuses to run once NODE_ENV=production.
  @Post('dev-verify')
  devVerify(@Body('email') email: string) {
    return this.authService.devVerify(email);
  }

  // Landing target of the activation link emailed on registration. Renders a
  // small standalone HTML page (there's no frontend router to hand this off
  // to) so the confirmation works no matter which port the frontend/backend
  // ended up bound to.
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.authService.verifyEmail(token);
      res.status(200).send(renderVerifyPage(true, 'Вашу пошту підтверджено! Тепер ви можете увійти в застосунок.'));
    } catch (err: any) {
      res.status(400).send(renderVerifyPage(false, err?.message || 'Не вдалося підтвердити пошту.'));
    }
  }
}

function renderVerifyPage(success: boolean, message: string): string {
  const color = success ? '#3FA66B' : '#E07A7A';
  const icon = success
    ? '<path d="M4 12l5 5 11-11" stroke="#3FA66B" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    : '<path d="M6 6l12 12M18 6L6 18" stroke="#E07A7A" stroke-width="3" fill="none" stroke-linecap="round"/>';
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Absolute Travel — підтвердження пошти</title>
</head>
<body style="margin:0; font-family: Arial, sans-serif; background:#071F16; color:#F4F1E8; min-height:100vh; display:flex; align-items:center; justify-content:center;">
  <div style="max-width:420px; text-align:center; padding:40px 32px; background:rgba(8,26,18,0.92); border:1px solid rgba(255,255,255,0.1); border-radius:20px;">
    <svg width="56" height="56" viewBox="0 0 24 24" style="margin-bottom:18px;">${icon}</svg>
    <h1 style="font-size:20px; margin:0 0 10px; color:${color};">${success ? 'Готово!' : 'Помилка'}</h1>
    <p style="font-size:14px; line-height:1.6; color:rgba(244,241,232,0.8); margin:0;">${message}</p>
  </div>
</body>
</html>`;
}
