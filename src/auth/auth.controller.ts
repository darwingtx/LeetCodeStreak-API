import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerificationService } from '../verification/verification.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/**
 * Controller handling authentication-related requests.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
  ) {}

  /**
   * Performs a login operation for the specified LeetCode username.
   * @param username - The LeetCode username.
   * @returns Access token, refresh token, and user data.
   */
  @Get('login/:username')
  login(@Param('username') username: string) {
    return this.authService.login(username);
  }

  /**
   * Refreshes the access token using a valid refresh token.
   * @param dto - Contains the refresh token.
   * @returns New access and refresh tokens.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /**
   * Revokes a refresh token (logout).
   * @param dto - Contains the refresh token to revoke.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  /**
   * Generates a verification code for the user to place in their LeetCode bio.
   * @param username - The LeetCode username.
   * @returns The verification code.
   */
  @Post('verify/generate/:username')
  async generateVerificationCode(@Param('username') username: string) {
    const code = await this.verificationService.generateCode(username);
    return {
      code,
      instructions:
        'Place this code in your LeetCode profile bio, then call POST /auth/verify/:username to complete verification.',
    };
  }

  /**
   * Verifies the user's LeetCode profile ownership.
   * @param username - The LeetCode username to verify.
   */
  @Post('verify/:username')
  async verifyProfile(@Param('username') username: string) {
    const verified = await this.verificationService.verifyProfile(username);
    return { verified };
  }
}
