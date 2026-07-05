import { Module } from '@nestjs/common';
import { ElevenLabsModule } from '../elevenlabs/elevenlabs.module';
import { ZavuModule } from '../zavu/zavu.module';
import { AudioStorageService } from './audio-storage.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [ElevenLabsModule, ZavuModule],
  controllers: [VoiceController],
  providers: [VoiceService, AudioStorageService, ApiKeyGuard],
})
export class VoiceModule {}
