import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { format, toZonedTime } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { StreakHistory, Submission, UserStreak } from 'src/user/userTypes';
import { SubmissionService } from 'src/submission/submission.service';
import { ConfigService } from '@nestjs/config';
import {
  convertTimestampToTimezoneDate,
  convertTimestampToZonedDate,
  dateToTimestamp,
  formatZonedDateDay,
  getIANATimezone,
  timestampToDate,
} from 'src/Utils/Time';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class StreakService {
  apiUrl: string | undefined;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private submissionService: SubmissionService,
  ) {
    this.configService = configService;
    this.apiUrl = this.configService.get<string>('API_URL');
    this.prisma = prisma;
  }

  async getStreakByUserId(id: string) {
    const streak = await this.prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        currentStreak: true,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (!streak) {
      throw new Error(`User with id ${id} not found`);
    }
    return streak;
  }

  async resetStreakByUserId(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: 0,
        lastProblemSolvedAt: null,
      },
    });

    return updatedUser;
  }

  async updateStreakByUserId(id: string, timezone: string) {
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
      throw new Error(`User with id ${id} not found`);
    }

    let streak = user.currentStreak;

    const data = await this.queryACSubmissions(user.username, 5);

    const submissions: Submission[] = data.data.recentAcSubmissionList;
    let firstProblemAtTs: number = 0;
    if (submissions.length === 0) {
      return user; // No new submissions
    }
    if (streak > 0) {
      const streakHistory = await this.getStreakHistoryForUser(user.id);
      if (streakHistory) {
        firstProblemAtTs = dateToTimestamp(streakHistory.firstProblemAt) ?? 0;
        streak = await this.processSubmissionsAndUpdateStreak(
          user.id,
          submissions,
          getIANATimezone(user.timezone),
          streak
        );
        
      }
    }
    const latestSubmission = submissions[0];


    // Update user with new streak
    const updatedUser = await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: streak,
        lastProblemSolvedAt: timestampToDate(latestSubmission.timestamp),
      },
    });

    return updatedUser;
  }

  async getStreakHistoryForUser(id: string) {
    return this.prisma.streakHistory.findFirst({
      where: { userId: id },
      orderBy: { date: 'desc' },
    });
  }

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
      throw new Error('No users found');
    }
    const userStreaks: UserStreak[] = users.map((user) => ({
      id: user.id,
      currentStreak: user.currentStreak,
      lastProblemSolvedAt: user.lastProblemSolvedAt,
      longestStreak: user.longestStreak,
      timezone: user.timezone,
    }));

    for (const user of userStreaks) {
      this.updateStreakByUserId(user.id, getIANATimezone(user.timezone));
    }

    return 'Streaks updated for all users';
  }

  @Cron('59 23 * * *')
  async updateStreaksForAllUsersAtEndOfDay() {
    await this.updateStreaksForAllUsers();
  }

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
      throw new Error(`User with id ${id} not found`);
    }

    const data = await this.queryACSubmissions(user.username, 30);
    const submissions: Submission[] = data.data.recentAcSubmissionList;

    if (submissions.length === 0) {
      return user;
    }

    const currentStreakCount = await this.processSubmissionsAndUpdateStreak(
      id,
      submissions,
      timeZone,
      user.currentStreak
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: currentStreakCount,
        lastProblemSolvedAt: timestampToDate(submissions[0].timestamp),
      },
    });

    return updatedUser;
  }

  private async processSubmissionsAndUpdateStreak(
    userId: string,
    submissions: Submission[],
    timeZone: string,
    currentStreakCount: number,
    firstProblemAtTs?: number,
  ): Promise<number> {
    const processedDays = new Set<string>();
    let lastProcessedTs = submissions[submissions.length - 1]?.timestamp || 0;
    let numProblemsSolved = 0;
    let firstProblemAtTsLocal: number = firstProblemAtTs ?? 0;

    for (let i = submissions.length - 1; i >= 0; i--) {
      const submission = submissions[i];

      await this.submissionService.createUserSubmission(userId, submission);

      const submissionDay = formatZonedDateDay(
        convertTimestampToZonedDate(submission.timestamp, timeZone),
        timeZone,
      );

      if (processedDays.has(submissionDay)) {
        numProblemsSolved++;
        lastProcessedTs = submission.timestamp;
        continue;
      }

      processedDays.add(submissionDay);

      if (currentStreakCount === 0) {
        numProblemsSolved++;
        currentStreakCount = 1;
        lastProcessedTs = submission.timestamp;
        firstProblemAtTsLocal = submission.timestamp;
      } else if (
        this.isNextDay(submission.timestamp, lastProcessedTs, timeZone)
      ) {
        numProblemsSolved++;
        currentStreakCount++;
        lastProcessedTs = submission.timestamp;
      } else {
        currentStreakCount = 1;
        numProblemsSolved = 1;
        firstProblemAtTsLocal = submission.timestamp;
        lastProcessedTs = submission.timestamp;
      }
      if (currentStreakCount > 0) {
        await this.createStreakHistoryForUser({
          userId: userId,
          firstProblemAt: convertTimestampToTimezoneDate(
            firstProblemAtTsLocal,
            timeZone,
          ),
          problemsSolved: currentStreakCount,
          date: timestampToDate(lastProcessedTs),
        });
      }
      console.log('---Current Streak Count:', currentStreakCount);
    }

    return currentStreakCount;
  }

  async createStreakHistoryForUser(streakHistory: StreakHistory) {
    const existingStreakDate = streakHistory.date;

    const exist = await this.prisma.streakHistory.findFirst({
      where: {
        userId: streakHistory.userId,
        date: existingStreakDate,
      },
    });

    if (exist) {
      await this.prisma.streakHistory.update({
        where: { id: exist.id },
        data: {
          problemsSolved: streakHistory.problemsSolved,
        },
      });
      return exist;
    }

    const streak = await this.prisma.streakHistory.create({
      data: {
        userId: streakHistory.userId,
        firstProblemAt: streakHistory.firstProblemAt,
        problemsSolved: streakHistory.problemsSolved,
        date: existingStreakDate,
      },
    });

    return streak;
  }

  private async getLatestFirstProblemAtForUser(userId: string) {
    return await this.prisma.streakHistory.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
      select: {
        firstProblemAt: true,
      },
    });
  }

  private isSameDay(tsA: number, tsB: number, timezone: string): boolean {
    const a = convertTimestampToZonedDate(tsA, timezone);
    const b = convertTimestampToZonedDate(tsB, timezone);
    return formatZonedDateDay(a, timezone) === formatZonedDateDay(b, timezone);
  }

  private isPreviousDay(
    submissionTs: number,
    lastSolvedTs: number,
    timezone: string,
  ): boolean {
    const subDay = formatZonedDateDay(
      convertTimestampToZonedDate(submissionTs, timezone),
      timezone,
    );
    console.log('Submission Day:', subDay);
    const prevDay = formatZonedDateDay(
      addDays(convertTimestampToZonedDate(lastSolvedTs, timezone), -1),
      timezone,
    );
    console.log('Previous Day:', prevDay);
    return subDay === prevDay;
  }

  private async queryACSubmissions(username: string, limit: number) {
    const query = `#graphql
    query getACSubmissions ($username: String!, $limit: Int) {
    recentAcSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
        statusDisplay
        lang
    }
}`;
    const body = JSON.stringify({
      query,
      variables: { username: username, limit: limit },
    });

    if (!this.apiUrl) {
      throw new Error('API_URL is not defined');
    }

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      throw new Error(`Error en la request: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  }

  private isNextDay(
    submissionTs: number,
    lastSolvedTs: number,
    timezone: string,
  ): boolean {
    const subDay = formatZonedDateDay(
      convertTimestampToZonedDate(submissionTs, timezone),
      timezone,
    );
    const nextDay = formatZonedDateDay(
      addDays(convertTimestampToZonedDate(lastSolvedTs, timezone), 1),
      timezone,
    );
    return subDay === nextDay;
  }
}
