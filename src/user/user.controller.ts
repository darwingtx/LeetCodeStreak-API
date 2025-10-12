import { Controller, Get, Param, Patch } from '@nestjs/common';
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
    updateUser(@Param('username') username: string) {
        return this.userService.updateUserProfile(username);
    }
}
