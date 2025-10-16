import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { toZonedTime, format } from 'date-fns-tz';
import { differenceInCalendarDays, addDays } from 'date-fns';
import { Submission } from 'src/user/userTypes';
import { last } from 'rxjs';

@Injectable()
export class StreakService {
  apiUrl: string | undefined;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
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
      variables: { username: user.username, limit: 30 },
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
    const submissions: Submission[] = data.data.recentAcSubmissionList;
    let newStreak: number = 0;
    let lastSolvedDate: number = submissions[0]?.timestamp || 0;
    const lastDate: number = submissions[0]?.timestamp || 0;
    for (const submission of submissions) {
      const submissionDate = this.convertTimestampToTimezoneDate(
        submission.timestamp,
        timezone,
      );
      if (this.isSameDay(submission.timestamp, lastSolvedDate, timezone)) {
        newStreak++;
      } else if (
        this.isPreviousDay(submission.timestamp, lastSolvedDate, timezone)
      ) {
        newStreak++;
        lastSolvedDate = submission.timestamp;
      }
    }
    console.log("--------------" + lastDate);
    console.log('Last solved date (timestamp):', lastSolvedDate);
    user = await this.prisma.user.update({
      where: { id: id },
      data: {
        currentStreak: newStreak,
        lastProblemSolvedAt: this.convertTimestampToZonedDate(lastDate, timezone),
      },
    });

    return user;
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

    console.log('Zoned Date:', zonedDate);
    return format(zonedDate, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone: timezone });
  }

private convertTimestampToZonedDate(
  timestampInSeconds: number,
  timezone: string,
): Date {
  const date = new Date(timestampInSeconds * 1000);
  console.log('Original UTC date:', date.toISOString());
  console.log('Timezone:', timezone);
  
  const zonedDate = toZonedTime(date, timezone);
  console.log('Zoned date (represents local time):', zonedDate.toISOString());
  console.log('Formatted in timezone:', format(zonedDate, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: timezone }));
  
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
}
