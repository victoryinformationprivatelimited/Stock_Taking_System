import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LogsService } from './logs.service';
import { CreateErrorLogDto } from './dto/create-error-log.dto';
import { Roles } from '../common/roles.decorator';

@Controller('logs')
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get('audit')
  @Roles(UserRole.MANAGER)
  findAuditLogs(@Query('entityType') entityType?: string) {
    return this.logsService.findAuditLogs({ entityType });
  }

  @Get('errors')
  @Roles(UserRole.MANAGER)
  findErrorLogs(@Query('severity') severity?: string) {
    return this.logsService.findErrorLogs({ severity });
  }

  @Post('errors')
  createErrorLog(@Body() dto: CreateErrorLogDto) {
    return this.logsService.createErrorLog(dto);
  }
}
