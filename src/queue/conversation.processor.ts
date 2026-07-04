import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../session/session.service';
import { ZavuService } from '../zavu/zavu.service';
import {
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
  ) {
    super();
  }

  async process(job: Job<ConversationJobPayload>) {
    const event = job.data.event as unknown as ZavuWebhookEvent;
    const data = event.data as ZavuInboundMessageData;
    const waNumber = job.data.waNumber;

    const session = await this.sessionService.getOrCreate(waNumber);

    await this.prisma.messageLog.create({
      data: {
        sessionId: session.id,
        direction: 'inbound',
        type: this.resolveInboundType(data),
        payload: event as unknown as Prisma.InputJsonValue,
        waMessageId: data.id,
      },
    });

    const replyText = this.buildEchoReply(data);
    const sendResult = await this.zavuService.sendText(
      waNumber,
      replyText,
      `echo-${data.id}`,
    );

    await this.prisma.messageLog.create({
      data: {
        sessionId: session.id,
        direction: 'outbound',
        type: 'text',
        payload: {
          text: replyText,
          zavuResponse: sendResult,
        } as Prisma.InputJsonValue,
        waMessageId: this.extractOutboundMessageId(sendResult),
      },
    });

    await this.sessionService.touch(session.id);

    this.logger.log(`Processed inbound message ${data.id} from ${waNumber}`);
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

  private buildEchoReply(data: ZavuInboundMessageData): string {
    if (data.buttonReply) {
      return `Recibí tu selección: ${data.buttonReply.title} (${data.buttonReply.id})`;
    }

    if (data.listReply) {
      return `Recibí tu selección: ${data.listReply.title} (${data.listReply.id})`;
    }

    const text = data.text?.trim();
    if (text) {
      return `Recibí: ${text}`;
    }

    return 'Recibí tu mensaje.';
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
