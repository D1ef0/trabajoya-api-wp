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
