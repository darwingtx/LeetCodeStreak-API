import { Module } from '@nestjs/common';
import { GroupModule } from './group/group.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { StreakModule } from './streak/streak.module';


@Module({
  imports: [GroupModule, StreakModule, AuthModule, UserModule, ConfigModule.forRoot({
      isGlobal: true,
    }),],
  providers: [PrismaService],
})
export class AppModule {}
