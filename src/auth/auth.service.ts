import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

/**
 * JWT payload structure.
 */
interface JwtPayload {
  sub: string; // user id
  username: string;
  isVerified: boolean;
}

/**
 * Authentication response with tokens.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    isVerified: boolean;
  };
}

/**
 * Service providing authentication logic with JWT and refresh tokens.
 */
@Injectable()
export class AuthService {
  // Token expiration times
  private readonly ACCESS_TOKEN_EXPIRY = '30m';
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private userService: UserService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Handles user login. Creates user if not exists, then issues tokens.
   * @param username - The LeetCode username.
   * @returns Authentication tokens and user data.
   */
  async login(username: string): Promise<AuthResponse> {
    let user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      // Create a new user if not found locally
      user = await this.userService.createUser(username);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.username, user.isVerified);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * Refreshes the access token using a valid refresh token.
   * @param refreshToken - The refresh token string.
   * @returns New access and refresh tokens.
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke the old refresh token (rotation)
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.username,
      storedToken.user.isVerified,
    );

    return {
      ...tokens,
      user: {
        id: storedToken.user.id,
        username: storedToken.user.username,
        isVerified: storedToken.user.isVerified,
      },
    };
  }

  /**
   * Revokes a refresh token (logout).
   * @param refreshToken - The refresh token to revoke.
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * Generates access and refresh tokens for a user.
   */
  private async generateTokens(
    userId: string,
    username: string,
    isVerified: boolean,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: userId,
      username,
      isVerified,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    // Generate secure random refresh token
    const refreshToken = randomBytes(64).toString('hex');

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Validates a JWT payload and returns the user.
   * Used by JWT strategy.
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
