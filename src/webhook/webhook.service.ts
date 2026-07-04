import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { verifyZavuSignatureDetailed } from '../zavu/zavu-signature.util';
import {
  resolveInboundMessageId,
  ZavuWebhookEvent,
} from '../zavu/zavu.types';
import {
  CONVERSATION_QUEUE,
  ConversationJobPayload,
} from '../queue/queue.constants';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue(CONVERSATION_QUEUE)
    private readonly conversationQueue: Queue<ConversationJobPayload>,
  ) {}

  async handleInbound(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<void> {
    this.verifySignature(rawBody, signatureHeader);

    const event = JSON.parse(rawBody.toString('utf8')) as ZavuWebhookEvent;

    if (event.type !== 'message.inbound') {
      this.logger.debug(`Ignoring webhook event type: ${event.type}`);
      return;
    }

    const waMessageId = event.data
      ? resolveInboundMessageId(event.data)
      : undefined;
    const waNumber = event.data?.from;

    if (!waMessageId || !waNumber) {
      this.logger.warn('Inbound webhook missing messageId or from field');
      return;
    }

    const isNew = await this.claimWebhookEvent(waMessageId);
    if (!isNew) {
      this.logger.debug(`Duplicate webhook ignored: ${waMessageId}`);
      return;
    }

    await this.conversationQueue.add(
      'process-inbound',
      {
        waMessageId,
        waNumber,
        event: event as unknown as Record<string, unknown>,
      },
      {
        jobId: waMessageId,
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  private verifySignature(rawBody: Buffer, signatureHeader?: string) {
    const skipVerification = this.config.get<boolean>(
      'zavu.skipSignatureVerification',
    );

    if (skipVerification) {
      return;
    }

    const secret = this.config.get<string>('zavu.webhookSecret');
    if (!secret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const result = verifyZavuSignatureDetailed(
      rawBody.toString('utf8'),
      signatureHeader,
      secret,
    );

    if (!result.valid) {
      this.logger.warn(`Webhook signature rejected: ${result.reason}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private async claimWebhookEvent(waMessageId: string): Promise<boolean> {
    try {
      await this.prisma.webhookEvent.create({
        data: { waMessageId },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }
}
