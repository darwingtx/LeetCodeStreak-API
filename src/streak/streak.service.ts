import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { format, toZonedTime } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { StreakHistory, Submission, UserStreak } from 'src/user/userTypes';
import { SubmissionService } from 'src/submission/submission.service';
import { ConfigService } from '@nestjs/config';
import { dateToTimestamp, getIANATimezone, timestampToDate } from 'src/Utils/Time';
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
  getStreakByUserId(id: string) {
    const streak = this.prisma.user.findUnique({
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

  async updateStreakByUserId(id: string, timezone: string) {
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

    const streak = user.currentStreak;

    // Get latest AC submissions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await this.queryACSubmissions(user.username, 1);

    const submissions: Submission[] = data.data.recentAcSubmissionList;
    let firstProblemAtTs: number = 0;
    if (submissions.length === 0) {
      return user; // No new submissions
    }

    const latestSubmission = submissions[0];
    if (streak === 0) {
      firstProblemAtTs = latestSubmission.timestamp;
    } else {
      const latest = await this.getLatestFirstProblemAtForUser(id);
      firstProblemAtTs = latest?.firstProblemAt
        ? dateToTimestamp(latest.firstProblemAt)!
        : 0;
    }
    const lastSolvedTs = dateToTimestamp(user.lastProblemSolvedAt) || 0;

    // Check if we already processed this problem today


    // Save the new submission
    await this.submissionService.createUserSubmission(
      user.id,
      latestSubmission,
    );

    let newStreak = user.currentStreak;
    let shouldUpdateHistory = false;

    if (lastSolvedTs === 0) {
      // First submission ever
      newStreak = 1;
      shouldUpdateHistory = true;
    } else if (
      this.isSameDay(latestSubmission.timestamp, lastSolvedTs, timezone)
    ) {
      // Same day, keep streak (submission already saved)
      return user;
    } else if (
      this.isPreviousDay(latestSubmission.timestamp, lastSolvedTs, timezone)
    ) {
      // Consecutive day, increment streak
      newStreak = user.currentStreak + 1;
      shouldUpdateHistory = true;
    } else {
      // Streak break, streak = 1
      newStreak = 1;
      shouldUpdateHistory = true;
    }

    // SAVE streak history if needed
    if (shouldUpdateHistory) {
      await this.createStreakHistoryForUser({
        userId: id,
        firstProblemAt: this.convertTimestampToTimezoneDate(
          latestSubmission.timestamp,
          timezone,
        ),
        problemsSolved: newStreak,
        date: new Date(),
      });
    }

    // Update user with new streak
    const updatedUser = await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: newStreak,
        lastProblemSolvedAt: this.timestampToDate(latestSubmission.timestamp),
      },
    });

    return updatedUser;
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
    if(users.length === 0) {
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

    return "Streaks updated for all users";

  }
  @Cron('59 23 * * *')  // A las 11:59 PM todos los días
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

    const processedDays = new Set<string>();
    let currentStreakCount = 0;
    let lastProcessedTs = submissions[submissions.length - 1]?.timestamp || 0;
    let firstProblemAtTs = 0;
    let numProblemsSolved = 0;

    for (let i = submissions.length - 1; i >= 0; i--) {
      const submission = submissions[i];

      await this.submissionService.createUserSubmission(user.id, submission);

      const submissionDay = this.formatZonedDateDay(
        this.convertTimestampToZonedDate(submission.timestamp, timeZone),
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
        firstProblemAtTs = submission.timestamp;
      } else if (
        this.isNextDay(submission.timestamp, lastProcessedTs, timeZone)
      ) {
        numProblemsSolved++;
        currentStreakCount++;
        lastProcessedTs = submission.timestamp;
      } else {
        currentStreakCount = 1;
        numProblemsSolved = 1;
        firstProblemAtTs = submission.timestamp;
        lastProcessedTs = submission.timestamp;
      }
      if (currentStreakCount > 0) {
        await this.createStreakHistoryForUser({
          userId: id,
          firstProblemAt: this.convertTimestampToTimezoneDate(
            firstProblemAtTs,
            timeZone,
          ),
          problemsSolved: currentStreakCount,
          date: timestampToDate(lastProcessedTs),
        });
      }
      console.log('---Current Streak Count:', currentStreakCount);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: currentStreakCount,
        lastProblemSolvedAt: this.timestampToDate(submissions[0].timestamp),
      },
    });

    return updatedUser;
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

  resetStreakByUserId(id: string) {
    return `This action resets the streak for user with id: ${id}`;
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

  private convertTimestampToTimezoneDate(
    timestampInSeconds: number,
    timezone: string,
  ): string {
    const date = new Date(timestampInSeconds * 1000);
    const zonedDate = toZonedTime(date, timezone);
    return format(zonedDate, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone: timezone });
  }

  private convertTimestampToZonedDate(
    timestampInSeconds: number,
    timezone: string,
  ): Date {
    const date = new Date(timestampInSeconds * 1000);
    console.log('Timezone:', timezone);

    const zonedDate = toZonedTime(date, timezone);
    console.log(
      'Formatted in timezone:',
      format(zonedDate, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: timezone }),
    );

    return zonedDate;
  }

  private formatZonedDateDay(date: Date, timezone: string): string {
    return format(date, 'yyyy-MM-dd', { timeZone: timezone });
  }

  private isSameDay(tsA: number, tsB: number, timezone: string): boolean {
    const a = this.convertTimestampToZonedDate(tsA, timezone);
    const b = this.convertTimestampToZonedDate(tsB, timezone);
    return (
      this.formatZonedDateDay(a, timezone) ===
      this.formatZonedDateDay(b, timezone)
    );
  }

  private isPreviousDay(
    submissionTs: number,
    lastSolvedTs: number,
    timezone: string,
  ): boolean {
    const subDay = this.formatZonedDateDay(
      this.convertTimestampToZonedDate(submissionTs, timezone),
      timezone,
    );
    console.log('Submission Day:', subDay);
    const prevDay = this.formatZonedDateDay(
      addDays(this.convertTimestampToZonedDate(lastSolvedTs, timezone), -1),
      timezone,
    );
    console.log('Previous Day:', prevDay);
    return subDay === prevDay;
  }

  private timestampToDate(timestamp: number): Date {
    return new Date(timestamp * 1000);
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
    const subDay = this.formatZonedDateDay(
      this.convertTimestampToZonedDate(submissionTs, timezone),
      timezone,
    );
    const nextDay = this.formatZonedDateDay(
      addDays(this.convertTimestampToZonedDate(lastSolvedTs, timezone), 1), // +1 en lugar de -1
      timezone,
    );
    return subDay === nextDay;
  }
}
