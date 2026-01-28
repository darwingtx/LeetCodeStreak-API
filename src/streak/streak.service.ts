import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreakHistory, Submission, UserStreak } from 'src/user/userTypes';
import { SubmissionService } from 'src/submission/submission.service';
import { ConfigService } from '@nestjs/config';
import {
  convertTimestampToTimezoneDate,
  convertTimestampToZonedDate,
  dateToTimestamp,
  formatZonedDateDay,
  getIANATimezone,
  isNextDay,
  isSameDay,
  timestampToDate,
} from 'src/Utils/Time';
import { Cron } from '@nestjs/schedule';
import { LeetcodeService } from 'src/leetcode/leetcode.service';
import { SubmissionRepository } from 'src/submission/submission.repository';

/**
 * Service responsible for managing user streaks based on LeetCode submissions.
 */
@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    private prisma: PrismaService,
    private submissionService: SubmissionService,
    private leetcodeService: LeetcodeService,
    private submissionRepository: SubmissionRepository,
  ) {}

  /**
   * Retrieves the current streak information for a specific user.
   * @param id - The unique identifier of the user.
   * @returns An object containing user ID and current streak.
   * @throws NotFoundException if the user doesn't exist.
   */
  async getStreakByUserId(id: string) {
    const streak = await this.prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        currentStreak: true,
      },
    });

    if (!streak) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return streak;
  }

  /**
   * Resets a user's streak to zero.
   * @param id - The unique identifier of the user.
   * @returns The updated user record.
   * @throws NotFoundException if the user doesn't exist.
   */
  async resetStreakByUserId(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: 0,
        lastProblemSolvedAt: null,
      },
    });
  }

  /**
   * Updates a user's streak by fetching their latest submissions from LeetCode.
   * @param id - The unique identifier of the user.
   * @returns The updated user record with the new streak value.
   * @throws NotFoundException if the user doesn't exist.
   */
  async updateStreakByUserId(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        username: true,
        lastProblemSolvedAt: true,
        currentStreak: true,
        timezone: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // Fetch the 20 most recent accepted submissions from LeetCode
    const submissions = await this.leetcodeService.getRecentAcSubmissions(user.username, 20);

    if (submissions.length === 0) {
      return user;
    }

    const streakHistory = await this.getStreakHistoryForUser(user.id);
    const firstProblemAtTs = streakHistory ? dateToTimestamp(streakHistory.firstProblemAt) : 0;
    
    // Calculate problems already solved TODAY (if the last solved date is indeed today)
    let initialProblemsToday = 0;
    if (user.lastProblemSolvedAt && streakHistory) {
      const timezone = getIANATimezone(user.timezone);
      if (isSameDay(dateToTimestamp(user.lastProblemSolvedAt)!, dateToTimestamp(streakHistory.date)!, timezone)) {
        initialProblemsToday = streakHistory.problemsSolved;
      }
    }

    const { finalStreak, lastSolvedAt } = await this.processSubmissionsAndCalculateStreak(
      user.id,
      submissions,
      getIANATimezone(user.timezone),
      user.currentStreak,
      dateToTimestamp(user.lastProblemSolvedAt) || 0,
      initialProblemsToday,
      firstProblemAtTs || 0,
    );

    return await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: finalStreak,
        lastProblemSolvedAt: lastSolvedAt,
      },
    });
  }

  /**
   * Retrieves the most recent streak history entry for a user.
   * @param id - The user ID.
   * @returns The latest streak history record or null.
   */
  async getStreakHistoryForUser(id: string) {
    return this.prisma.streakHistory.findFirst({
      where: { userId: id },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Periodically updates streaks for all users in the system.
   * Runs every 3 hours.
   */
  @Cron('0 */3 * * *')
  async updateStreaksForAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        timezone: true,
        lastProblemSolvedAt: true,
        longestStreak: true,
        currentStreak: true,
      },
    });
    if (users.length === 0) {
      this.logger.warn('No users found to update');
      return 'No users found';
    }
    const userStreaks: UserStreak[] = users.map((user) => ({
      id: user.id,
      currentStreak: user.currentStreak,
      lastProblemSolvedAt: user.lastProblemSolvedAt,
      longestStreak: user.longestStreak,
      timezone: user.timezone,
    }));

    for (const user of userStreaks) {
      await this.updateStreakByUserId(user.id);
    }

    return 'Streaks updated for all users';
  }

  /**
   * Final update of the day to ensure all streaks are synchronized.
   * Runs at 23:59 daily.
   */
  @Cron('59 23 * * *')
  async updateStreaksForAllUsersAtEndOfDay() {
    await this.updateStreaksForAllUsers();
  }

  /**
   * Rebuilds or performs a deep update of the user's streak using LeetCode submissions.
   * @param id - User ID.
   * @param timeZone - User's timezone.
   */
  async updateAllStreakUser(id: string, timeZone: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        username: true,
        lastProblemSolvedAt: true,
        currentStreak: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const submissions = await this.leetcodeService.getRecentAcSubmissions(user.username, 20);

    if (submissions.length === 0) {
      return user;
    }

    const { finalStreak, lastSolvedAt } = await this.processSubmissionsAndCalculateStreak(
      id,
      submissions,
      timeZone,
      user.currentStreak,
      0, // Force calculation from first submission
      0, // Initial daily count 0 for a full rebuild
    );

    return await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: finalStreak,
        lastProblemSolvedAt: lastSolvedAt,
      },
    });
  }

  /**
   * Creates or updates a streak history record for a user on a specific date.
   * @param streakHistory - The data to save.
   */
  async createStreakHistoryForUser(streakHistory: StreakHistory) {
    const existing = await this.prisma.streakHistory.findUnique({
      where: {
        userId_date: {
          userId: streakHistory.userId,
          date: streakHistory.date,
        },
      },
    });

    if (existing) {
      return await this.prisma.streakHistory.update({
        where: { id: existing.id },
        data: {
          problemsSolved: streakHistory.problemsSolved,
          firstProblemAt: streakHistory.firstProblemAt,
        },
      });
    }

    return await this.prisma.streakHistory.create({
      data: {
        userId: streakHistory.userId,
        date: streakHistory.date,
        problemsSolved: streakHistory.problemsSolved,
        firstProblemAt: streakHistory.firstProblemAt,
      },
    });
  }

  /**
   * Re-calculates a user's streak based on submissions already stored in the local database.
   * Useful for auditing or recovering from inconsistencies.
   * @param userId - The user ID.
   * @returns The newly calculated current streak.
   */
  async updateStreakBD(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        lastProblemSolvedAt: true,
        currentStreak: true,
        timezone: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const userSubmissions = await this.prisma.userSubmission.findMany({
      where: { userId: userId, statusDisplay: 'Accepted' },
      orderBy: { submittedAt: 'asc' }, // Ascending for rebuilding
    });

    const submissions: Submission[] = userSubmissions.map((sub) => ({
      title: sub.title,
      titleSlug: sub.titleSlug,
      timestamp: dateToTimestamp(sub.submittedAt) ?? 0,
      statusDisplay: sub.statusDisplay,
      lang: sub.language,
    }));

    const { finalStreak, lastSolvedAt } = await this.processSubmissionsAndCalculateStreak(
      user.id,
      submissions,
      getIANATimezone(user.timezone),
      0,
      0,
      0,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: finalStreak,
        lastProblemSolvedAt: lastSolvedAt || user.lastProblemSolvedAt,
      },
    });

    return finalStreak;
  }

  /**
   * Fixes the problems_solved count in streak_history by recalculating from actual submissions.
   * This method accumulates problems_solved across consecutive days in a streak.
   * If the streak breaks (missing a day), the count resets to 0 and starts accumulating again.
   * Example: Day1=2, Day2=5 (2+3), Day3=8 (2+3+3), [break], Day5=1 (reset)
   * @returns Summary of the fix operation including total records processed and updated.
   */
  async fixStreakHistoryProblemsCount() {
    this.logger.log('Starting to fix problems_solved count in streak_history...');
    
    // Get all users
    const users = await this.prisma.user.findMany({
      select: { id: true, timezone: true },
    });

    if (users.length === 0) {
      return {
        message: 'No users found',
        totalRecords: 0,
        updatedRecords: 0,
      };
    }

    this.logger.log(`Found ${users.length} users to process`);

    let totalUpdatedCount = 0;
    let totalProcessedRecords = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each user
    for (const user of users) {
      try {
        const timezone = getIANATimezone(user.timezone);

        // Get all accepted submissions for this user, ordered by submission time
        const submissions = await this.prisma.userSubmission.findMany({
          where: {
            userId: user.id,
            statusDisplay: 'Accepted',
          },
          orderBy: { submittedAt: 'asc' },
        });

        if (submissions.length === 0) {
          continue;
        }

        // Group submissions by date in user's timezone
        const dateMap = new Map<string, { 
          count: number; 
          firstProblemAt: Date; 
          timestamp: number;
          zonedDate: Date;
        }>();
        
        for (const submission of submissions) {
          const submissionTs = dateToTimestamp(submission.submittedAt) ?? 0;
          const zonedDate = convertTimestampToZonedDate(submissionTs, timezone);
          const dayLabel = formatZonedDateDay(zonedDate, timezone); // YYYY-MM-DD in user's timezone
          
          if (!dateMap.has(dayLabel)) {
            dateMap.set(dayLabel, { 
              count: 1, 
              firstProblemAt: submission.submittedAt,
              timestamp: submissionTs,
              zonedDate: zonedDate,
            });
          } else {
            const current = dateMap.get(dayLabel)!;
            current.count++;
          }
        }

        // Sort dates chronologically
        const sortedDates = Array.from(dateMap.entries()).sort((a, b) => 
          a[1].timestamp - b[1].timestamp
        );

        // Calculate accumulated count across streak
        let accumulatedCount = 0;
        let previousTimestamp: number | null = null;

        for (const [dayLabel, data] of sortedDates) {
          const currentTimestamp = data.timestamp;

          // Check if streak continues or breaks using timezone-aware comparison
          if (previousTimestamp !== null) {
            // Check if current day is the next day after previous
            if (!isNextDay(currentTimestamp, previousTimestamp, timezone) && 
                !isSameDay(currentTimestamp, previousTimestamp, timezone)) {
              // Streak is broken, reset accumulator
              accumulatedCount = 0;
            }
          }

          // Accumulate count
          accumulatedCount += data.count;

          // Find or create the streak_history record
          // Create a Date object at midnight for database storage
          const dateForDB = new Date(data.zonedDate);
          dateForDB.setHours(0, 0, 0, 0);
          
          const streakRecord = await this.prisma.streakHistory.findUnique({
            where: {
              userId_date: {
                userId: user.id,
                date: dateForDB,
              },
            },
          });

          totalProcessedRecords++;

          if (streakRecord) {
            // Update if the count is different
            if (streakRecord.problemsSolved !== accumulatedCount) {
              await this.prisma.streakHistory.update({
                where: { id: streakRecord.id },
                data: { 
                  problemsSolved: accumulatedCount,
                  firstProblemAt: data.firstProblemAt,
                },
              });
              
              totalUpdatedCount++;
              
              if (totalUpdatedCount % 50 === 0) {
                this.logger.log(`Progress: ${totalUpdatedCount} records updated so far...`);
              }
            }
          } else {
            // Create a new streak_history record if it doesn't exist
            await this.prisma.streakHistory.create({
              data: {
                userId: user.id,
                date: dateForDB,
                problemsSolved: accumulatedCount,
                firstProblemAt: data.firstProblemAt,
              },
            });
            
            totalUpdatedCount++;
            
            if (totalUpdatedCount % 50 === 0) {
              this.logger.log(`Progress: ${totalUpdatedCount} records created so far...`);
            }
          }

          // Update previous timestamp for next iteration
          previousTimestamp = currentTimestamp;
        }

      } catch (error) {
        errorCount++;
        const errorMsg = `Error processing user ${user.id}: ${error.message}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const result = {
      message: 'Streak history problems_solved count fix completed',
      totalUsers: users.length,
      totalRecordsProcessed: totalProcessedRecords,
      updatedRecords: totalUpdatedCount,
      errorCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Return first 10 errors
    };

    this.logger.log(JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Core logic to process submissions and determine streak status.
   * Groups submissions by day and validates against existing records to avoid double counting.
   */
  private async processSubmissionsAndCalculateStreak(
    userId: string,
    submissions: Submission[],
    timeZone: string,
    initialStreak: number,
    lastSolvedAtTs: number,
    initialDailyCount: number,
    firstProblemAtTs?: number,
  ): Promise<{ finalStreak: number; lastSolvedAt: Date | null }> {

    // 1. Filter and sort valid submissions (Accepted and newer than last processed)
    const validSubmissions = submissions
      .filter((s) => s.statusDisplay === 'Accepted' && s.timestamp > lastSolvedAtTs)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (validSubmissions.length === 0) {
      return {
        finalStreak: initialStreak,
        lastSolvedAt: lastSolvedAtTs > 0 ? timestampToDate(lastSolvedAtTs) : null,
      };
    }

    // 2. Group submissions by day in the user's timezone
    const submissionsByDay = new Map<string, Submission[]>();
    for (const sub of validSubmissions) {
      const dayLabel = formatZonedDateDay(
        convertTimestampToZonedDate(sub.timestamp, timeZone),
        timeZone,
      );
      if (!submissionsByDay.has(dayLabel)) {
        submissionsByDay.set(dayLabel, []);
      }
      submissionsByDay.get(dayLabel)!.push(sub);
    }

    // 3. Batch verify existing slugs to identify genuinely new problems
    const allSlugs = [...new Set(validSubmissions.map((s) => s.titleSlug))];
    const existingSubmissions = await this.submissionRepository.findSubmissionsByUserAndSlugs(
      userId,
      allSlugs,
    );
    const existingSlugs = new Set(existingSubmissions.map((s) => s.titleSlug));

    // 4. Process days chronologically
    const sortedDays = [...submissionsByDay.keys()].sort();

    let currentStreak = initialStreak;
    let lastProcessedTs = lastSolvedAtTs;
    let lastDayProcessedTs = lastSolvedAtTs;
    let currentDayFirstTs = firstProblemAtTs || 0;
    let problemsToday = initialDailyCount;

    for (const dayLabel of sortedDays) {
      const daySubs = submissionsByDay.get(dayLabel)!;
      const firstSubOfDay = daySubs[0];

      // Detect if we transitioned to a new day relative to the last processed submission
      const isNewDay = lastProcessedTs === 0 || 
        !isSameDay(firstSubOfDay.timestamp, lastProcessedTs, timeZone);

      if (isNewDay) {
        lastDayProcessedTs = lastProcessedTs;
        problemsToday = 0;
        currentDayFirstTs = firstSubOfDay.timestamp;
      }

      // Identify problems that haven't been stored in our DB yet
      const newProblemsOfDay = daySubs.filter((s) => !existingSlugs.has(s.titleSlug));
      const hasNewProblems = newProblemsOfDay.length > 0;

      // Count total problems for historical tracking
      problemsToday += daySubs.length;

      // Streak logic: Increment only if new unique problems were solved
      if (hasNewProblems) {
        if (currentStreak === 0) {
          currentStreak = 1;
        } else if (isNextDay(firstSubOfDay.timestamp, lastDayProcessedTs, timeZone)) {
          currentStreak++;
        } else if (!isSameDay(firstSubOfDay.timestamp, lastDayProcessedTs, timeZone)) {
          // Streak broken (gap in days), resetting to 1
          currentStreak = 1;
        }
        // If same day, streak remains unchanged as it was already accounted for
      }

      // Persist new submissions to the database
      for (const sub of newProblemsOfDay) {
        await this.submissionService.createUserSubmission(userId, sub);
        existingSlugs.add(sub.titleSlug); 
      }

      // Update the last processed timestamp to the end of the current day
      lastProcessedTs = daySubs[daySubs.length - 1].timestamp;

      // Update the user's streak history for this specific day
      await this.createStreakHistoryForUser({
        userId,
        date: timestampToDate(lastProcessedTs),
        problemsSolved: problemsToday,
        firstProblemAt: convertTimestampToTimezoneDate(currentDayFirstTs, timeZone),
      });
    }

    return {
      finalStreak: currentStreak,
      lastSolvedAt: timestampToDate(lastProcessedTs),
    };
  }
}



