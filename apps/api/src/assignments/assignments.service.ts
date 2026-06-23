import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitCountDto } from './dto/submit-count.dto';

const MAX_RECOUNT_ATTEMPTS = 3;

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
    private realtimeGateway: RealtimeGateway,
    private audit: AuditService,
  ) {}

  async create(dto: CreateAssignmentDto) {
    const tenantId = this.tenantContext.tenantId;

    const counter = await this.prisma.user.findFirst({
      where: { id: dto.counterId, tenantId, role: 'COUNTER', isActive: true },
    });
    if (!counter) {
      throw new BadRequestException('Counter user not found');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds }, tenantId },
    });
    if (products.length !== dto.productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    const created = await this.prisma.$transaction(
      products.map((product) =>
        this.prisma.countAssignment.create({
          data: {
            tenantId,
            managerId: this.tenantContext.userId,
            counterId: dto.counterId,
            productId: product.id,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          },
        }),
      ),
    );

    await this.audit.log('assignment.create', 'CountAssignment', counter.id, {
      counterId: dto.counterId,
      productIds: dto.productIds,
    });

    return created;
  }

  async findAllForManager() {
    return this.prisma.countAssignment.findMany({
      where: { tenantId: this.tenantContext.tenantId },
      include: {
        product: true,
        counter: { select: { id: true, fullName: true, email: true } },
        countRecords: { orderBy: { attemptNumber: 'desc' }, take: 1 },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async findMineAsCounter() {
    return this.prisma.countAssignment.findMany({
      where: { tenantId: this.tenantContext.tenantId, counterId: this.tenantContext.userId },
      include: {
        product: true,
        countRecords: { orderBy: { attemptNumber: 'desc' } },
      },
      orderBy: { assignedAt: 'asc' },
    });
  }

  async submitCount(assignmentId: string, dto: SubmitCountDto) {
    const tenantId = this.tenantContext.tenantId;
    const assignment = await this.prisma.countAssignment.findFirst({
      where: { id: assignmentId, tenantId, counterId: this.tenantContext.userId },
      include: { product: true, countRecords: true },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    if (assignment.status === 'DONE') {
      throw new BadRequestException('This assignment has already been completed');
    }

    const attemptNumber = assignment.countRecords.length + 1;
    if (attemptNumber > MAX_RECOUNT_ATTEMPTS) {
      throw new BadRequestException('Maximum recount attempts reached. Escalated to manager.');
    }

    const systemQty = Number(assignment.product.systemQty);
    const isMatch = dto.countedQty === systemQty;

    const countRecord = await this.prisma.countRecord.create({
      data: {
        assignmentId: assignment.id,
        attemptNumber,
        scannedBarcode: dto.scannedBarcode,
        barcodeValidated: dto.barcodeValidated,
        countedQty: dto.countedQty,
        systemQtySnapshot: systemQty,
        result: isMatch ? 'MATCH' : 'MISMATCH',
        status: attemptNumber >= MAX_RECOUNT_ATTEMPTS && !isMatch
          ? 'REJECTED_MAX_ATTEMPTS'
          : 'PENDING_APPROVAL',
        submittedById: this.tenantContext.userId,
      },
    });

    await this.prisma.countAssignment.update({
      where: { id: assignment.id },
      data: { status: 'IN_PROGRESS' },
    });

    this.realtimeGateway.emitCountUpdated(tenantId, {
      assignmentId: assignment.id,
      productId: assignment.productId,
    });

    return countRecord;
  }

  async approve(assignmentId: string, countRecordId: string) {
    const { assignment, countRecord } = await this.assertManagedCountRecord(assignmentId, countRecordId);

    const updated = await this.prisma.countRecord.update({
      where: { id: countRecord.id },
      data: {
        status: 'APPROVED',
        approvedById: this.tenantContext.userId,
        approvedAt: new Date(),
      },
    });

    await this.prisma.countAssignment.update({
      where: { id: assignmentId },
      data: { status: 'DONE' },
    });

    this.realtimeGateway.emitCountUpdated(this.tenantContext.tenantId, {
      assignmentId,
      productId: assignment.productId,
    });

    await this.audit.log('count.approve', 'CountRecord', countRecord.id, { assignmentId });

    return updated;
  }

  async requestRecount(assignmentId: string, countRecordId: string) {
    const { assignment, countRecord } = await this.assertManagedCountRecord(assignmentId, countRecordId);

    if (countRecord.attemptNumber >= MAX_RECOUNT_ATTEMPTS) {
      throw new BadRequestException('Maximum recount attempts already reached');
    }

    const updated = await this.prisma.countRecord.update({
      where: { id: countRecord.id },
      data: {
        status: 'RECOUNT_REQUESTED',
        approvedById: this.tenantContext.userId,
        approvedAt: new Date(),
      },
    });

    await this.prisma.countAssignment.update({
      where: { id: assignmentId },
      data: { status: 'PENDING' },
    });

    this.realtimeGateway.emitCountUpdated(this.tenantContext.tenantId, {
      assignmentId,
      productId: assignment.productId,
    });

    await this.audit.log('count.requestRecount', 'CountRecord', countRecord.id, { assignmentId });

    return updated;
  }

  private async assertManagedCountRecord(assignmentId: string, countRecordId: string) {
    const assignment = await this.prisma.countAssignment.findFirst({
      where: { id: assignmentId, tenantId: this.tenantContext.tenantId },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    const countRecord = await this.prisma.countRecord.findFirst({
      where: { id: countRecordId, assignmentId },
    });
    if (!countRecord) {
      throw new NotFoundException('Count record not found');
    }
    if (countRecord.status !== 'PENDING_APPROVAL') {
      throw new ForbiddenException('This count record is not pending approval');
    }
    return { assignment, countRecord };
  }
}
