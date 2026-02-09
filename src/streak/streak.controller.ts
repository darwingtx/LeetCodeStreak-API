import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { StreakService } from './streak.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('streak')
export class StreakController {
  constructor(private streakService: StreakService) {
    this.streakService = streakService;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:id')
  getStreak(@Param('id') id: string) {
    return this.streakService.getStreakByUserId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
  updateStreak(@Param('id') id: string, @Body() body: { timezone: string }) {
    return this.streakService.updateStreakByUserId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:id/reset')
  resetStreak(@Param('id') id: string) {
    return this.streakService.resetStreakByUserId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('updateall/:id')
  updateAllStreak(@Param('id') id: string, @Body() body: { timezone: string }) {
    return this.streakService.updateAllStreakUser(id, body.timezone);
  }

  @UseGuards(JwtAuthGuard)
  @Post('updatebd/:id')
  updateStreakBD(@Param('id') id: string) {
    return this.streakService.updateStreakBD(id);
  }

  // Endpoints públicos (sin autenticación)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('updateallusers')
  updateStreakAllUsers() {
    return this.streakService.updateStreaksForAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('fix-problems-count')
  fixProblemsCount() {
    return this.streakService.fixStreakHistoryProblemsCount();
  }
}
