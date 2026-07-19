import { Global, Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { PushReminderService } from './push-reminder.service';

// Global so ChatService / FriendsService can inject PushService without wiring.
@Global()
@Module({
  controllers: [PushController],
  providers: [PushService, PushReminderService],
  exports: [PushService],
})
export class PushModule {}
