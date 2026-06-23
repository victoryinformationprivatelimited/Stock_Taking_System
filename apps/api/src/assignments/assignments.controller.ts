import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitCountDto } from './dto/submit-count.dto';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { RequestUser } from '../common/tenant-context';

@Controller('assignments')
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return user.role === 'MANAGER'
      ? this.assignmentsService.findAllForManager()
      : this.assignmentsService.findMineAsCounter();
  }

  @Post(':id/counts')
  @Roles(UserRole.COUNTER)
  submitCount(@Param('id') id: string, @Body() dto: SubmitCountDto) {
    return this.assignmentsService.submitCount(id, dto);
  }

  @Post(':id/counts/:countId/approve')
  @Roles(UserRole.MANAGER)
  approve(@Param('id') id: string, @Param('countId') countId: string) {
    return this.assignmentsService.approve(id, countId);
  }

  @Post(':id/counts/:countId/request-recount')
  @Roles(UserRole.MANAGER)
  requestRecount(@Param('id') id: string, @Param('countId') countId: string) {
    return this.assignmentsService.requestRecount(id, countId);
  }
}
