import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionModule } from '../session/session.module';
import { ZavuModule } from '../zavu/zavu.module';
import { ConversationProcessor } from './conversation.processor';
import { CONVERSATION_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue({ name: CONVERSATION_QUEUE }),
    SessionModule,
    ZavuModule,
  ],
  providers: [ConversationProcessor],
  exports: [BullModule],
})
export class QueueModule {}
