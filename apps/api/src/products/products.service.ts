import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
  ) {}

  async findAll(search?: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { productCode: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { productCode: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: this.tenantContext.tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}
