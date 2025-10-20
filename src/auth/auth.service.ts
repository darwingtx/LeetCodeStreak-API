import { Injectable } from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private prisma: PrismaService,
  ) {
    this.userService = userService;
    this.prisma = prisma;
  }

  async login(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    if (user) {
      return user;
    }
    const userProfile = await this.userService.createUser(username);
    return userProfile;
  }
}
