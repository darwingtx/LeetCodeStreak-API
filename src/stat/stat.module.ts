import { Module } from '@nestjs/common';
import { StatService } from './stat.service';
import { StatController } from './stat.controller';

@Module({
  providers: [StatService],
  controllers: [StatController]
})
export class StatModule {}
