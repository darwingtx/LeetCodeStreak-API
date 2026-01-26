/**
 * GraphQL query to fetch a comprehensive user profile from LeetCode.
 * Includes matchedUser, contributions, profile details, badges, and submission stats.
 */
export const GET_USER_PROFILE = `#graphql
  query getUserProfile($username: String!) {
      matchedUser(username: $username) {
          username
          githubUrl
          twitterUrl
          linkedinUrl
          contributions {
              points
              questionCount
              testcaseCount
          }
          profile {
              realName
              userAvatar
              birthday
              ranking
              reputation
              websites
              countryName
              company
              school
              skillTags
              aboutMe
              starRating
          }
          badges {
              id
              displayName
              icon
              creationDate
          }
          upcomingBadges {
              name
              icon
          }
          activeBadge {
              id
              displayName
              icon
              creationDate
          }
          submitStats {
              acSubmissionNum {
                  difficulty
                  count
                  submissions
              }
          }
      }
  }`;

/**
 * GraphQL query to fetch a minimal user profile from LeetCode.
 * Filters out some nested fields for improved performance.
 */
export const GET_USER_PROFILE_MINIMAL = `#graphql
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      githubUrl
      twitterUrl
      linkedinUrl
      contributions {
        points
        questionCount
        testcaseCount
      }
      profile {
        realName
        userAvatar
        birthday
        ranking
        reputation
        websites
        countryName
        company
        school
        skillTags
        aboutMe
        starRating
      }
      badges {
        id
        displayName
        icon
        creationDate
      }
      activeBadge {
        id
        displayName
        icon
        creationDate
      }
    }
  }
`;

/**
 * GraphQL query to fetch the most recent accepted (AC) submissions for a user.
 */
export const GET_RECENT_AC_SUBMISSIONS = `#graphql
  query getACSubmissions ($username: String!, $limit: Int) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }`;
