import { Module } from '@nestjs/common';
import { GroupModule } from './group/group.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { StreakModule } from './streak/streak.module';
import { SubmissionModule } from './submission/submission.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    GroupModule,
    StreakModule,
    AuthModule,
    UserModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SubmissionModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
