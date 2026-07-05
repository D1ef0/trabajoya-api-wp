import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ElevenLabsApiError,
  ElevenLabsNotConfiguredError,
  SynthesizeOptions,
  SynthesizeResult,
} from './elevenlabs.types';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

@Injectable()
export class ElevenLabsService implements OnModuleInit {
  private readonly logger = new Logger(ElevenLabsService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.isConfigured()) {
      this.logger.log('ElevenLabs TTS client configured');
      return;
    }

    this.logger.warn(
      'ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID not set — TTS disabled',
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('elevenlabs.apiKey') &&
        this.config.get<string>('elevenlabs.voiceId'),
    );
  }

  async synthesize(options: SynthesizeOptions): Promise<SynthesizeResult> {
    const apiKey = this.config.get<string>('elevenlabs.apiKey');
    const defaultVoiceId = this.config.get<string>('elevenlabs.voiceId');
    const modelId = this.config.get<string>('elevenlabs.modelId');

    if (!apiKey || !defaultVoiceId) {
      throw new ElevenLabsNotConfiguredError();
    }

    const voiceId = options.voiceId ?? defaultVoiceId;
    const url = `${ELEVENLABS_TTS_URL}/${encodeURIComponent(voiceId)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: options.text,
          model_id: modelId,
        }),
      });
    } catch (error) {
      this.logger.error(`ElevenLabs request failed: ${String(error)}`);
      throw new ElevenLabsApiError('Network error contacting ElevenLabs', 0);
    }

    if (!response.ok) {
      const rawBody = await response.text();
      let publicError = `HTTP ${response.status}`;

      try {
        const parsed = JSON.parse(rawBody) as { detail?: { message?: string } };
        publicError = parsed.detail?.message ?? publicError;
      } catch {
        if (rawBody) {
          publicError = rawBody.slice(0, 200);
        }
      }

      this.logger.error(
        `ElevenLabs TTS failed (${response.status}): ${publicError}`,
      );
      throw new ElevenLabsApiError(
        `ElevenLabs TTS failed: ${publicError}`,
        response.status,
        publicError,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const characterCost = response.headers.get('character-cost') ?? undefined;
    const requestId = response.headers.get('request-id') ?? undefined;

    if (characterCost) {
      this.logger.debug(
        `ElevenLabs TTS generated (${characterCost} chars, requestId=${requestId ?? 'n/a'})`,
      );
    }

    return {
      audio: Buffer.from(arrayBuffer),
      characterCost,
      requestId,
    };
  }
}
