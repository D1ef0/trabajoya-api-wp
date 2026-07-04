import { Module } from '@nestjs/common';
import { CvParserModule } from '../cv-parser/cv-parser.module';
import { TrabajoyaModule } from '../trabajoya/trabajoya.module';
import { ZavuModule } from '../zavu/zavu.module';
import { ConversationService } from './conversation.service';

@Module({
  imports: [TrabajoyaModule, CvParserModule, ZavuModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
