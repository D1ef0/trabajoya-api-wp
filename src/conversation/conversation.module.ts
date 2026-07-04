import { Module } from '@nestjs/common';
import { TrabajoyaModule } from '../trabajoya/trabajoya.module';
import { ConversationService } from './conversation.service';

@Module({
  imports: [TrabajoyaModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
