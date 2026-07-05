import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SendAudioDto } from './dto/send-audio.dto';
import { ApiKeyGuard } from './guards/api-key.guard';
import { VoiceService } from './voice.service';

@Controller('api/voice')
@UseGuards(ApiKeyGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('send')
  send(@Body() dto: SendAudioDto) {
    return this.voiceService.sendAudioMessage(dto);
  }
}
