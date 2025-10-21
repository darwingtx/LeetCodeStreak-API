import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { Submission } from 'src/user/userTypes';
import { timestampToDate } from 'src/Utils/Time';

@Injectable()
export class SubmissionService {
  apiUrl: string | undefined;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.configService = configService;
    this.apiUrl = this.configService.get<string>('API_URL');
    this.prisma = prisma;
  }

  async createUserSubmission(userId: string, submissionData: Submission) {
    const titleSlug = submissionData.title.toLowerCase().replace(/\s+/g, '-');
    const submittedAt = timestampToDate(submissionData.timestamp);

    const existing = await this.prisma.userSubmission.findUnique({
      where: {
        userId_titleSlug_submittedAt: {
          userId,
          titleSlug,
          submittedAt,
        },
      },
    });

    if (existing) {
      return existing; // O lanzar un error, según tu lógica
    }

    return await this.prisma.userSubmission.create({
      data: {
        userId,
        title: submissionData.title,
        titleSlug,
        statusDisplay: submissionData.statusDisplay,
        submittedAt,
        language: submissionData.lang || 'unknown',
      },
    });
  }
}
