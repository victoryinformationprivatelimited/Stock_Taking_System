import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { AuditService } from '../audit/audit.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { MapProductsDto } from './dto/map-products.dto';

type ZoneLiveStatus = 'PENDING' | 'IN_PROGRESS' | 'MISMATCH' | 'DONE';

@Injectable()
export class LayoutsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
    private audit: AuditService,
  ) {}

  async create(name: string, imageUrl: string) {
    const layout = await this.prisma.storeLayout.create({
      data: { tenantId: this.tenantContext.tenantId, name, imageUrl },
    });
    await this.audit.log('layout.create', 'StoreLayout', layout.id, { name });
    return layout;
  }

  async findAll() {
    return this.prisma.storeLayout.findMany({
      where: { tenantId: this.tenantContext.tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { zones: true } } },
    });
  }

  async findOne(id: string) {
    const layout = await this.prisma.storeLayout.findFirst({
      where: { id, tenantId: this.tenantContext.tenantId },
      include: {
        zones: {
          include: { productMaps: { include: { product: true } } },
        },
      },
    });
    if (!layout) {
      throw new NotFoundException('Layout not found');
    }
    return layout;
  }

  async createZone(layoutId: string, dto: CreateZoneDto) {
    await this.assertLayout(layoutId);
    return this.prisma.layoutZone.create({
      data: {
        layoutId,
        zoneCode: dto.zoneCode,
        label: dto.label,
        geometry: dto.geometry as any,
      },
    });
  }

  async updateZone(layoutId: string, zoneId: string, dto: UpdateZoneDto) {
    await this.assertZone(layoutId, zoneId);
    return this.prisma.layoutZone.update({
      where: { id: zoneId },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.geometry !== undefined ? { geometry: dto.geometry as any } : {}),
      },
    });
  }

  async deleteZone(layoutId: string, zoneId: string) {
    await this.assertZone(layoutId, zoneId);
    await this.prisma.layoutZone.delete({ where: { id: zoneId } });
    return { id: zoneId };
  }

  async setZoneProducts(layoutId: string, zoneId: string, dto: MapProductsDto) {
    await this.assertZone(layoutId, zoneId);
    const tenantId = this.tenantContext.tenantId;

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds }, tenantId },
    });
    if (products.length !== dto.productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    await this.prisma.$transaction([
      this.prisma.layoutProductMap.deleteMany({ where: { zoneId } }),
      this.prisma.layoutProductMap.createMany({
        data: dto.productIds.map((productId) => ({ zoneId, productId })),
      }),
    ]);

    return this.prisma.layoutZone.findUnique({
      where: { id: zoneId },
      include: { productMaps: { include: { product: true } } },
    });
  }

  async getLiveStatus(layoutId: string) {
    const layout = await this.findOne(layoutId);
    const tenantId = this.tenantContext.tenantId;

    const zones = await Promise.all(
      layout.zones.map(async (zone) => {
        const productIds = zone.productMaps.map((m) => m.productId);
        if (productIds.length === 0) {
          return { zoneId: zone.id, zoneCode: zone.zoneCode, status: 'PENDING' as ZoneLiveStatus, productCount: 0 };
        }

        const assignments = await this.prisma.countAssignment.findMany({
          where: { tenantId, productId: { in: productIds } },
          include: { countRecords: { orderBy: { attemptNumber: 'desc' }, take: 1 } },
          orderBy: { assignedAt: 'desc' },
        });

        const status = this.aggregateZoneStatus(productIds.length, assignments);
        return { zoneId: zone.id, zoneCode: zone.zoneCode, status, productCount: productIds.length };
      }),
    );

    return { layoutId, zones };
  }

  private aggregateZoneStatus(
    productCount: number,
    assignments: Array<{
      productId: string;
      status: string;
      countRecords: Array<{ result: string; status: string }>;
    }>,
  ): ZoneLiveStatus {
    if (assignments.length === 0) {
      return 'PENDING';
    }

    const byProduct = new Map<string, (typeof assignments)[number]>();
    for (const a of assignments) {
      if (!byProduct.has(a.productId)) {
        byProduct.set(a.productId, a);
      }
    }

    const latestPerProduct = Array.from(byProduct.values());
    const hasMismatch = latestPerProduct.some((a) => {
      const latest = a.countRecords[0];
      return latest?.result === 'MISMATCH' && latest.status !== 'APPROVED';
    });
    if (hasMismatch) {
      return 'MISMATCH';
    }

    const allDone =
      latestPerProduct.length === productCount && latestPerProduct.every((a) => a.status === 'DONE');
    if (allDone) {
      return 'DONE';
    }

    const anyStarted = latestPerProduct.some((a) => a.status !== 'PENDING');
    return anyStarted ? 'IN_PROGRESS' : 'PENDING';
  }

  private async assertLayout(layoutId: string) {
    const layout = await this.prisma.storeLayout.findFirst({
      where: { id: layoutId, tenantId: this.tenantContext.tenantId },
    });
    if (!layout) {
      throw new NotFoundException('Layout not found');
    }
    return layout;
  }

  private async assertZone(layoutId: string, zoneId: string) {
    await this.assertLayout(layoutId);
    const zone = await this.prisma.layoutZone.findFirst({ where: { id: zoneId, layoutId } });
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }
    return zone;
  }
}
