import * as Crypto from 'expo-crypto';
import { api } from './api';
import { getDb } from './db';

interface RemoteCountRecord {
  attemptNumber: number;
  status: string;
  result: string;
}

interface RemoteAssignment {
  id: string;
  status: string;
  product: {
    id: string;
    productCode: string;
    description: string;
    barcode: string;
    systemQty: string;
    location: string | null;
    rackNumber: string | null;
  };
  countRecords: RemoteCountRecord[];
}

async function logError(message: string, context?: unknown) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO error_logs (id, severity, message, context, created_at, synced) VALUES (?, ?, ?, ?, ?, 0)',
    [Crypto.randomUUID(), 'ERROR', message, context ? JSON.stringify(context) : null, new Date().toISOString()],
  );
}

export async function pullAssignments() {
  const { data } = await api.get<RemoteAssignment[]>('/assignments');
  const db = await getDb();

  for (const a of data) {
    const latest = a.countRecords[0];
    await db.runAsync(
      `INSERT INTO assignments
        (id, product_id, product_code, description, barcode, location, rack_number, system_qty, status, attempts_used, last_attempt_status, last_attempt_result, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        product_code = excluded.product_code,
        description = excluded.description,
        barcode = excluded.barcode,
        location = excluded.location,
        rack_number = excluded.rack_number,
        system_qty = excluded.system_qty,
        status = excluded.status,
        attempts_used = excluded.attempts_used,
        last_attempt_status = excluded.last_attempt_status,
        last_attempt_result = excluded.last_attempt_result,
        synced_at = excluded.synced_at`,
      [
        a.id,
        a.product.id,
        a.product.productCode,
        a.product.description,
        a.product.barcode,
        a.product.location,
        a.product.rackNumber,
        Number(a.product.systemQty),
        a.status,
        a.countRecords.length,
        latest?.status ?? null,
        latest?.result ?? null,
        new Date().toISOString(),
      ],
    );
  }

  return data.length;
}

export async function pushPendingCounts() {
  const db = await getDb();
  const pending = await db.getAllAsync<{
    local_id: string;
    assignment_id: string;
    scanned_barcode: string;
    barcode_validated: number;
    counted_qty: number;
  }>('SELECT * FROM pending_count_records WHERE synced = 0 ORDER BY submitted_at ASC');

  let pushed = 0;
  for (const record of pending) {
    try {
      await api.post(`/assignments/${record.assignment_id}/counts`, {
        scannedBarcode: record.scanned_barcode,
        barcodeValidated: Boolean(record.barcode_validated),
        countedQty: record.counted_qty,
      });
      await db.runAsync('UPDATE pending_count_records SET synced = 1, sync_error = NULL WHERE local_id = ?', [
        record.local_id,
      ]);
      pushed += 1;
    } catch (err: any) {
      if (err?.response) {
        // Server rejected the submission (e.g. max attempts reached) — terminal, do not retry.
        const message = err.response.data?.message ?? 'Server rejected count submission';
        await db.runAsync('UPDATE pending_count_records SET synced = 1, sync_error = ? WHERE local_id = ?', [
          message,
          record.local_id,
        ]);
        await logError(message, { assignmentId: record.assignment_id, localId: record.local_id });
      }
      // else: network error, leave unsynced for retry on next sync
    }
  }

  return pushed;
}

export async function pushErrorLogs() {
  const db = await getDb();
  const pending = await db.getAllAsync<{
    id: string;
    severity: string;
    message: string;
    context: string | null;
  }>('SELECT * FROM error_logs WHERE synced = 0 ORDER BY created_at ASC');

  let pushed = 0;
  for (const log of pending) {
    try {
      await api.post('/logs/errors', {
        source: 'MOBILE',
        severity: log.severity,
        message: log.message,
        context: log.context ? JSON.parse(log.context) : undefined,
      });
      await db.runAsync('UPDATE error_logs SET synced = 1 WHERE id = ?', [log.id]);
      pushed += 1;
    } catch {
      // network error — leave unsynced for retry on next sync
    }
  }

  return pushed;
}

export async function fullSync() {
  await pushPendingCounts();
  await pushErrorLogs();
  await pullAssignments();
}
