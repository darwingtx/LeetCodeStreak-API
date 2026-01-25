import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { MatchedUser } from './userTypes';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { getUTCOffset } from '../Utils/Time';
import { LeetcodeService } from '../leetcode/leetcode.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private prisma: PrismaService,
    private leetcodeService: LeetcodeService,
  ) {}

  async getProfileByUsername(username: string): Promise<MatchedUser> {
    return this.leetcodeService.getProfileByUsername(username);
  }

  async createUser(username: string) {
    const matchedUser = await this.leetcodeService.getMinimalProfileByUsername(username);

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

  async updateUserProfile(username: string, timeZone: string) {
    this.logger.log(`Updating user profile for: ${username}`);
    const profile = await this.getProfileByUsername(username);

    const data = {
      username: profile.username,
      githubUrl: profile.githubUrl,
      twitterUrl: profile.twitterUrl,
      linkedinUrl: profile.linkedinUrl,
      realName: profile.profile?.realName,
      profilePictureUrl: profile.profile?.userAvatar,
      birthday: profile.profile?.birthday
        ? new Date(profile.profile?.birthday)
        : null,
      ranking: profile.profile?.ranking ?? null,
      reputation: profile.profile?.reputation ?? 0,
      websiteUrl: profile.profile?.websites ?? [],
      countryName: profile.profile?.countryName,
      company: profile.profile?.company,
      school: profile.profile?.school,
      skillTags: profile.profile?.skillTags ?? [],
      aboutMe: profile.profile?.aboutMe,
      profileUrl: `https://leetcode.com/${username}`,
      totalSubmissions: profile.submitStats?.acSubmissionNum?.[0]?.submissions ?? 0,
      updatedAt: new Date(),
      timezone: getUTCOffset(timeZone),
      totalProblemsSolved: profile.submitStats?.acSubmissionNum?.[0]?.count ?? 0,
    };

    try {
      const upserted = await this.prisma.user.upsert({
        where: { username: profile.username }, // ← cambiar aquí
        update: data,
        create: data as any,
      });

      return upserted;
    } catch (err) {
      if (err && err.code === 'P2025') {
        throw new NotFoundException(
          `Prisma P2025: failed to update or create user with username=${username}. Original message: ${err.message}`,
        );
      }
      throw err;
    }
  }

}
