import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { toZonedTime, format } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { StreakHistory, Submission } from 'src/user/userTypes';
import { SubmissionService } from 'src/submission/submission.service';
import { ConfigService } from '@nestjs/config';

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
    if (!streak) {
      throw new Error(`User with id ${id} not found`);
    }
    return streak;
  }

  async updateStreakByUserId(id: string, timezone: string) {
    let user = await this.prisma.user.findUnique({
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

    let streak = user.currentStreak;
    

    // Get latest AC submissions
    const data = await this.queryACSubmissions(user.username!, 1);
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
        ? Math.floor(latest.firstProblemAt.getTime() / 1000)
        : 0;
    }
    const lastSolvedTs = this.dateToTimestamp(user.lastProblemSolvedAt) || 0;

    // Check if we already processed this problem today
    if (this.isSameDay(latestSubmission.timestamp, Date.now() / 1000, timezone)) {
      // Check if it's exactly the same problem we already saved
      if (lastSolvedTs === latestSubmission.timestamp) {
        return user;
      } else {
        // Different problem solved today, save and update lastProblemSolvedAt
        await this.submissionService.createUserSubmission(user.id!, latestSubmission);
        
        const updatedUser = await this.prisma.user.update({
          where: { id: id },
          data: {
            lastProblemSolvedAt: this.timestampToDate(latestSubmission.timestamp),
          },
        });
        
        return updatedUser;
      }
    }

    // Save the new submission
    await this.submissionService.createUserSubmission(user.id!, latestSubmission);

    let newStreak = user.currentStreak;
    let shouldUpdateHistory = false;

    if (lastSolvedTs === 0) {
      // First submission ever
      newStreak = 1;
      shouldUpdateHistory = true;
    } else if (this.isSameDay(latestSubmission.timestamp, lastSolvedTs, timezone)) {
      // Same day, keep streak (submission already saved)
      return user;
    } else if (this.isPreviousDay(latestSubmission.timestamp, lastSolvedTs, timezone)) {
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

  updateStreaksForAllUsers() { }

  async updateAllStreakUser(id: string, timeZone: string) {
    let user = await this.prisma.user.findUnique({
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

    const data = await this.queryACSubmissions(user.username!, 30);
    const submissions: Submission[] = data.data.recentAcSubmissionList;

    if (submissions.length === 0) {
      return user;
    }

    const processedDays = new Set<string>();
    let currentStreakCount = 0;
    let lastProcessedTs = 0;
    let firstProblemAtTs = 0; 
    
    for (let i = submissions.length - 1; i >= 0; i--) {
      const submission = submissions[i];

      await this.submissionService.createUserSubmission(user.id!, submission);

      const submissionDay = this.formatZonedDateDay(
        this.convertTimestampToZonedDate(submission.timestamp, timeZone),
        timeZone,
      );

      if (processedDays.has(submissionDay)) {
        continue;
      }

      processedDays.add(submissionDay);

      if (currentStreakCount === 0) {
        currentStreakCount = 1;
        lastProcessedTs = submission.timestamp;
        firstProblemAtTs = submission.timestamp; // ✅ Actualizar aquí
      } else if (
        this.isPreviousDay(submission.timestamp, lastProcessedTs, timeZone)
      ) {
        currentStreakCount++;
        lastProcessedTs = submission.timestamp;
      } else {
        break;
      }
    }

    // Save streak history only if there's an active streak
    if (currentStreakCount > 0) {
      await this.createStreakHistoryForUser({
        userId: id,
        firstProblemAt: this.convertTimestampToTimezoneDate(
          firstProblemAtTs,
          timeZone,
        ),
        problemsSolved: currentStreakCount,
        date: new Date(),
      });
    }

    // Actualizar usuario con el nuevo streak
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
    let streak = await this.prisma.streakHistory.create({
      data: {
        userId: streakHistory.userId,
        firstProblemAt: streakHistory.firstProblemAt,
        problemsSolved: streakHistory.problemsSolved,
        date: streakHistory.date,
      },
    });
    return streak;
  }

    async getLatestFirstProblemAtForUser(userId: string) {
      return await this.prisma.streakHistory.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        select: {
          firstProblemAt: true,
        },
      });
    }

  resetStreakByUserId(id: string) {
    return `This action resets the streak for user with id: ${id}`;
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
    const prevDay = this.formatZonedDateDay(
      addDays(this.convertTimestampToZonedDate(lastSolvedTs, timezone), -1),
      timezone,
    );
    return subDay === prevDay;
  }

  private dateToTimestamp(date: Date | null): number | null {
    return date ? Math.floor(date.getTime() / 1000) : null;
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
}
