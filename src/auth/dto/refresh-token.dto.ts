import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for refresh token requests.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
