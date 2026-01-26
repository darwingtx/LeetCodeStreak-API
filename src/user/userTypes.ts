/**
 * Basic profile information retrieved from LeetCode.
 */
export interface UserDataProfile {
  aboutMe?: string | null;
  company?: string | null;
  countryName?: string | null;
  realName?: string | null;
  birthday?: string | null;
  userAvatar?: string | null;
  ranking?: number | null;
  reputation?: number | null;
  school?: string | null;
  skillTags?: string[] | null;
  websites?: string[] | null;
}

/**
 * Represents a user's current streak status.
 */
export interface UserStreak {
  id: string;
  currentStreak: number;
  lastProblemSolvedAt: Date | null;
  longestStreak: number;
  timezone: string | null;
}

/**
 * Details of a single problem submission from LeetCode.
 */
export interface Submission {
  title: string;
  titleSlug: string;
  timestamp: number;
  statusDisplay: string;
  lang: string;
}

/**
 * Historical record of problems solved by a user on a specific day.
 */
export interface StreakHistory {
  userId: string;
  firstProblemAt: string;
  problemsSolved: number;
  date: Date;
}

/**
 * Count of questions solved per difficulty level.
 */
interface DifficultyCount {
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard' | string;
  count: number;
}

export default DifficultyCount;

/**
 * Statistics regarding user contributions.
 */
export interface Contributions {
  points: number;
  questionCount: number;
  testcaseCount: number;
}

/**
 * Represents a badge earned by a user on LeetCode.
 */
export interface Badge {
  id: string;
  displayName: string;
  icon: string;
  creationDate?: string | null;
}

/**
 * Information about an upcoming badge a user might earn.
 */
export interface UpcomingBadge {
  name: string;
  icon: string;
}

/**
 * Specific submission statistics including counts and total attempts.
 */
export interface SubmitStatItem {
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard' | string;
  count: number;
  submissions: number;
}

/**
 * Collection of submission statistics.
 */
export interface SubmitStats {
  acSubmissionNum?: SubmitStatItem[] | null;
}

/**
 * Extended user profile including star rating.
 */
export interface MatchedUserProfile extends UserDataProfile {
  starRating?: number | null;
}

/**
 * The main user object returned by the LeetCode GraphQL API.
 */
export interface MatchedUser {
  username: string;
  githubUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  contributions?: Contributions | null;
  profile?: MatchedUserProfile | null;
  badges?: Badge[] | null;
  upcomingBadges?: UpcomingBadge[] | null;
  activeBadge?: Badge | null;
  submitStats?: SubmitStats | null;
}

/**
 * Response structure for the user profile query.
 */
export interface GetUserProfileResponse {
  allQuestionsCount: DifficultyCount[];
  matchedUser: MatchedUser | null;
}

/**
 * Wrapper for the GraphQL response containing user profile data.
 */
export interface GetUserProfileGraphQLResponse {
  data: GetUserProfileResponse;
}
