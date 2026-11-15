# EDISON — `TASK-P3-001` PostgreSQL Migration Requirements (Track A Baseline)

**Task ID**: `TASK-P3-001`  
**Status**: **`READY`** *(Prepared during Phase 3 `Block P3-A` — JSON persistence intentionally retained in AI Studio; **ZERO Cloud SQL or paid database infrastructure provisioned** pending explicit Project Owner DB decision)*  
**Scope Rule**: Covers **Track A (100% committed Phase 2 baseline + `P3-A` security fields)**. **Track B** tables (household 7-level geo, multi-profile personalisation, dual-layer consent epochs, `HTTP 403` revocation) remain **strictly excluded** unless `DEC-OPEN-01` resolves in favour of Option B or C (additive migration later).

---

## 1. Objective & Current Persistence Baseline

- **Current AI Studio Store**: Single-host atomic JSON file (`src/server/store.ts` → `data/edison-store.json`, `schemaVersion: 7`) guarded by exclusive `O_CREAT | O_EXCL` file lock (`data/edison-store.lock`), `fsyncSync`, and atomic temp-file `renameSync`.
- **Target Production Database (`TASK-P3-001`)**: Relational PostgreSQL 16+ database with transactional ACID semantics (`SELECT ... FOR UPDATE` / serialisable status transitions), replacing process-local file locks for multi-instance Cloud Run / container scaling.

---

## 2. Target Relational Tables (14 Track A Core Collections)

1. **`users`**:
   - `id TEXT PRIMARY KEY`, `email TEXT NOT NULL UNIQUE`, `password_hash TEXT NOT NULL`, `name TEXT NOT NULL`, `organisation_name TEXT NOT NULL`, `role TEXT NOT NULL CHECK (role IN ('advertiser','opportunity_submitter','admin'))`, `verification_status TEXT NOT NULL`, `is_prototype_seed BOOLEAN NOT NULL DEFAULT FALSE`, `created_at TIMESTAMPTZ NOT NULL`.
