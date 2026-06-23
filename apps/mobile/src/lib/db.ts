import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('stock_taking.db');
    await dbInstance.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        product_code TEXT NOT NULL,
        description TEXT NOT NULL,
        barcode TEXT NOT NULL,
        location TEXT,
        rack_number TEXT,
        system_qty REAL NOT NULL,
        status TEXT NOT NULL,
        attempts_used INTEGER NOT NULL DEFAULT 0,
        last_attempt_status TEXT,
        last_attempt_result TEXT,
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS pending_count_records (
        local_id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL,
        attempt_number INTEGER NOT NULL,
        scanned_barcode TEXT NOT NULL,
        barcode_validated INTEGER NOT NULL,
        counted_qty REAL NOT NULL,
        submitted_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        sync_error TEXT
      );

      CREATE TABLE IF NOT EXISTS error_logs (
        id TEXT PRIMARY KEY,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  return dbInstance;
}
