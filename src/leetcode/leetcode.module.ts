import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LeetcodeService } from './leetcode.service';

@Module({
  imports: [ConfigModule],
  providers: [LeetcodeService],
  exports: [LeetcodeService],
})
export class LeetcodeModule {}
