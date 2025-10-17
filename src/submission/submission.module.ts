import { Module } from '@nestjs/common';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [SubmissionController],
  providers: [SubmissionService, PrismaService]
})
export class SubmissionModule {}
