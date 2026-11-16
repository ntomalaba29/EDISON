import fs from 'node:fs';
import path from 'node:path';
import type { EdisonStoreData } from '../../types/edison.ts';
import { createPgliteExecutor, createPoolExecutor } from './executor.ts';
import { importJsonStoreToPostgres } from './jsonToPostgresMigrator.ts';
import { getMigrationStatus, rollbackLastMigration, runUpMigrations } from './migrator.ts';

async function main() {
  const cmd = process.argv[2] || 'status';
  const dbUrl = process.env.DATABASE_URL?.trim();
  const executor = dbUrl ? createPoolExecutor(dbUrl) : await createPgliteExecutor();

  try {
    if (cmd === 'up') {
      const result = await runUpMigrations(executor);
      console.log(JSON.stringify({ ok: true, command: 'up', ...result }, null, 2));
      return;
    }

    if (cmd === 'rollback') {
      const result = await rollbackLastMigration(executor);
      console.log(JSON.stringify({ ok: true, command: 'rollback', ...result }, null, 2));
      return;
    }

    if (cmd === 'import-json') {
      const storeFile = path.resolve(process.cwd(), 'data', 'edison-store.json');
      if (!fs.existsSync(storeFile)) {
        throw new Error(`No store JSON found at ${storeFile}`);
      }
      const parsed = JSON.parse(fs.readFileSync(storeFile, 'utf8')) as EdisonStoreData;
      const summary = await importJsonStoreToPostgres(executor, parsed);
      console.log(JSON.stringify({ ok: true, command: 'import-json', summary }, null, 2));
      return;
    }

    const status = await getMigrationStatus(executor);
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: 'status',
          driver: executor.driver,
          note: dbUrl
            ? 'Connected to configured DATABASE_URL'
            : 'No DATABASE_URL set — inspected using local PGlite PG16 engine',
          ...status,
        },
        null,
        2
      )
    );
  } finally {
    await executor.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
