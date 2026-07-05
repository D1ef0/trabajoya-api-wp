import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../voice/guards/api-key.guard';
import { SendTextDto } from './dto/send-text.dto';
import { MessageService } from './message.service';

@Controller('api/message')
@UseGuards(ApiKeyGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('send')
  send(@Body() dto: SendTextDto) {
    return this.messageService.sendTextMessage(dto);
  }
}
