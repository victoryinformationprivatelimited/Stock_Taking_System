import {
  UserRole,
  AssignmentStatus,
  CountResult,
  CountRecordStatus,
  StockUploadStatus,
  LogSeverity,
  LogSource,
} from "./enums";

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  productCode: string;
  description: string;
  imageUrl?: string;
  barcode: string;
  systemQty: number;
  location?: string;
  rackNumber?: string;
  isActive: boolean;
  lastUploadId?: string;
}

export interface StockUpload {
  id: string;
  tenantId: string;
  filename: string;
  uploadedBy: string;
  uploadedAt: string;
  status: StockUploadStatus;
  errorMessage?: string;
}

export interface StoreLayout {
  id: string;
  tenantId: string;
  name: string;
  imageUrl: string;
  version: number;
}

export interface LayoutZone {
  id: string;
  layoutId: string;
  zoneCode: string;
  label?: string;
  geometry: unknown;
}

export interface CountAssignment {
  id: string;
  tenantId: string;
  managerId: string;
  counterId: string;
  productId: string;
  assignedAt: string;
  dueAt?: string;
  status: AssignmentStatus;
}

export interface CountRecord {
  id: string;
  assignmentId: string;
  attemptNumber: number;
  scannedBarcode: string;
  barcodeValidated: boolean;
  countedQty: number;
  systemQtySnapshot: number;
  result: CountResult;
  status: CountRecordStatus;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  deviceId?: string;
  syncedAt?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: unknown;
  createdAt: string;
}

export interface ErrorLogEntry {
  id: string;
  tenantId: string;
  source: LogSource;
  severity: LogSeverity;
  message: string;
  stack?: string;
  context?: unknown;
  createdAt: string;
}
