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

export interface Submission {
  title: string;
  titleSlug: string;
  timestamp: number;
  statusDisplay: string;
  lang: string;
}

export interface DifficultyCount {
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard' | string;
  count: number;
}

export interface Contributions {
  points: number;
  questionCount: number;
  testcaseCount: number;
}

export interface Badge {
  id: string;
  displayName: string;
  icon: string;
  creationDate?: string | null; // ISO timestamp string (may be omitted/null)
}

export interface UpcomingBadge {
  name: string;
  icon: string;
}

export interface SubmitStatItem {
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard' | string;
  count: number;
  submissions: number;
}

export interface SubmitStats {
  acSubmissionNum?: SubmitStatItem[] | null;
}

export interface MatchedUserProfile extends UserDataProfile {
  starRating?: number | null;
}

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

export interface GetUserProfileResponse {
  allQuestionsCount: DifficultyCount[];
  matchedUser: MatchedUser | null;
}

export interface GetUserProfileGraphQLResponse {
  data: GetUserProfileResponse;
}