import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPgliteExecutor } from '../src/server/postgres/executor.ts';
import {
  exportPostgresBackupSql,
  importJsonStoreToPostgres,
  probePostgresReadiness,
} from '../src/server/postgres/jsonToPostgresMigrator.ts';
import {
  getMigrationStatus,
  rollbackLastMigration,
  runUpMigrations,
} from '../src/server/postgres/migrator.ts';
import { EdisonPrototypeStore } from '../src/server/store.ts';

describe('TASK-P3-001 PostgreSQL 16+ Schema, Migrations, Constraints & JSON Import (Real PGlite PG16)', () => {
  it('applies all versioned SQL migrations, imports JSON store inside ACID tx, and enforces Charity $0.00 + Audit append-only constraints', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-pg-mig-'));
    const jsonStore = new EdisonPrototypeStore({ dataDir: tmpDir });
    const rawStoreData = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'edison-store.json'), 'utf8')
    );

    const executor = await createPgliteExecutor();
    try {
      const up1 = await runUpMigrations(executor);
      expect(up1.appliedVersions).toEqual([
        '0001_initial_track_a',
        '0002_track_b_households_consent',
        '0003_phases_4_to_15_ops_media_aura',
      ]);

      // Idempotent second run skips all already-applied migrations cleanly
      const up2 = await runUpMigrations(executor);
      expect(up2.appliedVersions).toEqual([]);
      expect(up2.skippedVersions.length).toBe(3);

      const status = await getMigrationStatus(executor);
      expect(status.appliedCount).toBe(3);
      expect(status.pendingCount).toBe(0);
      expect(status.applied.every((a) => a.checksumMatchesDisk)).toBe(true);

      // Import actual EDISON seed store into real PostgreSQL 16+ tables
      const importSummary = await importJsonStoreToPostgres(executor, rawStoreData);
      expect(importSummary.counts.users).toBeGreaterThanOrEqual(4);
      expect(importSummary.counts.campaigns).toBeGreaterThanOrEqual(2);
      expect(importSummary.counts.opportunities).toBeGreaterThanOrEqual(4);
      expect(importSummary.counts.households).toBeGreaterThanOrEqual(1);
      expect(importSummary.charityZeroCostVerified).toBe(true);
      expect(importSummary.feeIndependenceVerified).toBe(true);

      // Probe PostgreSQL readiness & logical backup counts
      const probe = await probePostgresReadiness(executor);
      expect(probe.connected).toBe(true);
      expect(probe.appliedMigrationsCount).toBe(3);
      const backup = await exportPostgresBackupSql(executor);
      expect(backup.rowCounts.users).toBe(importSummary.counts.users);

      // DB-level invariant 1: Charity campaign with non-zero USD estimate MUST fail CHECK constraint
      await expect(
        executor.query(
          `INSERT INTO campaigns (id, owner_id, title, content_category, primary_ad_category, status, simulated_estimate)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
          [
            'cmp_bad_charity',
            rawStoreData.users[0].id,
            'Illegal Paid Charity',
            'opportunity_promotion',
            'CHARITY',
            'draft',
            JSON.stringify({ estimatedTotalUsd: 50, model: 'commercial_rate_card' }),
          ]
        )
      ).rejects.toThrow();

      // DB-level invariant 2: advertising_fee_influences_verification = TRUE MUST fail CHECK constraint
      await expect(
        executor.query(
          `INSERT INTO opportunities (id, owner_id, provider_type, provider_name, category, title, status, verification_tiers, advertising_fee_influences_verification)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
          [
            'opp_bad_fee',
            rawStoreData.users[0].id,
            'registered_organisation',
            'Test Org',
            'employment',
            'Bad Opp',
            'draft',
            JSON.stringify({}),
            true,
          ]
        )
      ).rejects.toThrow();

      // DB-level invariant 3: audit_logs trigger rejects UPDATE/DELETE tampering
      await expect(
        executor.query(`UPDATE audit_logs SET detail = 'tampered' WHERE id = $1`, [
          rawStoreData.auditLogs[0].id,
        ])
      ).rejects.toThrow(/EDISON_AUDIT_APPEND_ONLY/);

      // DB-level invariant 4: bundled consent withdrawal CHECK consistency
      await expect(
        executor.query(
          `INSERT INTO households (
             id, owner_user_id, household_label, tv_device_label, country_code,
             province_or_region, city_or_town, district, suburb_or_area, exact_installation_location,
             commercial_consent_status, charity_and_opportunity_status
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            'hh_bad_split',
            rawStoreData.users[0].id,
            'Illegal Split Consent',
            'TV',
            'ZW',
            'Harare',
            'Harare',
            'Harare Central',
            'Avondale',
            '12 Samora Machel Ave',
            'withdrawn',
            'active',
          ]
        )
      ).rejects.toThrow();

      // Tenant / country query isolation + FOR UPDATE transactional locking check
      const zwHouseholds = await executor.withTransaction(async (tx) => {
        const res = await tx.query<{ id: string; country_code: string }>(
          'SELECT id, country_code FROM households WHERE country_code = $1 FOR UPDATE',
          ['ZW']
        );
        return res.rows;
      });
      expect(zwHouseholds.length).toBeGreaterThanOrEqual(1);
      expect(zwHouseholds.every((h) => h.country_code === 'ZW')).toBe(true);

      // Rollback .down.sql removes latest migration cleanly and re-applying restores it
      const rb = await rollbackLastMigration(executor);
      expect(rb.rolledBackVersion).toBe('0003_phases_4_to_15_ops_media_aura');
      expect(rb.remainingAppliedCount).toBe(2);

      const reUp = await runUpMigrations(executor);
      expect(reUp.appliedVersions).toEqual(['0003_phases_4_to_15_ops_media_aura']);
    } finally {
      await executor.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
