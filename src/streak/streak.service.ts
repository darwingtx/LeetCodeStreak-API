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
        const streakIncrement = await this.processSubmissionsForStreakIncrement(
          user.id,
          submissions,
          getIANATimezone(user.timezone),
          streak,
          dateToTimestamp(user.lastProblemSolvedAt) || 0,
          firstProblemAtTs
        );
        streak += streakIncrement;
      }
    } else {
      // Si no hay racha actual, procesar normalmente desde cero
      streak = await this.processSubmissionsAndUpdateStreak(
        user.id,
        submissions,
        getIANATimezone(user.timezone),
        0,
        0
      );
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
      user.currentStreak,
      0
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

  /**
   * Verifica incrementos en la racha basándose en nuevas submissions
   * Retorna solo el incremento/decremento, no el valor total
   */
  private async processSubmissionsForStreakIncrement(
    userId: string,
    submissions: Submission[],
    timeZone: string,
    currentStreakCount: number,
    lastProblemSolvedAt: number,
    firstProblemAtTs: number,
  ): Promise<number> {
    const processedDays = new Set<string>();
    let lastProcessedTs = lastProblemSolvedAt;
    let streakIncrement = 0;
    let tempStreakCount = currentStreakCount;
    let firstProblemAtTsLocal: number = firstProblemAtTs;
    let streakWasReset = false;
    let numProblemsSolved = 0;

    // Filtrar solo submissions nuevas (posteriores a lastProblemSolvedAt)
    const newSubmissions = submissions.filter(
      (sub) => sub.timestamp > lastProblemSolvedAt
    );

    if (newSubmissions.length === 0) {
      return 0; // No hay nuevas submissions
    }

    for (let i = newSubmissions.length - 1; i >= 0; i--) {
      const submission = newSubmissions[i];

      await this.submissionService.createUserSubmission(userId, submission);

      const submissionDay = formatZonedDateDay(
        convertTimestampToZonedDate(submission.timestamp, timeZone),
        timeZone,
      );

      // Si ya procesamos este día, solo actualizamos el timestamp
      if (processedDays.has(submissionDay)) {
        lastProcessedTs = submission.timestamp;
        numProblemsSolved++;
        continue;
      }

      processedDays.add(submissionDay);

      // Verificar si es el día siguiente
      if (this.isNextDay(submission.timestamp, lastProcessedTs, timeZone)) {
        tempStreakCount++;
        streakIncrement++;
        numProblemsSolved++;
        lastProcessedTs = submission.timestamp;
      } else if (
        !this.isSameDay(submission.timestamp, lastProcessedTs, timeZone)
      ) {
        // La racha se rompió
        streakWasReset = true;
        tempStreakCount = 1;
        streakIncrement = 1 - currentStreakCount; // Reseteo
        firstProblemAtTsLocal = submission.timestamp;
        lastProcessedTs = submission.timestamp;
      } else {
        // Mismo día, no incrementa
        lastProcessedTs = submission.timestamp;
        numProblemsSolved++;
      }

      // Actualizar streak history
      await this.createStreakHistoryForUser({
        userId: userId,
        firstProblemAt: convertTimestampToTimezoneDate(
          firstProblemAtTsLocal,
          timeZone,
        ),
        problemsSolved: numProblemsSolved,
        date: timestampToDate(lastProcessedTs),
      });

      console.log('---Streak Increment:', streakIncrement, 'New Total:', tempStreakCount);
    }

    return streakIncrement;
  }

  /**
   * Verifica y actualiza la racha basándose en las submissions
   * Retorna el valor total actualizado de la racha
   */
  private async processSubmissionsAndUpdateStreak(
    userId: string,
    submissions: Submission[],
    timeZone: string,
    currentStreakCount: number,
    lastProblemSolvedAt: number,
    firstProblemAtTs?: number,
  ): Promise<number> {
    const processedDays = new Set<string>();
    let lastProcessedTs = lastProblemSolvedAt;
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
          problemsSolved: numProblemsSolved,
          date: timestampToDate(lastProcessedTs),
        });
      }
      console.log('---Current Streak Count:', currentStreakCount);
    }

    return currentStreakCount;
  }  async createStreakHistoryForUser(streakHistory: StreakHistory) {
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

  private isSameDay(
    timestampA: number,
    timestampB: number,
    timezone: string,
  ): boolean {
    const dayA = formatZonedDateDay(
      convertTimestampToZonedDate(timestampA, timezone),
      timezone,
    );
    const dayB = formatZonedDateDay(
      convertTimestampToZonedDate(timestampB, timezone),
      timezone,
    );
    return dayA === dayB;
  }

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
      throw new Error(`User with id ${userId} not found`);
    }

    const userSubmissions = await this.prisma.userSubmission.findMany({
      where: { userId: userId },
      orderBy: { submittedAt: 'desc' },
    });

    
    const submissions: Submission[] = userSubmissions.map((sub) => ({
      title: sub.title,
      titleSlug: sub.titleSlug,
      timestamp: dateToTimestamp(sub.submittedAt) ?? 0,
      statusDisplay: sub.statusDisplay,
      lang: sub.language,
    }));

    const streak = await this.processSubmissionsAndUpdateStreak(
      user.id,
      submissions,
      getIANATimezone(user.timezone),
      0,
      0, 
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: streak,
        lastProblemSolvedAt:
          submissions.length > 0
            ? timestampToDate(submissions[0].timestamp)
            : user.lastProblemSolvedAt,
      },
    });

    

    return streak;
  }
}
