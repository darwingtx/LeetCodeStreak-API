import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProblemService } from './problem.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('problem')
export class ProblemController {

  constructor(private problemService: ProblemService) {}

  // UseGuards(JwtAuthGuard);
  // @Get('daily')
  // getDaily() {
  //   return this.problemService.getDaily();
  // }
}
