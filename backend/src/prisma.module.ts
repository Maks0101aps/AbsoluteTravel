import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Single shared PrismaClient instance for the whole app.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
