import { Module } from '@nestjs/common';
import { GroupModule } from './group/group.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { StreakModule } from './streak/streak.module';
import { SubmissionModule } from './submission/submission.module';
import { ScheduleModule } from '@nestjs/schedule';

/**
 * The root module of the application.
 * Aggregates all feature modules and global providers.
 */
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
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule { }
