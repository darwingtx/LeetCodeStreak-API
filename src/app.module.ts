import { Module } from '@nestjs/common';
import { GroupModule } from './group/group.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [GroupModule, AuthModule, UserModule, ConfigModule.forRoot({
      isGlobal: true,
    }),],
  providers: [PrismaService],
})
export class AppModule {}
