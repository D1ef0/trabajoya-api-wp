import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, DelayedError } from 'bullmq';
import { Prisma } from '@prisma/client';
import { ConversationService } from '../conversation/conversation.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisLockService } from '../redis/redis-lock.service';
import { SessionService } from '../session/session.service';
import { ZavuService } from '../zavu/zavu.service';
import {
  resolveInboundMessageId,
  ZavuInboundMessageData,
  ZavuWebhookEvent,
} from '../zavu/zavu.types';
import { CONVERSATION_QUEUE, ConversationJobPayload } from './queue.constants';

const SESSION_LOCK_TTL_SECONDS = 120;
const SESSION_LOCK_RETRY_MS = 750;

@Processor(CONVERSATION_QUEUE, { concurrency: 1 })
export class ConversationProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly zavuService: ZavuService,
    private readonly conversationService: ConversationService,
    private readonly redisLock: RedisLockService,
  ) {
    super();
  }

  async process(job: Job<ConversationJobPayload>) {
    const event = job.data.event as unknown as ZavuWebhookEvent;
    const data = event.data as ZavuInboundMessageData;
    const waNumber = job.data.waNumber;
    const inboundMessageId = resolveInboundMessageId(data);

    if (!inboundMessageId) {
      this.logger.warn(`Job ${job.id} missing inbound messageId`);
      return;
    }

    const lockKey = this.redisLock.conversationLockKey(waNumber);
    const lockToken = String(job.id ?? inboundMessageId);
    const lockAcquired = await this.redisLock.acquire(
      lockKey,
      lockToken,
      SESSION_LOCK_TTL_SECONDS,
    );

    if (!lockAcquired) {
      this.logger.debug(
        `Session ${waNumber} busy, delaying job ${job.id} (${inboundMessageId})`,
      );
      await job.moveToDelayed(Date.now() + SESSION_LOCK_RETRY_MS);
      throw new DelayedError('Session lock busy');
    }

    try {
      await this.processLocked(job, event, data, waNumber, inboundMessageId);
    } finally {
      await this.redisLock.release(lockKey, lockToken);
    }
  }

  private async processLocked(
    job: Job<ConversationJobPayload>,
    event: ZavuWebhookEvent,
    data: ZavuInboundMessageData,
    waNumber: string,
    inboundMessageId: string,
  ) {
    const session = await this.sessionService.getOrCreate(waNumber);

    if (await this.isFullyProcessed(session.id, inboundMessageId)) {
      this.logger.debug(
        `Inbound message ${inboundMessageId} already answered, skipping job ${job.id}`,
      );
      return;
    }

    const claimed = await this.claimInboundMessage(
      session.id,
      inboundMessageId,
      event,
      data,
    );

    if (!claimed) {
      this.logger.debug(
        `Inbound message ${inboundMessageId} already logged, retrying delivery for job ${job.id}`,
      );
    }

    const freshSession =
      (await this.sessionService.findByWaNumber(waNumber)) ?? session;

    const result = await this.conversationService.handle(
      freshSession,
      data,
      waNumber,
    );

    const sendResult = await this.zavuService.sendText(
      waNumber,
      result.replyText,
      `reply-${inboundMessageId}`,
    );

    await this.prisma.messageLog.create({
      data: {
        sessionId: session.id,
        direction: 'outbound',
        type: 'text',
        payload: {
          text: result.replyText,
          inReplyTo: inboundMessageId,
          zavuResponse: sendResult,
        } as Prisma.InputJsonValue,
        waMessageId: this.extractOutboundMessageId(sendResult),
      },
    });

    await this.sessionService.advance(session.id, {
      ...(result.nextStep !== undefined
        ? { currentStep: result.nextStep }
        : {}),
      ...(result.contextPatch !== undefined
        ? { context: result.contextPatch as Record<string, unknown> }
        : {}),
    });

    this.logger.log(
      `Processed inbound message ${inboundMessageId} from ${waNumber} (step: ${result.nextStep ?? freshSession.currentStep})`,
    );
  }

  private async isFullyProcessed(
    sessionId: string,
    inboundMessageId: string,
  ): Promise<boolean> {
    const outbound = await this.prisma.messageLog.findFirst({
      where: {
        sessionId,
        direction: 'outbound',
        payload: {
          path: ['inReplyTo'],
          equals: inboundMessageId,
        },
      },
      select: { id: true },
    });

    return Boolean(outbound);
  }

  private async claimInboundMessage(
    sessionId: string,
    inboundMessageId: string,
    event: ZavuWebhookEvent,
    data: ZavuInboundMessageData,
  ): Promise<boolean> {
    try {
      await this.prisma.messageLog.create({
        data: {
          sessionId,
          direction: 'inbound',
          type: this.resolveInboundType(data),
          payload: event as unknown as Prisma.InputJsonValue,
          waMessageId: inboundMessageId,
        },
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

  private resolveInboundType(data: ZavuInboundMessageData): string {
    if (data.buttonReply) {
      return 'button_reply';
    }
    if (data.listReply) {
      return 'list_reply';
    }
    return data.messageType ?? 'text';
  }

  private extractOutboundMessageId(sendResult: unknown): string | undefined {
    if (!sendResult || typeof sendResult !== 'object') {
      return undefined;
    }

    const record = sendResult as Record<string, unknown>;
    const message = record.message;

    if (message && typeof message === 'object') {
      const id = (message as Record<string, unknown>).id;
      return typeof id === 'string' ? id : undefined;
    }

    const id = record.id;
    return typeof id === 'string' ? id : undefined;
  }
}
