import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Zavudev from '@zavudev/sdk';
import { SendInteractiveParams } from './zavu.types';

@Injectable()
export class ZavuService {
  private readonly logger = new Logger(ZavuService.name);
  private readonly client: Zavudev | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('zavu.apiKey');

    if (!apiKey) {
      this.logger.warn('ZAVUDEV_API_KEY not set — outbound messages disabled');
      this.client = null;
      return;
    }

    this.client = new Zavudev({ apiKey });
  }

  async sendText(to: string, text: string, idempotencyKey?: string) {
    if (!this.client) {
      this.logger.warn(`Skipping sendText to ${to}: client not configured`);
      return null;
    }

    return this.client.messages.send({
      to,
      channel: 'whatsapp',
      text,
      idempotencyKey,
    });
  }

  async sendInteractive(params: SendInteractiveParams, idempotencyKey?: string) {
    if (!this.client) {
      this.logger.warn(
        `Skipping sendInteractive to ${params.to}: client not configured`,
      );
      return null;
    }

    if (params.messageType === 'buttons') {
      return this.client.messages.send({
        to: params.to,
        channel: 'whatsapp',
        messageType: 'buttons',
        text: params.text,
        content: {
          buttons: params.buttons ?? [],
        },
        idempotencyKey,
      });
    }

    return this.client.messages.send({
      to: params.to,
      channel: 'whatsapp',
      messageType: 'list',
      text: params.text,
      content: {
        listButton: params.listButton ?? 'Ver opciones',
        sections: params.sections ?? [],
      },
      idempotencyKey,
    });
  }
}
