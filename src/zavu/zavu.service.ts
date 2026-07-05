import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Zavudev from '@zavudev/sdk';
import {
  buildInboundMediaDebug,
  normalizeZavuInboundData,
} from './zavu-inbound.util';
import { parseZavuApiError } from './zavu-error.util';
import {
  resolveInboundMessageId,
  SendInteractiveParams,
  ZavuInboundMessageData,
  ZavuSendResult,
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

  async sendText(
    to: string,
    text: string,
    idempotencyKey?: string,
  ): Promise<ZavuSendResult> {
    if (!this.client) {
      this.logger.warn(`Skipping sendText to ${to}: client not configured`);
      return { ok: false, failure: clientNotConfiguredFailure() };
    }

    try {
      const response = await this.client.messages.send({
        to,
        channel: 'whatsapp',
        text,
        idempotencyKey,
      });

      return { ok: true, response };
    } catch (error) {
      const failure = parseZavuApiError(error);
      this.logger.warn(
        `sendText failed for ${to} (${failure.code}, status=${failure.status ?? 'n/a'}): ${failure.message}`,
      );
      return { ok: false, failure };
    }
  }

  async sendInteractive(
    params: SendInteractiveParams,
    idempotencyKey?: string,
  ): Promise<ZavuSendResult> {
    if (!this.client) {
      this.logger.warn(
        `Skipping sendInteractive to ${params.to}: client not configured`,
      );
      return { ok: false, failure: clientNotConfiguredFailure() };
    }

    try {
      const response =
        params.messageType === 'buttons'
          ? await this.client.messages.send({
              to: params.to,
              channel: 'whatsapp',
              messageType: 'buttons',
              text: params.text,
              content: {
                buttons: params.buttons ?? [],
              },
              idempotencyKey,
            })
          : await this.client.messages.send({
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

      return { ok: true, response };
    } catch (error) {
      const failure = parseZavuApiError(error);
      this.logger.warn(
        `sendInteractive failed for ${params.to} (${failure.code}, status=${failure.status ?? 'n/a'}): ${failure.message}`,
      );
      return { ok: false, failure };
    }
  }

  async sendAudio(
    to: string,
    mediaUrl: string,
    idempotencyKey?: string,
  ): Promise<ZavuSendResult> {
    if (!this.client) {
      this.logger.warn(`Skipping sendAudio to ${to}: client not configured`);
      return { ok: false, failure: clientNotConfiguredFailure() };
    }

    try {
      const response = await this.client.messages.send({
        to,
        channel: 'whatsapp',
        messageType: 'audio',
        content: { mediaUrl },
        idempotencyKey,
      });

      return { ok: true, response };
    } catch (error) {
      const failure = parseZavuApiError(error);
      this.logger.warn(
        `sendAudio failed for ${to} (${failure.code}, status=${failure.status ?? 'n/a'}): ${failure.message}`,
      );
      return { ok: false, failure };
    }
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
        const failure = parseZavuApiError(error);
        this.logger.warn(
          `Failed to retrieve message ${messageId} for media (attempt ${attempt}, ${failure.code}): ${failure.message}`,
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

function clientNotConfiguredFailure() {
  return {
    code: 'client_not_configured',
    status: undefined,
    message: 'ZAVUDEV_API_KEY not configured',
    retryable: false,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
