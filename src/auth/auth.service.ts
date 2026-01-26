import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service providing authentication logic.
 */
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private prisma: PrismaService,
  ) {}

  /**
   * Handles user login. If the user doesn't exist in the local database, 
   * it triggers the creation of a new user record.
   * @param username - The LeetCode username.
   * @returns The user record from the database.
   */
  async login(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    
    if (user) {
      return user;
    }

    // Create a new user if not found locally
    const userProfile = await this.userService.createUser(username);
    return userProfile;
  }
}
