import { Module } from '@nestjs/common';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';

@Module({
  controllers: [StreakController],
  providers: [StreakService]
})
export class StreakModule {}
