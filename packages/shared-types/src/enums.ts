export enum UserRole {
  MANAGER = "MANAGER",
  COUNTER = "COUNTER",
}

export enum AssignmentStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
}

export enum CountResult {
  MATCH = "MATCH",
  MISMATCH = "MISMATCH",
}

export enum CountRecordStatus {
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  RECOUNT_REQUESTED = "RECOUNT_REQUESTED",
  REJECTED_MAX_ATTEMPTS = "REJECTED_MAX_ATTEMPTS",
}

export const MAX_RECOUNT_ATTEMPTS = 3;

export enum StockUploadStatus {
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum LogSeverity {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export enum LogSource {
  MOBILE = "MOBILE",
  WEB = "WEB",
  API = "API",
}
