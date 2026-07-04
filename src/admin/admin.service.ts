import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageDirection, Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { extractMessagePreview } from './admin-message.util';

interface PaginationInput {
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      sessionsTotal,
      sessionsActive,
      sessionsHandoff,
      messagesTotal,
      messagesToday,
      webhooksTotal,
      webhooksToday,
      requestCapturesTotal,
      requestCapturesToday,
    ] = await Promise.all([
      this.prisma.conversationSession.count(),
      this.prisma.conversationSession.count({ where: { status: 'active' } }),
      this.prisma.conversationSession.count({ where: { status: 'handoff' } }),
      this.prisma.messageLog.count(),
      this.prisma.messageLog.count({ where: { createdAt: { gte: today } } }),
      this.prisma.webhookEvent.count(),
      this.prisma.webhookEvent.count({ where: { processedAt: { gte: today } } }),
      this.prisma.inboundRequestCapture.count(),
      this.prisma.inboundRequestCapture.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    return {
      sessionsTotal,
      sessionsActive,
      sessionsHandoff,
      messagesTotal,
      messagesToday,
      webhooksTotal,
      webhooksToday,
      requestCapturesTotal,
      requestCapturesToday,
    };
  }

  async listSessions(
    params: PaginationInput & {
      status?: SessionStatus;
      search?: string;
    },
  ) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationSessionWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.search?.trim()) {
      where.waNumber = { contains: params.search.trim() };
    }

    const [items, total] = await Promise.all([
      this.prisma.conversationSession.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.conversationSession.count({ where }),
    ]);

    return {
      data: items.map((session) => ({
        id: session.id,
        waNumber: session.waNumber,
        currentStep: session.currentStep,
        status: session.status,
        context: session.context,
        lastMessageAt: session.lastMessageAt,
        createdAt: session.createdAt,
        messageCount: session._count.messages,
      })),
      meta: this.paginationMeta(total, page, limit),
    };
  }

  async getSession(waNumber: string) {
    const session = await this.prisma.conversationSession.findUnique({
      where: { waNumber },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${waNumber}`);
    }

    return {
      ...session,
      messages: session.messages.map((message) => ({
        ...message,
        preview: extractMessagePreview(
          message.payload,
          message.direction,
          message.type,
        ),
      })),
    };
  }

  async listMessages(
    params: PaginationInput & {
      direction?: MessageDirection;
      sessionId?: string;
      search?: string;
    },
  ) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: Prisma.MessageLogWhereInput = {};

    if (params.direction) {
      where.direction = params.direction;
    }

    if (params.sessionId) {
      where.sessionId = params.sessionId;
    }

    if (params.search?.trim()) {
      where.session = {
        waNumber: { contains: params.search.trim() },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.messageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          session: { select: { waNumber: true, currentStep: true } },
        },
      }),
      this.prisma.messageLog.count({ where }),
    ]);

    return {
      data: items.map((message) => ({
        id: message.id,
        sessionId: message.sessionId,
        waNumber: message.session.waNumber,
        currentStep: message.session.currentStep,
        direction: message.direction,
        type: message.type,
        waMessageId: message.waMessageId,
        createdAt: message.createdAt,
        preview: extractMessagePreview(
          message.payload,
          message.direction,
          message.type,
        ),
        payload: message.payload,
      })),
      meta: this.paginationMeta(total, page, limit),
    };
  }

  async getFunnel() {
    const grouped = await this.prisma.conversationSession.groupBy({
      by: ['currentStep', 'status'],
      _count: { _all: true },
      orderBy: { currentStep: 'asc' },
    });

    const stepTotals = new Map<string, number>();

    for (const row of grouped) {
      stepTotals.set(
        row.currentStep,
        (stepTotals.get(row.currentStep) ?? 0) + row._count._all,
      );
    }

    return {
      byStep: [...stepTotals.entries()]
        .map(([step, count]) => ({ step, count }))
        .sort((a, b) => b.count - a.count),
      byStepAndStatus: grouped.map((row) => ({
        step: row.currentStep,
        status: row.status,
        count: row._count._all,
      })),
    };
  }

  async listWebhookEvents(params: PaginationInput) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        orderBy: { processedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webhookEvent.count(),
    ]);

    return {
      data: items,
      meta: this.paginationMeta(total, page, limit),
    };
  }

  async listRequestCaptures(
    params: PaginationInput & {
      path?: string;
      method?: string;
      statusCode?: number;
    },
  ) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: Prisma.InboundRequestCaptureWhereInput = {};

    if (params.path?.trim()) {
      where.path = { contains: params.path.trim() };
    }

    if (params.method?.trim()) {
      where.method = params.method.trim().toUpperCase();
    }

    if (params.statusCode !== undefined && !Number.isNaN(params.statusCode)) {
      where.statusCode = params.statusCode;
    }

    const [items, total] = await Promise.all([
      this.prisma.inboundRequestCapture.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inboundRequestCapture.count({ where }),
    ]);

    return {
      data: items,
      meta: this.paginationMeta(total, page, limit),
    };
  }

  async getRequestCapture(id: string) {
    const capture = await this.prisma.inboundRequestCapture.findUnique({
      where: { id },
    });

    if (!capture) {
      throw new NotFoundException('Request capture not found');
    }

    return capture;
  }

  private paginationMeta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
