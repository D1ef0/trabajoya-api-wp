import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async check() {
    const checks = {
      postgres: false,
      redis: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }

    const redis = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();
      checks.redis = pong === 'PONG';
    } catch {
      checks.redis = false;
    } finally {
      redis.disconnect();
    }

    const ok = checks.postgres && checks.redis;

    return {
      status: ok ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
