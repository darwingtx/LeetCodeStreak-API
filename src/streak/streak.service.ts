import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { toZonedTime, format } from 'date-fns-tz';
import { Submission } from 'src/user/userTypes';

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
    if (!user.lastProblemSolvedAt) {
      throw new Error(`User with id ${id} has not solved any problems yet`);
    }
    const lastSolvedDate = new Date(user.lastProblemSolvedAt);
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
    console.log('Last Solved Date (UTC):', lastSolvedDate.toISOString());
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
  }

  resetStreakByUserId(id: string) {
    return `This action resets the streak for user with id: ${id}`;
  }

  private convertTimestampToTimezoneDate(
    timestampInSeconds: number,
    timezone: string,
  ): string {
    // Convierte a milisegundos
    const date = new Date(timestampInSeconds * 1000);

    // Convierte la fecha UTC a la zona horaria indicada
    const zonedDate = toZonedTime(date, timezone);

    console.log('Zoned Date:', zonedDate);
    // Retorna un string legible, formateado a tu gusto
    return format(zonedDate, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone: timezone });
  }
}
