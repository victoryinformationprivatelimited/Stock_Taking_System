import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { TenantInterceptor } from './common/tenant.interceptor';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { UploadsModule } from './uploads/uploads.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { LayoutsModule } from './layouts/layouts.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuditModule } from './audit/audit.module';
import { LogsModule } from './logs/logs.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    CommonModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    UploadsModule,
    AssignmentsModule,
    LayoutsModule,
    RealtimeModule,
    LogsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
