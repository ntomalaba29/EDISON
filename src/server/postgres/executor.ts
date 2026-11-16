import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { PGlite } from '@electric-sql/pglite';

export interface PgQueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number;
}

export interface PgQueryExecutor {
  readonly driver: 'pg_pool' | 'pglite_wasm';
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<PgQueryResult<T>>;
  execSql(sql: string): Promise<void>;
  withTransaction<T>(fn: (tx: PgQueryExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Enforces parameterized SQL queries cleanly (defense-in-depth against interpolation).
 */
export function assertSafeQueryParams(sql: string, params?: readonly unknown[]): void {
  if (!sql || typeof sql !== 'string' || !sql.trim()) {
    throw new Error('POSTGRES_SQL_INVALID: Empty SQL statement is not permitted.');
  }
  if (params && !Array.isArray(params)) {
    throw new Error('POSTGRES_PARAMS_INVALID: Query parameters must be passed as an array.');
  }
}

export function createPoolExecutor(connectionString: string): PgQueryExecutor {
  const pool = new Pool({
    connectionString,
    max: 15,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 15_000,
  });

  const wrapClient = (client: PoolClient): PgQueryExecutor => ({
    driver: 'pg_pool',
    async query<T extends QueryResultRow = QueryResultRow>(
      sql: string,
      params: readonly unknown[] = []
    ): Promise<PgQueryResult<T>> {
      assertSafeQueryParams(sql, params);
      const res = await client.query<T>(sql, [...params]);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    },
    async execSql(sql: string): Promise<void> {
      assertSafeQueryParams(sql);
      await client.query(sql);
    },
    async withTransaction<T>(fn: (tx: PgQueryExecutor) => Promise<T>): Promise<T> {
      return fn(wrapClient(client));
    },
    async close(): Promise<void> {
      // No-op on transaction-scoped client
    },
  });

  return {
    driver: 'pg_pool',
    async query<T extends QueryResultRow = QueryResultRow>(
      sql: string,
      params: readonly unknown[] = []
    ): Promise<PgQueryResult<T>> {
      assertSafeQueryParams(sql, params);
      const res = await pool.query<T>(sql, [...params]);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    },
    async execSql(sql: string): Promise<void> {
      assertSafeQueryParams(sql);
      await pool.query(sql);
    },
    async withTransaction<T>(fn: (tx: PgQueryExecutor) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(wrapClient(client));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

/**
 * In-process PostgreSQL 16+ WASM engine (@electric-sql/pglite) for deterministic
 * CI/local SQL migration execution, DDL constraint testing, and JSON->PG validation
 * without requiring an external or paid cloud Postgres daemon.
 */
export async function createPgliteExecutor(dataDir?: string): Promise<PgQueryExecutor> {
  const db = dataDir ? new PGlite(dataDir) : new PGlite();
  await db.waitReady;

  const wrapTx = (txDb: Pick<PGlite, 'query' | 'exec'>): PgQueryExecutor => ({
    driver: 'pglite_wasm',
    async query<T extends QueryResultRow = QueryResultRow>(
      sql: string,
      params: readonly unknown[] = []
    ): Promise<PgQueryResult<T>> {
      assertSafeQueryParams(sql, params);
      const res = await txDb.query<T>(sql, [...params]);
      return {
        rows: res.rows,
        rowCount: res.affectedRows ?? res.rows.length,
      };
    },
    async execSql(sql: string): Promise<void> {
      assertSafeQueryParams(sql);
      await txDb.exec(sql);
    },
    async withTransaction<T>(fn: (tx: PgQueryExecutor) => Promise<T>): Promise<T> {
      return fn(wrapTx(txDb));
    },
    async close(): Promise<void> {
      // No-op on transaction handle
    },
  });

  return {
    driver: 'pglite_wasm',
    async query<T extends QueryResultRow = QueryResultRow>(
      sql: string,
      params: readonly unknown[] = []
    ): Promise<PgQueryResult<T>> {
      assertSafeQueryParams(sql, params);
      const res = await db.query<T>(sql, [...params]);
      return {
        rows: res.rows,
        rowCount: res.affectedRows ?? res.rows.length,
      };
    },
    async execSql(sql: string): Promise<void> {
      assertSafeQueryParams(sql);
      await db.exec(sql);
    },
    async withTransaction<T>(fn: (tx: PgQueryExecutor) => Promise<T>): Promise<T> {
      return db.transaction(async (tx) => fn(wrapTx(tx as unknown as Pick<PGlite, 'query' | 'exec'>)));
    },
    async close(): Promise<void> {
      await db.close();
    },
  };
}
