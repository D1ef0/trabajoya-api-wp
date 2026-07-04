import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { ConversationService } from '../conversation/conversation.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../session/session.service';
import { ZavuService } from '../zavu/zavu.service';
import {
  resolveInboundMessageId,
  ZavuInboundMessageData,
  ZavuWebhookEvent,
} from '../zavu/zavu.types';
import { CONVERSATION_QUEUE, ConversationJobPayload } from './queue.constants';

@Processor(CONVERSATION_QUEUE)
export class ConversationProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly zavuService: ZavuService,
    private readonly conversationService: ConversationService,
  ) {
    super();
  }

  async process(job: Job<ConversationJobPayload>) {
    const event = job.data.event as unknown as ZavuWebhookEvent;
    const data = event.data as ZavuInboundMessageData;
    const waNumber = job.data.waNumber;

    const session = await this.sessionService.getOrCreate(waNumber);
    const inboundMessageId = resolveInboundMessageId(data);

    if (!inboundMessageId) {
      this.logger.warn(`Job ${job.id} missing inbound messageId`);
      return;
    }

    await this.prisma.messageLog.create({
      data: {
        sessionId: session.id,
        direction: 'inbound',
        type: this.resolveInboundType(data),
        payload: event as unknown as Prisma.InputJsonValue,
        waMessageId: inboundMessageId,
      },
    });

    const result = await this.conversationService.handle(
      session,
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
      `Processed inbound message ${inboundMessageId} from ${waNumber} (step: ${result.nextStep ?? session.currentStep})`,
    );
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
