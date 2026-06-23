import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { Roles } from '../common/roles.decorator';

@Controller('reports')
@Roles(UserRole.MANAGER)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('mismatches')
  getMismatches() {
    return this.reportsService.getMismatches();
  }

  @Get('productivity')
  getProductivity() {
    return this.reportsService.getProductivity();
  }

  @Get('export')
  async export(@Query('type') type: string, @Res() res: Response) {
    if (type !== 'mismatches' && type !== 'productivity') {
      throw new BadRequestException('type must be "mismatches" or "productivity"');
    }
    const buffer = await this.reportsService.exportToExcel(type);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}-report.xlsx"`,
    });
    res.send(buffer);
  }
}
