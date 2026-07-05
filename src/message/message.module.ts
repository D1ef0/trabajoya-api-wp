import { Module } from '@nestjs/common';
import { ZavuModule } from '../zavu/zavu.module';
import { ApiKeyGuard } from '../voice/guards/api-key.guard';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [ZavuModule],
  controllers: [MessageController],
  providers: [MessageService, ApiKeyGuard],
})
export class MessageModule {}
