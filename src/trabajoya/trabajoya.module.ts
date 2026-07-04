import { Module } from '@nestjs/common';
import { TrabajoyaService } from './trabajoya.service';

@Module({
  providers: [TrabajoyaService],
  exports: [TrabajoyaService],
})
export class TrabajoyaModule {}
