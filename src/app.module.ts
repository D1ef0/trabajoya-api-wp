import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import configuration from './common/config/configuration';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RequestCaptureModule } from './request-capture/request-capture.module';
import { VoiceModule } from './voice/voice.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public', 'admin'),
      serveRoot: '/admin',
      exclude: ['/admin/api*'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'storage', 'audio'),
      serveRoot: '/media/audio',
    }),
    PrismaModule,
    RedisModule,
    RequestCaptureModule,
    WebhookModule,
    HealthModule,
    AdminModule,
    VoiceModule,
  ],
})
export class AppModule {}
