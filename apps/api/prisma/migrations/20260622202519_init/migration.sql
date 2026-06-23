-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MANAGER', 'COUNTER');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "CountResult" AS ENUM ('MATCH', 'MISMATCH');

-- CreateEnum
CREATE TYPE "CountRecordStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'RECOUNT_REQUESTED', 'REJECTED_MAX_ATTEMPTS');

-- CreateEnum
CREATE TYPE "StockUploadStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('MOBILE', 'WEB', 'API');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maxRecountAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_uploads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StockUploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,

    CONSTRAINT "stock_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "barcode" TEXT NOT NULL,
    "systemQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "location" TEXT,
    "rackNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_layouts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layout_zones" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "label" TEXT,
    "geometry" JSONB NOT NULL,

    CONSTRAINT "layout_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layout_product_map" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "layout_product_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "count_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "counterId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "count_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "count_records" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "scannedBarcode" TEXT NOT NULL,
    "barcodeValidated" BOOLEAN NOT NULL,
    "countedQty" DECIMAL(65,30) NOT NULL,
    "systemQtySnapshot" DECIMAL(65,30) NOT NULL,
    "result" "CountResult" NOT NULL,
    "status" "CountRecordStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deviceId" TEXT,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "count_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" "LogSource" NOT NULL,
    "severity" "LogSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "tenant_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "products_tenantId_barcode_idx" ON "products"("tenantId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_productCode_key" ON "products"("tenantId", "productCode");

-- CreateIndex
CREATE UNIQUE INDEX "layout_product_map_zoneId_productId_key" ON "layout_product_map"("zoneId", "productId");

-- CreateIndex
CREATE INDEX "count_assignments_tenantId_counterId_status_idx" ON "count_assignments"("tenantId", "counterId", "status");

-- CreateIndex
CREATE INDEX "count_records_assignmentId_attemptNumber_idx" ON "count_records"("assignmentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_entityType_entityId_idx" ON "audit_logs"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "error_logs_tenantId_severity_createdAt_idx" ON "error_logs"("tenantId", "severity", "createdAt");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_uploads" ADD CONSTRAINT "stock_uploads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_uploads" ADD CONSTRAINT "stock_uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_lastUploadId_fkey" FOREIGN KEY ("lastUploadId") REFERENCES "stock_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_layouts" ADD CONSTRAINT "store_layouts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_zones" ADD CONSTRAINT "layout_zones_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "store_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_product_map" ADD CONSTRAINT "layout_product_map_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "layout_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_product_map" ADD CONSTRAINT "layout_product_map_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_assignments" ADD CONSTRAINT "count_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_assignments" ADD CONSTRAINT "count_assignments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_assignments" ADD CONSTRAINT "count_assignments_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_assignments" ADD CONSTRAINT "count_assignments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_records" ADD CONSTRAINT "count_records_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "count_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_records" ADD CONSTRAINT "count_records_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_records" ADD CONSTRAINT "count_records_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
