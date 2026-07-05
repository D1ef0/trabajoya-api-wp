import { getQueueToken } from '@nestjs/bullmq';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  CONVERSATION_QUEUE,
  ConversationJobPayload,
} from '../queue/queue.constants';
import { WebhookService } from './webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: { webhookEvent: { create: jest.Mock } };
  let queue: { add: jest.Mock };
  let configGet: jest.Mock;

  beforeEach(async () => {
    prisma = {
      webhookEvent: {
        create: jest.fn(),
      },
    };
    queue = {
      add: jest.fn(),
    };
    configGet = jest.fn((key: string) => {
      if (key === 'zavu.skipSignatureVerification') {
        return true;
      }
      if (key === 'zavu.webhookSecret') {
        return 'whsec_test';
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: PrismaService, useValue: prisma },
        {
          provide: getQueueToken(CONVERSATION_QUEUE),
          useValue: queue as unknown as Queue<ConversationJobPayload>,
        },
      ],
    }).compile();

    service = module.get(WebhookService);
  });

  it('enqueues a new inbound webhook once', async () => {
    prisma.webhookEvent.create.mockResolvedValueOnce({});

    const rawBody = Buffer.from(
      JSON.stringify({
        type: 'message.inbound',
        data: {
          messageId: 'msg_123',
          from: '+50312345678',
          text: 'hola',
        },
      }),
    );

    await service.handleInbound(rawBody, undefined);

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      'process-inbound',
      expect.objectContaining({
        waMessageId: 'msg_123',
        waNumber: '+50312345678',
      }),
      expect.objectContaining({ jobId: 'msg_123' }),
    );
  });

  it('deduplicates inbound webhooks by waMessageId', async () => {
    prisma.webhookEvent.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

    const rawBody = Buffer.from(
      JSON.stringify({
        type: 'message.inbound',
        data: {
          messageId: 'msg_dup',
          from: '+50312345678',
          text: 'hola',
        },
      }),
    );

    await service.handleInbound(rawBody, undefined);
    await service.handleInbound(rawBody, undefined);

    expect(prisma.webhookEvent.create).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('ignores non-inbound webhook events', async () => {
    const rawBody = Buffer.from(
      JSON.stringify({
        type: 'message.delivered',
        data: { messageId: 'msg_999', from: '+50312345678' },
      }),
    );

    await service.handleInbound(rawBody, undefined);

    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects invalid signatures when verification is enabled', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'zavu.skipSignatureVerification') {
        return false;
      }
      if (key === 'zavu.webhookSecret') {
        return 'whsec_test';
      }
      return undefined;
    });

    const rawBody = Buffer.from('{"type":"message.inbound"}');

    await expect(
      service.handleInbound(rawBody, 't=1,v1=invalid'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
