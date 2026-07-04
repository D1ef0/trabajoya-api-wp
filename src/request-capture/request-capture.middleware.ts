import { Injectable, NestMiddleware } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common/interfaces';
import { NextFunction, Request, Response } from 'express';
import { RequestCaptureService } from './request-capture.service';

const REDACTED_HEADERS = new Set(['authorization', 'cookie', 'set-cookie']);

@Injectable()
export class RequestCaptureMiddleware implements NestMiddleware {
  constructor(private readonly requestCaptureService: RequestCaptureService) {}

  use(req: RawBodyRequest<Request>, res: Response, next: NextFunction): void {
    if (this.shouldSkip(req)) {
      next();
      return;
    }

    const startedAt = Date.now();
    const snapshot = this.buildSnapshot(req);

    res.on('finish', () => {
      this.requestCaptureService.capture({
        ...snapshot,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  }

  private shouldSkip(req: Request): boolean {
    const path = this.resolvePath(req);

    if (path.startsWith('/admin') && !path.startsWith('/admin/api')) {
      return true;
    }

    return false;
  }

  private buildSnapshot(req: RawBodyRequest<Request>) {
    const path = this.resolvePath(req);
    const queryIndex = req.originalUrl.indexOf('?');
    const queryString =
      queryIndex >= 0 ? req.originalUrl.slice(queryIndex + 1) : undefined;

    return {
      method: req.method,
      path,
      queryString,
      headers: this.sanitizeHeaders(req.headers),
      body: this.resolveBody(req),
      ip: this.resolveClientIp(req),
      userAgent: req.get('user-agent') ?? undefined,
    };
  }

  private resolvePath(req: Request): string {
    return req.path || req.originalUrl.split('?')[0] || '/';
  }

  private resolveBody(req: RawBodyRequest<Request>): string | undefined {
    if (req.rawBody instanceof Buffer && req.rawBody.length > 0) {
      return req.rawBody.toString('utf8');
    }

    if (req.body === undefined || req.body === null) {
      return undefined;
    }

    if (typeof req.body === 'string') {
      return req.body;
    }

    if (Buffer.isBuffer(req.body)) {
      return req.body.toString('utf8');
    }

    if (typeof req.body === 'object' && Object.keys(req.body).length === 0) {
      return undefined;
    }

    try {
      return JSON.stringify(req.body);
    } catch {
      return String(req.body);
    }
  }

  private sanitizeHeaders(
    headers: Request['headers'],
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) {
        continue;
      }

      const normalizedKey = key.toLowerCase();
      if (REDACTED_HEADERS.has(normalizedKey)) {
        sanitized[normalizedKey] = '[REDACTED]';
        continue;
      }

      sanitized[normalizedKey] = Array.isArray(value)
        ? value.join(', ')
        : String(value);
    }

    return sanitized;
  }

  private resolveClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim();
    }

    return req.ip || req.socket.remoteAddress || undefined;
  }
}
