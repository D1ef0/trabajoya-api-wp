import { Module } from '@nestjs/common';
import { ZavuService } from './zavu.service';

@Module({
  providers: [ZavuService],
  exports: [ZavuService],
})
export class ZavuModule {}
