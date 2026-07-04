import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CaptureRequestInput {
  method: string;
  path: string;
  queryString?: string;
  headers: Record<string, string>;
  body?: string;
  ip?: string;
  userAgent?: string;
  statusCode: number;
  durationMs: number;
}

const MAX_BODY_LENGTH = 64_000;

@Injectable()
export class RequestCaptureService {
  private readonly logger = new Logger(RequestCaptureService.name);

  constructor(private readonly prisma: PrismaService) {}

  capture(input: CaptureRequestInput): void {
    const body = this.truncateBody(input.body);

    void this.prisma.inboundRequestCapture
      .create({
        data: {
          method: input.method.toUpperCase(),
          path: input.path,
          queryString: input.queryString,
          headers: input.headers as Prisma.InputJsonValue,
          body,
          ip: input.ip,
          userAgent: input.userAgent,
          statusCode: input.statusCode,
          durationMs: input.durationMs,
        },
      })
      .catch((error) => {
        this.logger.error('Failed to store inbound request capture', error);
      });
  }

  private truncateBody(body?: string): string | undefined {
    if (!body) {
      return undefined;
    }

    if (body.length <= MAX_BODY_LENGTH) {
      return body;
    }

    return `${body.slice(0, MAX_BODY_LENGTH)}\n...[truncated]`;
  }
}
