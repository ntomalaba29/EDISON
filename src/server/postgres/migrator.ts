import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { PgQueryExecutor } from './executor.ts';

export interface MigrationFileDescriptor {
  version: string;
  filename: string;
  downFilename: string | null;
  checksumSha256: string;
  sql: string;
  downSql: string | null;
}

export interface MigrationRunResult {
  appliedVersions: string[];
  skippedVersions: string[];
  totalAvailable: number;
  currentVersion: string | null;
}

export interface MigrationStatusReport {
  migrationsDir: string;
  totalMigrationsAvailable: number;
  appliedCount: number;
  pendingCount: number;
  applied: Array<{
    version: string;
    filename: string;
    checksumSha256: string;
    appliedAt: string;
    checksumMatchesDisk: boolean;
  }>;
  pendingVersions: string[];
}

const DEFAULT_MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function loadMigrationDescriptors(
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR
): MigrationFileDescriptor[] {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`POSTGRES_MIGRATIONS_MISSING: Directory not found at ${migrationsDir}`);
  }

  const entries = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql') && !name.endsWith('.down.sql'))
    .sort((a, b) => a.localeCompare(b));

  return entries.map((filename) => {
    const version = filename.replace(/\.sql$/, '');
    const fullPath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const downFilename = `${version}.down.sql`;
    const downPath = path.join(migrationsDir, downFilename);
    const hasDown = fs.existsSync(downPath);
    return {
      version,
      filename,
      downFilename: hasDown ? downFilename : null,
      checksumSha256: sha256(sql),
      sql,
      downSql: hasDown ? fs.readFileSync(downPath, 'utf8') : null,
    };
  });
}

async function ensureSchemaMigrationsTable(executor: PgQueryExecutor): Promise<void> {
  await executor.execSql(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      checksum_sha256 CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function runUpMigrations(
  executor: PgQueryExecutor,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR
): Promise<MigrationRunResult> {
  await ensureSchemaMigrationsTable(executor);
  const descriptors = loadMigrationDescriptors(migrationsDir);

  const existing = await executor.query<{
    version: string;
    checksum_sha256: string;
  }>('SELECT version, checksum_sha256 FROM schema_migrations ORDER BY version ASC');

  const appliedMap = new Map(existing.rows.map((r) => [r.version, r.checksum_sha256]));
  const appliedVersions: string[] = [];
  const skippedVersions: string[] = [];

  for (const migration of descriptors) {
    const recordedChecksum = appliedMap.get(migration.version);
    if (recordedChecksum) {
      if (recordedChecksum !== migration.checksumSha256) {
        throw new Error(
          `POSTGRES_MIGRATION_CHECKSUM_MISMATCH: Applied migration ${migration.version} differs from disk checksum.`
        );
      }
      skippedVersions.push(migration.version);
      continue;
    }

    await executor.withTransaction(async (tx) => {
      await tx.execSql(migration.sql);
      await tx.query(
        'INSERT INTO schema_migrations (version, filename, checksum_sha256) VALUES ($1, $2, $3)',
        [migration.version, migration.filename, migration.checksumSha256]
      );
    });
    appliedVersions.push(migration.version);
  }

  const allApplied = await executor.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
  );

  return {
    appliedVersions,
    skippedVersions,
    totalAvailable: descriptors.length,
    currentVersion: allApplied.rows[0]?.version ?? null,
  };
}

export async function rollbackLastMigration(
  executor: PgQueryExecutor,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR
): Promise<{ rolledBackVersion: string | null; remainingAppliedCount: number }> {
  await ensureSchemaMigrationsTable(executor);
  const latest = await executor.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
  );

  const targetVersion = latest.rows[0]?.version;
  if (!targetVersion) {
    return { rolledBackVersion: null, remainingAppliedCount: 0 };
  }

  const descriptors = loadMigrationDescriptors(migrationsDir);
  const descriptor = descriptors.find((d) => d.version === targetVersion);
  if (!descriptor || !descriptor.downSql) {
    throw new Error(
      `POSTGRES_ROLLBACK_MISSING_DOWN: Down migration script missing for ${targetVersion}.`
    );
  }

  await executor.withTransaction(async (tx) => {
    await tx.execSql(descriptor.downSql!);
    await tx.query('DELETE FROM schema_migrations WHERE version = $1', [targetVersion]);
  });

  const remaining = await executor.query<{ cnt: string }>(
    'SELECT COUNT(*)::text AS cnt FROM schema_migrations'
  );

  return {
    rolledBackVersion: targetVersion,
    remainingAppliedCount: Number.parseInt(remaining.rows[0]?.cnt ?? '0', 10),
  };
}

export async function getMigrationStatus(
  executor: PgQueryExecutor,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR
): Promise<MigrationStatusReport> {
  await ensureSchemaMigrationsTable(executor);
  const descriptors = loadMigrationDescriptors(migrationsDir);
  const descriptorMap = new Map(descriptors.map((d) => [d.version, d]));

  const rows = await executor.query<{
    version: string;
    filename: string;
    checksum_sha256: string;
    applied_at: string | Date;
  }>('SELECT version, filename, checksum_sha256, applied_at FROM schema_migrations ORDER BY version ASC');

  const appliedSet = new Set(rows.rows.map((r) => r.version));

  return {
    migrationsDir,
    totalMigrationsAvailable: descriptors.length,
    appliedCount: rows.rows.length,
    pendingCount: descriptors.filter((d) => !appliedSet.has(d.version)).length,
    applied: rows.rows.map((r) => ({
      version: r.version,
      filename: r.filename,
      checksumSha256: r.checksum_sha256,
      appliedAt:
        r.applied_at instanceof Date ? r.applied_at.toISOString() : String(r.applied_at),
      checksumMatchesDisk:
        descriptorMap.get(r.version)?.checksumSha256 === r.checksum_sha256,
    })),
    pendingVersions: descriptors.filter((d) => !appliedSet.has(d.version)).map((d) => d.version),
  };
}