2. **`sessions`** *(Updated for `Block P3-A` Hardening)*:
   - `id TEXT PRIMARY KEY`, `token_hash CHAR(64) NOT NULL UNIQUE`, `csrf_token TEXT NOT NULL`, `user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `role TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL`, `last_activity_at TIMESTAMPTZ NOT NULL`, `idle_expires_at TIMESTAMPTZ NOT NULL`, `expires_at TIMESTAMPTZ NOT NULL`.
   - *Index*: `idx_sessions_token_hash`, `idx_sessions_expires_at`. Never store raw plaintext session tokens in PostgreSQL.
3. **`advertiser_profiles`**:
   - `user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`, `entity_type TEXT NOT NULL`, `business_or_trading_name TEXT NOT NULL`, `registration_or_tax_id TEXT NOT NULL`, `industry_category TEXT NOT NULL`, `country_code TEXT NOT NULL`, `city_region TEXT NOT NULL`, `physical_address TEXT NOT NULL`, `primary_contact_name/email/phone`, `billing_contact_name/email`, `website_url`, `verification_status TEXT NOT NULL`, `verification_notes TEXT NOT NULL`, `is_prototype_seed BOOLEAN NOT NULL DEFAULT FALSE`, `updated_at TIMESTAMPTZ NOT NULL`.
4. **`qr_links`**:
   - `token TEXT PRIMARY KEY`, `owner_id TEXT NOT NULL REFERENCES users(id)`, `label TEXT NOT NULL`, `destination_type TEXT NOT NULL`, `raw_input TEXT NOT NULL`, `resolved_url TEXT NOT NULL`, `resolved_host TEXT NOT NULL`, `scheme TEXT NOT NULL CHECK (scheme IN ('https','http','tel'))`, `status TEXT NOT NULL CHECK (status IN ('active','disabled','flagged'))`, `redirect_requests_total BIGINT NOT NULL DEFAULT 0`, `redirect_issued_total BIGINT NOT NULL DEFAULT 0`, `suspected_bot_requests BIGINT NOT NULL DEFAULT 0`, `deduplicated_non_bot_redirects BIGINT NOT NULL DEFAULT 0`, `last_redirect_requested_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ NOT NULL`.
5. **`campaigns`**:
   - `id TEXT PRIMARY KEY`, `owner_id TEXT NOT NULL REFERENCES users(id)`, `title TEXT NOT NULL`, `content_category TEXT NOT NULL CHECK (content_category IN ('commercial_advertising','opportunity_promotion'))`, `primary_ad_category TEXT NOT NULL CHECK (primary_ad_category IN ('CHARITY','COMMERCIAL'))`, `status TEXT NOT NULL`, `summary TEXT NOT NULL`, `qr_token TEXT REFERENCES qr_links(token)`, `ad_creative_ref TEXT`, `duration_seconds INT NOT NULL`, `daily_frequency_cap INT NOT NULL`, `target_regions JSONB NOT NULL`, `dayparts JSONB NOT NULL`, `start_date DATE NOT NULL`, `end_date DATE NOT NULL`, `simulated_estimate JSONB NOT NULL`, `payment_collection_active BOOLEAN NOT NULL DEFAULT FALSE`, `moderation_reason TEXT NOT NULL DEFAULT ''`, `fix_instructions TEXT NOT NULL DEFAULT ''`, `created_at TIMESTAMPTZ NOT NULL`, `updated_at TIMESTAMPTZ NOT NULL`.
   - **Database-Level `$0.00` Charity Lock Constraint**: `CHECK (content_category <> 'opportunity_promotion' OR ((simulated_estimate->>'estimatedTotalUsd')::numeric = 0 AND simulated_estimate->>'model' = 'charity_free_zero_cost'))`.
6. **`ad_creatives`**:
   - `id TEXT PRIMARY KEY`, `owner_id TEXT NOT NULL REFERENCES users(id)`, `campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL`, `qr_token TEXT REFERENCES qr_links(token)`, `title TEXT NOT NULL`, `mode TEXT NOT NULL CHECK (mode IN ('option_a_studio','option_b_upload','text_only_commercial'))`, `status TEXT NOT NULL`, `display_duration_seconds INT NOT NULL`, `option_a JSONB`, `option_b JSONB`, `text_only JSONB`, `safe_zone_warnings JSONB NOT NULL`, `contrast_warnings JSONB NOT NULL`, `created_at TIMESTAMPTZ NOT NULL`, `updated_at TIMESTAMPTZ NOT NULL`.
7. **`opportunities`**:
   - `id TEXT PRIMARY KEY`, `owner_id TEXT NOT NULL REFERENCES users(id)`, `provider_type TEXT NOT NULL`, `provider_name TEXT NOT NULL`, `category TEXT NOT NULL`, `title TEXT NOT NULL`, `description TEXT NOT NULL`, `location TEXT NOT NULL`, `eligibility_requirements TEXT NOT NULL`, `application_method TEXT NOT NULL`, `contact_info TEXT NOT NULL`, `qr_token TEXT REFERENCES qr_links(token)`, `linked_campaign_id TEXT REFERENCES campaigns(id)`, `closing_date DATE NOT NULL`, `expiry_date DATE NOT NULL`, `status TEXT NOT NULL`, `verification_tiers JSONB NOT NULL`, `advertising_fee_influences_verification BOOLEAN NOT NULL DEFAULT FALSE CHECK (advertising_fee_influences_verification = FALSE)`, `application_fee_free_confirmed BOOLEAN NOT NULL`, `no_guarantee_confirmed BOOLEAN NOT NULL`, `rejection_reason TEXT NOT NULL DEFAULT ''`, `created_at TIMESTAMPTZ NOT NULL`, `updated_at TIMESTAMPTZ NOT NULL`.
8. **`opportunity_complaints`** & **`opportunity_appeals`**:
   - Foreign-keyed to `opportunities(id)` and `users(id)` with status enums, triage/resolution notes, and timestamps.
9. **`support_tickets`**:
   - Foreign-keyed to `users(id)` and optional `campaigns(id)`.
10. **`analytics_events`**:
    - `id TEXT PRIMARY KEY`, `event_type TEXT NOT NULL`, `measurement_source TEXT NOT NULL CHECK (measurement_source IN ('simulated_prototype','real_measured','unverified_in_prototype'))`, `qr_token TEXT`, `campaign_id TEXT`, `revenue_stream TEXT`, `estimated_usd NUMERIC(12,4)`, `metadata JSONB NOT NULL`, `created_at TIMESTAMPTZ NOT NULL`.
    - *Index*: `(event_type, measurement_source, created_at DESC)`.
11. **`physical_qr_scan_tests`**:
    - `id TEXT PRIMARY KEY`, `recorded_by_user_id TEXT NOT NULL REFERENCES users(id)`, `qr_token TEXT NOT NULL REFERENCES qr_links(token)`, `device_model TEXT NOT NULL`, `os_platform TEXT NOT NULL`, `camera_app TEXT NOT NULL`, `outcome TEXT NOT NULL CHECK (outcome IN ('passed','failed'))`, `time_to_scan_seconds NUMERIC(6,2) NOT NULL`, `notes TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL`.
12. **`shared_intel_preview_state`** *(Mock Prototype Storage)*:
    - JSONB / normalised preview snapshot until Phase 5 deploys the dedicated Central Shared Intelligence Service tables (`intel_compatibility_scopes`, `intel_observations`, `intel_version_bundles`, `intel_device_cache_acks`).
13. **`audit_logs`** *(Append-Only Security & Governance Trail)*:
    - `id TEXT PRIMARY KEY`, `actor_id TEXT`, `actor_role TEXT NOT NULL`, `action TEXT NOT NULL`, `target_type TEXT NOT NULL`, `target_id TEXT NOT NULL`, `detail TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL`.
    - Append-only role grant (`INSERT`, `SELECT` only; no `UPDATE`/`DELETE` in application DB role).

---

## 3. Transactional & Migration Execution Plan (When DB Decision Approved)

1. Extract storage contract interface `EdisonStorePort` so `EdisonPrototypeStore` (JSON) and future `PostgresEdisonStore` (`node-postgres` / Drizzle) satisfy identical synchronous/async service contracts tested against `tests/apiRegression.test.ts` + `tests/securityHardening.test.ts`.
2. Wrap campaign transitions, 3-tier verification updates, creative attach/flag checks, and audit logging inside `BEGIN ... COMMIT` transactions using `FOR UPDATE` row locks.
3. Provide idempotent CLI import tool (`import-json-to-postgres`) validating `schemaVersion >= 7` integrity and verifying row counts + `$0.00` Charity invariants post-migration.
4. **Deferred Track B Boundary**: Keep household geo, profile CRUD, and consent-epoch tables out of initial `0001_initial_track_a.sql` migration unless `DEC-OPEN-01` resolves Option B or C.
