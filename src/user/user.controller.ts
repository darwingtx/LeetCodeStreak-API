import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UserService } from './user.service';
import { UserIdDto } from './DTO/user.dto';

/**
 * Controller handling user-related operations such as profile retrieval and updates.
 */
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Retrieves the profile information for a user by their ID.
   * @param params - DTO containing the user ID.
   * @returns User profile data.
   */
  @Get('/profile/:id')
  getProfile(@Param() params: UserIdDto) {
    return this.userService.getUserById(params.id);
  }

  /**
   * Updates a user's profile information, specifically their timezone.
   * @param username - The LeetCode username of the user.
   * @param body - Object containing the new timezone.
   * @returns The updated user record.
   */
  @Patch('update/:username')
  updateUser(
    @Param('username') username: string,
    @Body() body: { timezone: string },
  ) {
    return this.userService.updateUserProfile(username, body.timezone);
  }
}
