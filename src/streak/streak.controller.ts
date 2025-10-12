import { Controller, Get, Param, Patch, Body, Post } from '@nestjs/common';
import { StreakService } from './streak.service';

@Controller('streak')
export class StreakController {

    constructor(private streakService: StreakService) {
        this.streakService = streakService;
    }

    @Get('/:id')
    getStreak(@Param('id') id: string) {
        return this.streakService.getStreakByUserId(id);
    }

    @Patch('/:id')
    updateStreak(@Param('id') id: string, @Body() body: { timezone: string }) {
        return this.streakService.updateStreakByUserId(id, body.timezone);
    }

    @Post('/:id/reset')
    resetStreak(@Param('id') id: string) {
        return this.streakService.resetStreakByUserId(id);
    }
}
