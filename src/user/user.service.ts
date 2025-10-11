import { Injectable } from '@nestjs/common';
import { UserDataProfile } from './userTypes';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {

  apiUrl: string | undefined;

  constructor(private configService: ConfigService, private prisma: PrismaService) {
    this.configService = configService;
    this.apiUrl = this.configService.get<string>('API_URL');
    this.prisma = prisma;
  }

  getUserProfile(username: string) {
    const urlUser = this.apiUrl + username;
    return fetch(urlUser).then((res) => res.json());
  }

  async getProfileByUsername(username: string): Promise<UserDataProfile> {
    if (!this.apiUrl) {
      throw new Error('API_URL environment variable is not defined');
    }

    const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
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
      }
    }
  `;

    const body = JSON.stringify({
      query,
      variables: { username },
    });

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      throw new Error(`Error en la request: ${res.statusText}`);
    }

    const data = await res.json();
    return data.data.matchedUser.profile as UserDataProfile;
  }

  async createUser(username: string) {
    if (!this.apiUrl) {
      throw new Error('API_URL environment variable is not defined');
    }

    const query = `
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

   const body = JSON.stringify({
      query,
      variables: { username },
    });

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      throw new Error(`Error en la request: ${res.statusText}`);
    }

    const { data } = await res.json();
    const matchedUser = data?.matchedUser;
    if (!matchedUser) {
      throw new Error(`No se encontró el usuario ${username} en la API externa`);
    }

    const profile = matchedUser.profile ?? {};

    const userData = {
      username: matchedUser.username,
      githubUrl: matchedUser.githubUrl,
      twitterUrl: matchedUser.twitterUrl,
      linkedinUrl: matchedUser.linkedinUrl,
      realName: profile.realName,
      profilePictureUrl: profile.userAvatar,
      birthday: profile.birthday ? new Date(profile.birthday) : null,
      ranking: profile.ranking ?? null,
      reputation: profile.reputation ?? 0,
      websiteUrl: profile.websites ?? [],
      countryName: profile.countryName,
      company: profile.company,
      school: profile.school,
      skillTags: profile.skillTags ?? [],
      aboutMe: profile.aboutMe,
    };

    const user = await this.prisma.user.create({
      data: userData,
    });

    return user;
  }
}
