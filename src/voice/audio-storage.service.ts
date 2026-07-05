import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export class AudioStorageNotConfiguredError extends Error {
  constructor() {
    super('PUBLIC_BASE_URL is not configured');
    this.name = 'AudioStorageNotConfiguredError';
  }
}

@Injectable()
export class AudioStorageService implements OnModuleInit {
  private readonly logger = new Logger(AudioStorageService.name);
  readonly storageDir = join(process.cwd(), 'storage', 'audio');

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await mkdir(this.storageDir, { recursive: true });

    const publicBaseUrl = this.config.get<string>('publicBaseUrl');
    if (publicBaseUrl) {
      this.logger.log(`Audio storage ready (${this.storageDir})`);
      return;
    }

    this.logger.warn(
      'PUBLIC_BASE_URL not set — audio URLs cannot be built for WhatsApp delivery',
    );
  }

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('publicBaseUrl'));
  }

  async saveMp3(audio: Buffer): Promise<{ filename: string; publicUrl: string }> {
    const publicBaseUrl = this.config.get<string>('publicBaseUrl');
    if (!publicBaseUrl) {
      throw new AudioStorageNotConfiguredError();
    }

    const filename = `${randomUUID()}.mp3`;
    const filePath = join(this.storageDir, filename);
    await writeFile(filePath, audio);

    const base = publicBaseUrl.replace(/\/$/, '');
    return {
      filename,
      publicUrl: `${base}/media/audio/${filename}`,
    };
  }
}
