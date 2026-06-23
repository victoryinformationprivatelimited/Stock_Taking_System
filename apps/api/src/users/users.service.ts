import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
    private audit: AuditService,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: this.tenantContext.tenantId, email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
      },
    });

    await this.audit.log('user.create', 'User', user.id, { email: user.email, role: user.role });

    return this.toSafeUser(user);
  }

  async findAll(role?: 'MANAGER' | 'COUNTER') {
    const users = await this.prisma.user.findMany({
      where: { tenantId: this.tenantContext.tenantId, ...(role ? { role } : {}) },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => this.toSafeUser(u));
  }

  async deactivate(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: this.tenantContext.tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log('user.deactivate', 'User', updated.id, { email: updated.email });

    return this.toSafeUser(updated);
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
    tenantId: string;
    createdAt: Date;
  }) {
    const { id, email, fullName, role, isActive, tenantId, createdAt } = user;
    return { id, email, fullName, role, isActive, tenantId, createdAt };
  }
}
