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
        return await this.prisma.userSubmission.create({
            data: {
                userId,
                title: submissionData.title,
                titleSlug: submissionData.title.toLowerCase().replace(/\s+/g, '-'), // Convert to slug format
                statusDisplay: submissionData.statusDisplay,
                submittedAt: timestampToDate(submissionData.timestamp),
                language: submissionData.lang || 'unknown', // Or pass as parameter if available
            },
        });
    }
}
