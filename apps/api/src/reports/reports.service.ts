import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
  ) {}

  async getMismatches() {
    const assignments = await this.prisma.countAssignment.findMany({
      where: { tenantId: this.tenantContext.tenantId },
      include: {
        product: true,
        counter: { select: { fullName: true, email: true } },
        countRecords: { orderBy: { attemptNumber: 'desc' }, take: 1 },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments
      .filter((a) => a.countRecords[0]?.result === 'MISMATCH')
      .map((a) => ({
        productCode: a.product.productCode,
        description: a.product.description,
        counter: a.counter.fullName,
        systemQty: a.countRecords[0].systemQtySnapshot,
        countedQty: a.countRecords[0].countedQty,
        attemptNumber: a.countRecords[0].attemptNumber,
        status: a.countRecords[0].status,
        assignmentStatus: a.status,
      }));
  }

  async getProductivity() {
    const counters = await this.prisma.user.findMany({
      where: { tenantId: this.tenantContext.tenantId, role: 'COUNTER' },
      include: {
        counterAssignments: {
          include: { countRecords: true },
        },
      },
    });

    return counters.map((counter) => {
      const assignments = counter.counterAssignments;
      const completed = assignments.filter((a) => a.status === 'DONE').length;
      const mismatches = assignments.filter((a) =>
        a.countRecords.some((r) => r.result === 'MISMATCH'),
      ).length;
      const totalAttempts = assignments.reduce((sum, a) => sum + a.countRecords.length, 0);
      const avgAttempts = assignments.length ? totalAttempts / assignments.length : 0;

      return {
        counter: counter.fullName,
        email: counter.email,
        totalAssignments: assignments.length,
        completed,
        mismatches,
        avgAttempts: Math.round(avgAttempts * 100) / 100,
      };
    });
  }

  async exportToExcel(type: 'mismatches' | 'productivity'): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();

    if (type === 'mismatches') {
      const rows = await this.getMismatches();
      const sheet = workbook.addWorksheet('Mismatches');
      sheet.columns = [
        { header: 'Product Code', key: 'productCode', width: 16 },
        { header: 'Description', key: 'description', width: 28 },
        { header: 'Counter', key: 'counter', width: 20 },
        { header: 'System Qty', key: 'systemQty', width: 12 },
        { header: 'Counted Qty', key: 'countedQty', width: 12 },
        { header: 'Attempt #', key: 'attemptNumber', width: 10 },
        { header: 'Count Status', key: 'status', width: 20 },
        { header: 'Assignment Status', key: 'assignmentStatus', width: 16 },
      ];
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true };
    } else if (type === 'productivity') {
      const rows = await this.getProductivity();
      const sheet = workbook.addWorksheet('Productivity');
      sheet.columns = [
        { header: 'Counter', key: 'counter', width: 20 },
        { header: 'Email', key: 'email', width: 24 },
        { header: 'Total Assignments', key: 'totalAssignments', width: 16 },
        { header: 'Completed', key: 'completed', width: 12 },
        { header: 'Mismatches', key: 'mismatches', width: 12 },
        { header: 'Avg Attempts', key: 'avgAttempts', width: 14 },
      ];
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true };
    } else {
      throw new BadRequestException('Unknown report type');
    }

    return workbook.xlsx.writeBuffer();
  }
}
