import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserSubmission } from '@prisma/client';

@Injectable()
export class SubmissionRepository {
  constructor(private prisma: PrismaService) {}

  async createSubmission(
    data: Prisma.UserSubmissionUncheckedCreateInput,
  ): Promise<UserSubmission> {
    return this.prisma.userSubmission.create({
      data,
    });
  }

  async findSubmission(id: string): Promise<UserSubmission | null> {
    return this.prisma.userSubmission.findUnique({
      where: { id },
    });
  }

  async findSubmissionByCompositeKey(
    userId: string,
    titleSlug: string,
    submittedAt: Date,
  ): Promise<UserSubmission | null> {
    return this.prisma.userSubmission.findUnique({
      where: {
        userId_titleSlug_submittedAt: {
          userId,
          titleSlug,
          submittedAt,
        },
      },
    });
  }

  async findSubmissions(userId: string): Promise<UserSubmission[]> {
    return this.prisma.userSubmission.findMany({
      where: { userId },
    });
  }

  async updateSubmission(
    id: string,
    data: Prisma.UserSubmissionUpdateInput,
  ): Promise<UserSubmission> {
    return this.prisma.userSubmission.update({
      where: { id },
      data,
    });
  }

  async deleteSubmission(id: string): Promise<UserSubmission> {
    return this.prisma.userSubmission.delete({
      where: { id },
    });
  }
}
