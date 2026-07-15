import { Body, Controller, Get, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import type { ChatDto } from './ai.service';

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  status() {
    return this.aiService.status();
  }

  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto);
  }
}
