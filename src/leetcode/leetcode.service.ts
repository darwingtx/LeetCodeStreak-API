import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GET_USER_PROFILE, GET_USER_PROFILE_MINIMAL, GET_RECENT_AC_SUBMISSIONS } from './leetcode.queries';
import { MatchedUser, Submission } from '../user/userTypes';

/**
 * Service to interact with the LeetCode GraphQL API.
 */
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

  /**
   * Fetches the full profile of a user from LeetCode.
   * @param username - LeetCode username.
   */
  async getProfileByUsername(username: string): Promise<MatchedUser> {
    return this.executeQuery<MatchedUser>(GET_USER_PROFILE, { username }, 'matchedUser');
  }

  /**
   * Fetches a minimal version of a user's profile from LeetCode.
   * @param username - LeetCode username.
   */
  async getMinimalProfileByUsername(username: string): Promise<MatchedUser> {
    return this.executeQuery<MatchedUser>(GET_USER_PROFILE_MINIMAL, { username }, 'matchedUser');
  }

  /**
   * Fetches the most recent accepted (AC) submissions for a given user.
   * @param username - LeetCode username.
   * @param limit - Maximum number of submissions to fetch.
   */
  async getRecentAcSubmissions(username: string, limit: number): Promise<Submission[]> {
    return this.executeQuery<Submission[]>(GET_RECENT_AC_SUBMISSIONS, { username, limit }, 'recentAcSubmissionList');
  }

  /**
   * Internal helper to execute a GraphQL query against the LeetCode API.
   * @param query - The GraphQL query string.
   * @param variables - Object containing query variables.
   * @param dataKey - The key in the JSON response where the requested data is located.
   */
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
