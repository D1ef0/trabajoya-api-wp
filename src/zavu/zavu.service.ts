import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Zavudev from '@zavudev/sdk';
import {
  buildInboundMediaDebug,
  normalizeZavuInboundData,
} from './zavu-inbound.util';
import {
  resolveInboundMessageId,
  SendInteractiveParams,
  ZavuInboundMessageData,
} from './zavu.types';

const MEDIA_RESOLVE_ATTEMPTS = 3;
const MEDIA_RESOLVE_DELAY_MS = 1000;

export interface ResolvedInboundMedia {
  url?: string;
  filename?: string;
  mimeType?: string;
  debug: Record<string, unknown>;
}

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

  async resolveInboundMedia(
    data: ZavuInboundMessageData,
  ): Promise<ResolvedInboundMedia> {
    const normalized = normalizeZavuInboundData(data);
    const debug = buildInboundMediaDebug(data);

    if (normalized.mediaUrl) {
      return {
        url: normalized.mediaUrl,
        filename: normalized.filename,
        mimeType: normalized.mimeType,
        debug: { ...debug, mediaSource: 'webhook_media_url' },
      };
    }

    const messageId = resolveInboundMessageId(normalized);
    if (!messageId || !this.client) {
      return {
        debug: {
          ...debug,
          mediaSource: 'none',
          reason: messageId ? 'zavu_client_not_configured' : 'missing_message_id',
        },
      };
    }

    for (let attempt = 1; attempt <= MEDIA_RESOLVE_ATTEMPTS; attempt++) {
      try {
        const response = await this.client.messages.retrieve(messageId);
        const message = response.message;
        const url = message.content?.mediaUrl;
        if (url) {
          return {
            url,
            filename: message.content?.filename ?? normalized.filename,
            mimeType: message.content?.mimeType ?? normalized.mimeType,
            debug: {
              ...debug,
              mediaSource: 'zavu_retrieve',
              attempt,
            },
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to retrieve message ${messageId} for media (attempt ${attempt}): ${String(error)}`,
        );
      }

      if (attempt < MEDIA_RESOLVE_ATTEMPTS) {
        await sleep(MEDIA_RESOLVE_DELAY_MS);
      }
    }

    return {
      debug: {
        ...debug,
        mediaSource: 'none',
        reason: 'media_url_not_ready',
        mediaId: normalized.mediaId ?? null,
        messageId,
        attempts: MEDIA_RESOLVE_ATTEMPTS,
      },
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
