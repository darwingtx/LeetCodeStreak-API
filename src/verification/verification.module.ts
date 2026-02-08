import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeetcodeService } from 'src/leetcode/leetcode.service';

@Module({
    providers: [VerificationService, PrismaService, LeetcodeService],
    exports: [VerificationService],
})
export class VerificationModule { }
