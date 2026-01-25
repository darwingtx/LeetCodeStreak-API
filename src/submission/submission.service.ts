import { Injectable, Logger } from '@nestjs/common';
import { Submission } from 'src/user/userTypes';
import { SubmissionRepository } from './submission.repository';
import { timestampToDate } from 'src/Utils/Time';

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    private submissionRepository: SubmissionRepository,
  ) {
  }

  async createUserSubmission(userId: string, submissionData: Submission) {
    const titleSlug = submissionData.title.toLowerCase().replace(/\s+/g, '-');
    const submittedAt = timestampToDate(submissionData.timestamp);

    const existing = await this.submissionRepository.findSubmissionByCompositeKey(
      userId,
      titleSlug,
      submittedAt
    );

    if (existing) {
      this.logger.debug(
        `Submission ${titleSlug} for user ${userId} already exists`,
      );
      return existing;
    }

    return await this.submissionRepository.createSubmission({
        userId,
        title: submissionData.title,
        titleSlug,
        statusDisplay: submissionData.statusDisplay,
        submittedAt,
        language: submissionData.lang || 'unknown',
    });
  }
}
