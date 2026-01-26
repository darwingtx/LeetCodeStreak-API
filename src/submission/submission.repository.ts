import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserSubmission } from '@prisma/client';

/**
 * Repository for data access operations related to UserSubmissions.
 */
@Injectable()
export class SubmissionRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new user submission record.
   * @param data - The submission data conforming to Prisma's unchecked create input.
   * @returns The created UserSubmission record.
   */
  async createSubmission(
    data: Prisma.UserSubmissionUncheckedCreateInput,
  ): Promise<UserSubmission> {
    return this.prisma.userSubmission.create({
      data,
    });
  }

  /**
   * Finds a single submission by its unique ID.
   * @param id - The submission UUID.
   */
  async findSubmission(id: string): Promise<UserSubmission | null> {
    return this.prisma.userSubmission.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a submission matching a user and problem slug, optionally with a specific timestamp.
   * Uses the composite key if submittedAt is provided, otherwise performs a search for the latest.
   */
  async findSubmissionByCompositeKey(
    userId: string,
    titleSlug: string,
  ): Promise<UserSubmission | null>;
  async findSubmissionByCompositeKey(
    userId: string,
    titleSlug: string,
    submittedAt: Date,
  ): Promise<UserSubmission | null>;
  async findSubmissionByCompositeKey(
    userId: string,
    titleSlug: string,
    submittedAt?: Date,
  ): Promise<UserSubmission | null> {
    if (submittedAt) {
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

    return this.prisma.userSubmission.findFirst({
      where: {
        userId,
        titleSlug,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  /**
   * Retrieves all submissions for a given user.
   * @param userId - Internal user ID.
   */
  async findSubmissions(userId: string): Promise<UserSubmission[]> {
    return this.prisma.userSubmission.findMany({
      where: { userId },
    });
  }

  /**
   * Searches for submissions from a specific user that match a list of problem slugs.
   * Optimized to perform a single query instead of multiple individual lookups.
   * @param userId - Internal user ID.
   * @param titleSlugs - Array of problem slugs to check.
   */
  async findSubmissionsByUserAndSlugs(
    userId: string,
    titleSlugs: string[],
  ): Promise<UserSubmission[]> {
    if (titleSlugs.length === 0) return [];
    
    return this.prisma.userSubmission.findMany({
      where: {
        userId,
        titleSlug: { in: titleSlugs },
      },
    });
  }

  /**
   * Updates an existing submission record.
   */
  async updateSubmission(
    id: string,
    data: Prisma.UserSubmissionUpdateInput,
  ): Promise<UserSubmission> {
    return this.prisma.userSubmission.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletes a submission record from the database.
   */
  async deleteSubmission(id: string): Promise<UserSubmission> {
    return this.prisma.userSubmission.delete({
      where: { id },
    });
  }
}
