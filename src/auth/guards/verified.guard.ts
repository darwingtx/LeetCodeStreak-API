import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard that ensures only verified users can access protected resources.
 * Must be used after JwtAuthGuard to have access to req.user.
 * Usage: @UseGuards(JwtAuthGuard, VerifiedGuard)
 */
@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.isVerified) {
      throw new ForbiddenException(
        'Account not verified. Please verify your LeetCode profile ownership first.',
      );
    }

    return true;
  }
}
