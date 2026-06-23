import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { CreateErrorLogDto } from './dto/create-error-log.dto';

@Injectable()
export class LogsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
  ) {}

  async findAuditLogs(params: { entityType?: string; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        ...(params.entityType ? { entityType: params.entityType } : {}),
      },
      include: { actor: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 200,
    });
  }

  async findErrorLogs(params: { severity?: string; take?: number }) {
    return this.prisma.errorLogEntry.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        ...(params.severity ? { severity: params.severity as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 200,
    });
  }

  async createErrorLog(dto: CreateErrorLogDto) {
    return this.prisma.errorLogEntry.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        source: dto.source,
        severity: dto.severity,
        message: dto.message,
        stack: dto.stack,
        context: dto.context as any,
      },
    });
  }
}
