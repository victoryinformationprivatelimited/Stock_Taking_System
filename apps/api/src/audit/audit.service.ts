import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
  ) {}

  async log(action: string, entityType: string, entityId: string, payload?: unknown) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        actorId: this.tenantContext.userId,
        action,
        entityType,
        entityId,
        payload: payload ? (payload as any) : undefined,
      },
    });
  }
}
