import { Injectable, Logger } from '@nestjs/common';
import { Submission } from 'src/user/userTypes';
import { SubmissionRepository } from './submission.repository';
import { timestampToDate } from 'src/Utils/Time';

/**
 * Service for managing user submissions recorded in the database.
 */
@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    private submissionRepository: SubmissionRepository,
  ) {}

  /**
   * Persists a new user submission or returns the existing one if it already exists.
   * Prevents duplicate entries for the same problem slug and user.
   * @param userId - The user's internal ID.
   * @param submissionData - Submission details fetched from LeetCode.
   * @returns The created or existing submission.
   */
  async createUserSubmission(userId: string, submissionData: Submission) {
    const { titleSlug, title, timestamp, statusDisplay, lang } = submissionData;
    const submittedAt = timestampToDate(timestamp);

    // Check if this specific problem has already been solved by the user
    const existing = await this.submissionRepository.findSubmissionByCompositeKey(
      userId,
      titleSlug,
    );

    if (existing) {
      this.logger.debug(
        `Submission ${titleSlug} for user ${userId} already exists`,
      );
      return existing;
    }

    return await this.submissionRepository.createSubmission({
      userId,
      title,
      titleSlug,
      statusDisplay,
      submittedAt,
      language: lang || 'unknown',
    });
  }
}
