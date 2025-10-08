import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {

    constructor(private userService: UserService) {
        this.userService = userService;
    }

    @Get('/profile/:id')
    getProfile(@Param('id') id: string) {
        return this.userService.getUserProfile(id);
    }
}
