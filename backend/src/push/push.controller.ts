import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { PushService } from './push.service';

interface SubscribeDto {
  userId: number;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
}

// Identification follows the app-wide convention: the client sends its userId.
@Controller('api/push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** The client needs this to create a PushSubscription in the browser. */
  @Get('vapid-public-key')
  vapidKey() {
    return { key: this.push.getPublicKey(), enabled: this.push.isEnabled() };
  }

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto, @Headers('user-agent') ua?: string) {
    return this.push.saveSubscription(dto.userId, dto.subscription, ua);
  }

  @Post('unsubscribe')
  unsubscribe(@Body('endpoint') endpoint: string) {
    return this.push.removeSubscription(endpoint);
  }

  /** Dev/self test: pushes a sample notification to the caller's devices. */
  @Post('test')
  async test(@Body('userId') userId: number) {
    await this.push.notify(userId, {
      title: 'Absolute Travel',
      body: 'Сповіщення працюють! 🎉',
      url: '/',
      tag: 'test',
    });
    return { ok: true };
  }
}
