import { Injectable } from '@nestjs/common';
import { ConversationSession, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreate(waNumber: string): Promise<ConversationSession> {
    return this.prisma.conversationSession.upsert({
      where: { waNumber },
      create: { waNumber },
      update: { lastMessageAt: new Date(), status: 'active' },
    });
  }

  touch(sessionId: string, contextPatch?: Prisma.InputJsonValue) {
    return this.prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: new Date(),
        ...(contextPatch !== undefined ? { context: contextPatch } : {}),
      },
    });
  }

  async advance(
    sessionId: string,
    update: {
      currentStep?: string;
      context?: Record<string, unknown>;
    },
  ): Promise<ConversationSession> {
    const session = await this.prisma.conversationSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    const existingContext =
      session.context && typeof session.context === 'object' && !Array.isArray(session.context)
        ? (session.context as Record<string, unknown>)
        : {};

    const mergedContext =
      update.context !== undefined
        ? { ...existingContext, ...update.context }
        : existingContext;

    return this.prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: new Date(),
        ...(update.currentStep !== undefined
          ? { currentStep: update.currentStep }
          : {}),
        context: mergedContext as Prisma.InputJsonValue,
      },
    });
  }

  reset(
    sessionId: string,
    nextStep = 'MENU_ROOT',
  ): Promise<ConversationSession> {
    return this.prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        currentStep: nextStep,
        context: {},
        lastMessageAt: new Date(),
        status: 'active',
      },
    });
  }

  findByWaNumber(waNumber: string) {
    return this.prisma.conversationSession.findUnique({
      where: { waNumber },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }
}
