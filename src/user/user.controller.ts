import { Controller, Get, Param, Patch , Body} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {

    constructor(private userService: UserService) {
        this.userService = userService;
    }

    @Get('/profile/:id')
    getProfile(@Param('id') id: string) {
        return this.userService.getProfileByUsername(id);
    }

    @Patch('update/:username')
    updateUser(@Param('username') username: string, @Body() body: { timezone: string }) {
        return this.userService.updateUserProfile(username, body.timezone);
    }
}
