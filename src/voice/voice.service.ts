import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ElevenLabsService } from '../elevenlabs/elevenlabs.service';
import {
  ElevenLabsApiError,
  ElevenLabsNotConfiguredError,
} from '../elevenlabs/elevenlabs.types';
import { ZavuService } from '../zavu/zavu.service';
import { normalizeOutboundPhone } from '../common/phone.util';
import {
  AudioStorageNotConfiguredError,
  AudioStorageService,
} from './audio-storage.service';
import { SendAudioDto } from './dto/send-audio.dto';
import { VoiceCopy } from './voice.copy';

const MAX_TEXT_LENGTH = 5000;

export interface SendAudioMessageResult {
  ok: true;
  messageId: string;
  audioUrl: string;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly elevenLabs: ElevenLabsService,
    private readonly audioStorage: AudioStorageService,
    private readonly zavu: ZavuService,
  ) {}

  async sendAudioMessage(dto: SendAudioDto): Promise<SendAudioMessageResult> {
    this.assertDependenciesConfigured();

    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException(
        'Request body must be JSON with text and phone fields',
      );
    }

    const text = typeof dto.text === 'string' ? dto.text.trim() : '';
    if (!text) {
      throw new BadRequestException(
        'text is required (send JSON body, not form-data)',
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new BadRequestException(
        `text must be at most ${MAX_TEXT_LENGTH} characters`,
      );
    }

    const phone = normalizeOutboundPhone(dto.phone);

    let synthesized;
    try {
      synthesized = await this.elevenLabs.synthesize({
        text,
        voiceId: dto.voiceId,
      });
    } catch (error) {
      if (error instanceof ElevenLabsNotConfiguredError) {
        throw new ServiceUnavailableException(error.message);
      }
      if (error instanceof ElevenLabsApiError) {
        throw new BadGatewayException(error.publicError ?? error.message);
      }
      throw error;
    }

    let stored;
    try {
      stored = await this.audioStorage.saveMp3(synthesized.audio);
    } catch (error) {
      if (error instanceof AudioStorageNotConfiguredError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }

    const introKey = dto.idempotencyKey
      ? `${dto.idempotencyKey}-intro`
      : undefined;

    const introResult = await this.zavu.sendText(
      phone,
      VoiceCopy.audioIntro,
      introKey,
    );

    if (!introResult.ok) {
      throw new BadGatewayException(
        introResult.failure.message ??
          'Failed to send WhatsApp intro message before audio',
      );
    }

    const sendResult = await this.zavu.sendAudio(
      phone,
      stored.publicUrl,
      dto.idempotencyKey,
    );

    if (!sendResult.ok) {
      throw new BadGatewayException(
        sendResult.failure.message ?? 'Failed to send WhatsApp audio message',
      );
    }

    const messageId =
      (sendResult.response as { message?: { id?: string } })?.message?.id ??
      'unknown';

    this.logger.log(
      `WhatsApp audio sent to ${phone} (messageId=${messageId}, audioUrl=${stored.publicUrl})`,
    );

    return {
      ok: true,
      messageId,
      audioUrl: stored.publicUrl,
    };
  }

  private assertDependenciesConfigured() {
    if (!this.elevenLabs.isConfigured()) {
      throw new ServiceUnavailableException('ElevenLabs API is not configured');
    }

    if (!this.audioStorage.isConfigured()) {
      throw new ServiceUnavailableException('PUBLIC_BASE_URL is not configured');
    }
  }

}
