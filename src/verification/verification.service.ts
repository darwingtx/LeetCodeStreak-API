import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeetcodeService } from 'src/leetcode/leetcode.service';

/**
 * Service handling LeetCode profile verification.
 * Users must place a generated code in their LeetCode bio to prove account ownership.
 */
@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private leetcodeService: LeetcodeService,
  ) { }

  /**
   * Generates a unique verification code for a user and stores it in the database.
   * The user must place this code in their LeetCode bio to verify ownership.
   * @param username - The LeetCode username to generate a code for.
   * @returns The generated verification code (format: LEETSTRK-XXXX).
   */
  async generateCode(username: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    // Generate a unique code in format LEETSTRK-XXXX (5 alphanumeric characters)
    const code = `LEETSTRK-${this.generateRandomString(5)}`;

    await this.prisma.user.update({
      where: { username },
      data: { verificationCode: code },
    });

    return code;
  }

  /**
   * Verifies the user's LeetCode profile by checking if the verification code
   * is present in their bio.
   * @param username - The LeetCode username to verify.
   * @returns True if verification successful.
   * @todo Implementation pending - user will complete this method.
   */
  async verifyProfile(username: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    if (!user.verificationCode) {
      throw new Error('Verification code not generated for this user');
    }

    const bio = await this.leetcodeService.getUserVerificationCode(username);

    // Check if the code is present in the bio
    const isVerified = bio.includes(user.verificationCode);

    if (isVerified) {
      await this.prisma.user.update({
        where: { username },
        data: { isVerified: true },
      });
    }

    return isVerified;
  }

  /**
   * Generates a random alphanumeric string of specified length.
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
