import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import StreakService from './streak.service';

@Controller('streak')
export class StreakController {
  constructor(private streakService: StreakService) {
    this.streakService = streakService;
  }

  @Get('/:id')
  getStreak(@Param('id') id: string) {
    return this.streakService.getStreakByUserId(id);
  }

  @Patch('update/:id')
  updateStreak(@Param('id') id: string, @Body() body: { timezone: string }) {
    return this.streakService.updateStreakByUserId(id);
  }

  @Post('/:id/reset')
  resetStreak(@Param('id') id: string) {
    return this.streakService.resetStreakByUserId(id);
  }

  @Patch('updateall/:id')
  updateAllStreak(@Param('id') id: string, @Body() body: { timezone: string }) {
    return this.streakService.updateAllStreakUser(id, body.timezone);
  }

  @Post('updatebd/:id')
  updateStreakBD(@Param('id') id: string) {
    return this.streakService.updateStreakBD(id);
  }

  @Patch('updateallusers')
  updateStreakAllUsers() {
    return this.streakService.updateStreaksForAllUsers();
  }
}
