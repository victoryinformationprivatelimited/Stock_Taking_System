import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { AuditService } from '../audit/audit.service';

const UPSERT_CHUNK_SIZE = 200;

interface ParsedRow {
  productCode: string;
  description: string;
  barcode: string;
  systemQty: number;
  location?: string;
  rackNumber?: string;
  imageUrl?: string;
}

const COLUMN_ALIASES: Record<string, keyof ParsedRow> = {
  'product code': 'productCode',
  'item no.': 'productCode',
  'item no': 'productCode',
  description: 'description',
  barcode: 'barcode',
  'bar code': 'barcode',
  'stock in hand': 'systemQty',
  'inventory': 'systemQty',
  quantity: 'systemQty',
  location: 'location',
  'rack number': 'rackNumber',
  rack: 'rackNumber',
  image: 'imageUrl',
  'image url': 'imageUrl',
};

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContext,
    private audit: AuditService,
  ) {}

  async listUploads() {
    return this.prisma.stockUpload.findMany({
      where: { tenantId: this.tenantContext.tenantId },
      orderBy: { uploadedAt: 'desc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async processUpload(file: { originalname: string; buffer: Buffer }) {
    const tenantId = this.tenantContext.tenantId;

    const upload = await this.prisma.stockUpload.create({
      data: {
        tenantId,
        filename: file.originalname,
        uploadedById: this.tenantContext.userId,
        status: 'PROCESSING',
      },
    });

    try {
      const parsedRows = await this.parseWorkbook(file.buffer);
      if (parsedRows.length === 0) {
        throw new BadRequestException('No valid product rows found in the file');
      }

      // Multiple rows can share the same product code (e.g. one row per location/bin).
      // Last occurrence wins; upserting duplicates in one batch would otherwise make
      // Postgres wait on its own uncommitted lock from the same transaction and hang.
      const dedupedByCode = new Map<string, ParsedRow>();
      for (const row of parsedRows) {
        dedupedByCode.set(row.productCode, row);
      }
      const rows = Array.from(dedupedByCode.values());
      const duplicateCount = parsedRows.length - rows.length;

      for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
        const values = chunk.map(
          (row) =>
            Prisma.sql`(${randomUUID()}, ${tenantId}, ${row.productCode}, ${row.description}, ${row.barcode}, ${row.systemQty}, ${row.location ?? null}, ${row.rackNumber ?? null}, ${row.imageUrl ?? null}, ${upload.id}, true, now(), now())`,
        );

        await this.prisma.$executeRaw`
          INSERT INTO "products"
            ("id","tenantId","productCode","description","barcode","systemQty","location","rackNumber","imageUrl","lastUploadId","isActive","createdAt","updatedAt")
          VALUES ${Prisma.join(values)}
          ON CONFLICT ("tenantId","productCode") DO UPDATE SET
            "description" = EXCLUDED."description",
            "barcode" = EXCLUDED."barcode",
            "systemQty" = EXCLUDED."systemQty",
            "location" = EXCLUDED."location",
            "rackNumber" = EXCLUDED."rackNumber",
            "imageUrl" = EXCLUDED."imageUrl",
            "lastUploadId" = EXCLUDED."lastUploadId",
            "isActive" = true,
            "updatedAt" = now()
        `;
      }

      const completed = await this.prisma.stockUpload.update({
        where: { id: upload.id },
        data: { status: 'COMPLETED' },
      });

      await this.audit.log('upload.complete', 'StockUpload', upload.id, {
        filename: upload.filename,
        rowCount: rows.length,
        duplicateRowsSkipped: duplicateCount,
      });

      return { ...completed, duplicateRowsSkipped: duplicateCount };
    } catch (error) {
      await this.prisma.stockUpload.update({
        where: { id: upload.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  private async parseWorkbook(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Workbook has no worksheets');
    }

    const headerRow = worksheet.getRow(1);
    const columnMap = new Map<number, keyof ParsedRow>();
    headerRow.eachCell((cell, colNumber) => {
      const normalized = String(cell.value ?? '').trim().toLowerCase();
      const field = COLUMN_ALIASES[normalized];
      if (field) {
        columnMap.set(colNumber, field);
      }
    });

    if (!Array.from(columnMap.values()).includes('productCode')) {
      throw new BadRequestException(
        'Could not find a "Product Code" / "Item No." column in the uploaded file',
      );
    }

    const rows: ParsedRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const parsed: Partial<ParsedRow> = {};
      row.eachCell((cell, colNumber) => {
        const field = columnMap.get(colNumber);
        if (!field) return;
        const value = cell.value;
        if (field === 'systemQty') {
          parsed.systemQty = Number(value ?? 0);
        } else {
          parsed[field] = value != null ? String(value).trim() : undefined;
        }
      });

      if (parsed.productCode) {
        rows.push({
          productCode: parsed.productCode,
          description: parsed.description ?? '',
          barcode: parsed.barcode ?? '',
          systemQty: parsed.systemQty ?? 0,
          location: parsed.location,
          rackNumber: parsed.rackNumber,
          imageUrl: parsed.imageUrl,
        });
      }
    });

    return rows;
  }
}
