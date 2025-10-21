import { Module } from '@nestjs/common';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmissionService } from 'src/submission/submission.service';

@Module({
  controllers: [StreakController],
  providers: [StreakService, PrismaService, SubmissionService],
})
export class StreakModule {}
