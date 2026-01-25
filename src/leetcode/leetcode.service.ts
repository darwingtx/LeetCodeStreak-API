import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GET_USER_PROFILE, GET_USER_PROFILE_MINIMAL, GET_RECENT_AC_SUBMISSIONS } from './leetcode.queries';
import { MatchedUser, Submission } from '../user/userTypes';

@Injectable()
export class LeetcodeService {
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('API_URL');
    if (!url) {
      throw new InternalServerErrorException(
        'API_URL environment variable is not defined',
      );
    }
    this.apiUrl = url;
  }

  async getProfileByUsername(username: string): Promise<MatchedUser> {
    return this.executeQuery<MatchedUser>(GET_USER_PROFILE, { username }, 'matchedUser');
  }

  async getMinimalProfileByUsername(username: string): Promise<MatchedUser> {
    return this.executeQuery<MatchedUser>(GET_USER_PROFILE_MINIMAL, { username }, 'matchedUser');
  }

  async getRecentAcSubmissions(username: string, limit: number): Promise<Submission[]> {
    return this.executeQuery<Submission[]>(GET_RECENT_AC_SUBMISSIONS, { username, limit }, 'recentAcSubmissionList');
  }

  private async executeQuery<T>(
    query: string,
    variables: Record<string, any>,
    dataKey: string,
  ): Promise<T> {
    const body = JSON.stringify({
      query,
      variables,
    });

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      throw new InternalServerErrorException(
          `Error in LeetCode API request: ${res.statusText}`,
      );
    }

    const data = await res.json();
    const result = data?.data?.[dataKey];

    if (!result) {
      throw new NotFoundException(
        `Data for ${dataKey} and user ${variables.username} not found in LeetCode API`,
      );
    }

    return result;
  }
}
