import { Module } from '@nestjs/common';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [StreakController],
  providers: [StreakService,PrismaService]
})
export class StreakModule {}
