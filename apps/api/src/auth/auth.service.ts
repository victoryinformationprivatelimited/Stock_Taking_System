import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueSession(user);
  }

  async registerTenant(dto: RegisterTenantDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { tenant, manager } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: dto.companyName } });
      const manager = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          role: 'MANAGER',
        },
      });
      return { tenant, manager };
    });

    return this.issueSession(manager, tenant.name);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const accessToken = await this.jwt.signAsync(
        { sub: payload.sub, tenantId: payload.tenantId, role: payload.role },
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
        } as JwtSignOptions,
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueSession(
    user: { id: string; tenantId: string; role: string; email: string; fullName: string },
    tenantName?: string,
  ) {
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
    } as JwtSignOptions);
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN'),
    } as JwtSignOptions);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
      },
      ...(tenantName ? { tenant: { name: tenantName } } : {}),
    };
  }
}
