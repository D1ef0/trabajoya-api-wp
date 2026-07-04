import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class RedisLockService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisLockService.name);
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async acquire(key: string, token: string, ttlSeconds = 120): Promise<boolean> {
    const result = await this.redis.set(key, token, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async release(key: string, token: string): Promise<void> {
    try {
      await this.redis.eval(RELEASE_SCRIPT, 1, key, token);
    } catch (error) {
      this.logger.warn(`Failed to release lock ${key}: ${String(error)}`);
    }
  }

  conversationLockKey(waNumber: string): string {
    return `conv:lock:${waNumber}`;
  }
}
