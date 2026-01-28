import { Module } from '@nestjs/common';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LeetcodeModule } from 'src/leetcode/leetcode.module';
import { SubmissionModule } from 'src/submission/submission.module';

@Module({
  imports: [LeetcodeModule, SubmissionModule],
  controllers: [StreakController],
  providers: [StreakService, PrismaService],
})
export class StreakModule {}
