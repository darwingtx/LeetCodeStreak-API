import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from './user.repository';
import { LeetcodeModule } from '../leetcode/leetcode.module';

@Module({
  imports: [LeetcodeModule],
  controllers: [UserController],
  providers: [UserService, PrismaService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
