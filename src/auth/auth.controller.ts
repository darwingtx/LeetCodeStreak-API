import { Controller, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Controller handling authentication-related requests.
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Performs a login operation for the specified LeetCode username.
   * @param username - The LeetCode username.
   * @returns Authentication result.
   */
  @Get('login/:username')
  login(@Param('username') username: string) {
    return this.authService.login(username);
  }
}
