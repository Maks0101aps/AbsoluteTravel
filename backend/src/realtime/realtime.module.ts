import { Global, Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { RealtimeGateway } from './realtime.gateway';

// Global so every feature module can inject PresenceService without wiring.
@Global()
@Module({
  providers: [PresenceService, RealtimeGateway],
  exports: [PresenceService],
})
export class RealtimeModule {}
