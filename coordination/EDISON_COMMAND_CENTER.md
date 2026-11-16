# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.  
**Git Verification Note**: `.git` metadata is absent inside `/app/applet`; commits and pushes are performed manually by the Project Owner.

---

## 1. PROJECT OWNER MESSAGE

> **Phases 1–6 Committed · Phase 7 Block 7.1 Complete & Verified (`TASK-P3-001` `READY` — JSON Persistence Retained)**:
> - Project Owner confirmed manual commit of **Phase 6 · Block 6.1** (`"Committed next"`), locking the Advertising Delivery Infrastructure (`4.0% / 4.0%` Phase 6 committed).
> - Completed **Phase 7 · Stage 7.1 · Block 7.1 (Advertiser and Campaign Operations — Software-First: 6-Gate KYC Readiness, Automated Campaign Pacing, Non-Transactional Pro-Forma Invoice Blueprints & Support SLA Triage)**:
>   - Created `src/server/advertiserOps.ts` enforcing 6-gate KYC/compliance readiness & SLA tier classification (`verified_priority_12h`, `standard_24h`, `suspended_restricted`), automated campaign pacing (`on_pace`, `under_pacing`, `over_capped`, `charity_free_unmetered`, `window_inactive`), SHA-256 non-transactional Pro-Forma invoice blueprints (`paymentCollectionActive: false`, `realPaymentGatewayConnected: false`, `actualCashChargedUsd: 0`, `$0.00 / FREE` Charity row permanently locked as `CHARITY_PERMANENT_ZERO`), SLA ticket breach detection (`4h` QR technical, `12h` campaign review, `24h` verification/billing, `48h` appeals), and `automatedOutreachBlocked: true`.
>   - Exposed strict-Zod endpoints (`GET /api/advertiser-ops/overview`, `POST /api/advertiser-ops/pro-forma-blueprint`, `POST /api/advertiser-ops/verify-suite`), wired interactive Block 7.1 Operations controls in `AdvertiserProfileView` (`src/components/CampaignViews.tsx`), added 21st QA invariant `qa_71_advertiser_ops_billing_boundary`, and verified unit + HTTP security integration tests (`8/8` suite checks passed, `paymentCollectionActive: false`, `hardwareTested: false`, `Stage P6` strictly deferred).
> - Track B (`15.0%` consent/household/multi-profile/epoch-`403`) remains **strictly blocked** pending separate `DEC-OPEN-01` resolution.
> - Overall progress is now **`56.0%` of the 15-Phase Full App** (`80.3%` to `Stage P6` · Phases 1–6 committed + Phase 7 `Block 7.1` `3.0%` **`VERIFIED · AWAITING COMMIT`**).

---

## 2. PROGRESS PERCENTAGES UNTIL FULL APP

- **Phase 2 AI Studio Prototype Scope**: **`85.0%`** (**`100%` of unblocked Track A committed** · `15.0%` Track B Consent/Household/Multi-Profile/Epoch-`403` strictly **BLOCKED on `DEC-OPEN-01`**)
- **Software-to-`Stage-P6` Milestone (Phases 1–6 + Stage P6 Subtotal = `66.0%` of Full App)**: **`80.3%`** (`53.0% / 66.0%`)
- **Overall EDISON Project Progress (Until Full 15-Phase International Commercial App = `100.0%`)**: **`56.0%`** (**`44.0%` remaining**)
  - Phase 1 Specs (`v1`–`v2.2`): `6.0% / 6.0%` (**Committed**)
  - Phase 2 Prototype: `13.0% / 14.0%` (`Blocks 2.1`–`2.7` + `P2-FIX.6` + `P2-V2.1`–`P2-V2.4` **Committed**; `1.0%` reserved for Track B / `DEC-OPEN-01`)
  - Phase 3 Hardening: `9.0% / 12.0%` (`Blocks P3-A`, `P3-B` & `P3-C` **Committed** `9.0%`; `TASK-P3-001` **`READY`** `3.0%` with JSON retained in AI Studio)
  - Phase 4 Smart TV OS Adapters & Normal TV Remote: `9.0% / 12.0%` (**`Blocks 4.1–4.3` `COMMITTED`**; remaining `3.0%` reserved for OEM partner SDK bindings & `Stage P6` hardware test)
  - Phase 5 Break Detection, ML Duration Predictor & Shared Ad Intelligence: `12.0% / 12.0%` (**`Blocks 5.1–5.2` `COMMITTED`**)
  - Phase 6 Advertising Delivery Infrastructure (Software-First): `4.0% / 4.0%` (**`Block 6.1` `COMMITTED`**)
  - Phase 7 Advertiser & Campaign Operations (Software-First · Non-Transactional): `3.0% / 3.0%` (**`Block 7.1` `VERIFIED · AWAITING COMMIT`**)
  - `Stage P6` Single Final Integrated TV Test (`6%`), Phase 8 Ad Rendering (`3%`), Phase 9 Opportunity Ops (`2%`), Phases 10–12 Legal/Failure Testing (`12%`), Phases 13–15 Launch/Expansion (`14%`): `0.0%` (**Not Started / Deferred**)

---

## 3. AI STUDIO INSTRUCTIONS

1. Preserve all committed Blocks `2.1`–`2.7`, `P2-FIX.6`, `v2.1`, `v2.2`, `P2-V2.1`–`P2-V2.4`, `P3-A`, and `P3-B` guarantees.
2. **Do NOT implement consent epochs, `HTTP 403` QR revocation, household TV accounts, 7-level private household geo records, or individual personalisation profiles** (`Track B`) until the Project Owner explicitly resolves `DEC-OPEN-01` (`Option A`, `B`, or `C`). `DEC-OPEN-01` blocks **ONLY Track B** — Phase 3/4 Track A software work runs independently.
3. Retain locked atomic JSON persistence (`data/edison-store.json`, `schemaVersion: 8`) in AI Studio; do **NOT** provision Cloud SQL, create paid infrastructure, or incur external costs without explicit separate authorisation.
4. Keep `Network-Wide Shared Ad Intelligence` (`ADR-016` / `PRD-19`) clearly labelled **`PROTOTYPE SIMULATION PREVIEW — PHASE 5 PRODUCTION SERVICE NOT STARTED`**, and keep `Normal Everyday TV Remote Control` (`AURA → EDISON Control Engine → platform adapters → TV`, `ADR-017` / `PRD-20`) strictly marked **software-only simulation (`hardwareTested: false`, `Stage P6` deferred)** with zero physical hardware compatibility claimed.
5. Enforce software-first testing with **strictly one planned final physical TV test at app completion (`Stage P6`)**, `$0.00 / FREE` Charity & employer job listings, locked commercial business outreach/automated emailing, and independent public statutory research without lawyer dependency.

---

## 4. PENDING COPILOT TASK

- **Task ID**: `TASK-P3-001` *(Transitioned `DRAFT` -> **`READY`** on `2026-11-15`)*
- **Date and Time**: `2026-11-15T12:40:00-08:00`
- **Sender**: `AI Studio (Chief Software Architect)`
- **Recipient**: `VS Code Copilot / External Postgres Execution Environment` *(when Owner executes external PostgreSQL provisioning)*
- **Phase, Stage, and Substage**: `Phase 3 / Stage 3.1 / PostgreSQL Migration & Track A Production Hardening`
- **Objective**: Execute the PostgreSQL 16+ migration of the 14 Track A collections when ready to move beyond single-host JSON persistence (`data/edison-store.json`, `schemaVersion: 8`), following the complete SQL blueprint and backfill requirements in **`docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md`**.
- **Scope & Migration Requirements (`docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md`)**:
  - Provision PostgreSQL 16+ tables covering all 14 Track A collections (`users`, hashed `sessions` with `token_hash` & `idle_expires_at`, `qr_links`, `advertiser_profiles`, `campaigns` with DB-enforced `$0.00` Charity constraint, `ad_creatives`, `support_tickets`, `opportunities`, `opportunity_complaints`, `opportunity_appeals`, `analytics_events`, `physical_qr_scan_tests`, `shared_intel_*`, append-only `audit_logs`).
  - Keep Track B consent/household/multi-profile/epoch-`403` tables **strictly excluded** while `DEC-OPEN-01` remains unresolved.
  - Preserve all `Block P3-A`/`P3-B`/`P3-C` security controls (`zod`, cookie/header CSRF + same-origin, rate limiters, hashed/rotated sessions, `X-Request-Id` correlation, CSV formula-neutralized audit export) via `EdisonDataRepository`.
- **Prerequisites (`DRAFT` -> `READY`)**:
  1. Project Owner reviewed and confirmed manual Git commit of `Block P2-V2.4`: **MET (`2026-11-15`)**.
  2. Project Owner explicitly authorised Phase 3 activation and `TASK-P3-001` transition to `READY`: **MET (`2026-11-15`)**.
- **Status**: **`READY`** *(PostgreSQL requirements blueprint prepared; AI Studio continues software-first blocks on JSON persistence without provisioning paid Cloud SQL.)*
- **Expected Report**: Exact files, migration SQL applied, backfill verification counts, Vitest/Supertest exit codes (`0`), and remaining limitations.

---

## 5. COPILOT EXECUTION REPORT

*No VS Code Copilot tasks have been executed. Phases 3–6 (`Committed`) and Phase 7 `Block 7.1` (`Awaiting Commit`) were executed software-first inside AI Studio.*

---

## 6. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Phase 3 (`P3-A`, `P3-B` & `P3-C` — `COMMITTED`)**: API hardening, `EdisonDataRepository`, `X-Request-Id` telemetry, CSV formula-neutralized audit export, and modular TV/AURA contracts.
- **Phase 4 · Blocks `4.1`–`4.3` (`COMMITTED`)**: Platform harnesses, 16-case fault suite, SHA-256 offline cache/queue deduplication, cadence simulator, 8-vector conformance, cue fixtures, companion policy guardrails & 10-check software exit suite.
- **Phase 5 · Blocks `5.1`–`5.2` (`COMMITTED`)**: Fleet Shared Ad Intelligence Service (`11/11` Scenarios `25`–`35`) and Per-Channel `p10`/`p5` ML Break Predictor & 10-Fixture Calibration Benchmark (`10/10` passed, `0%` FPR).
- **Phase 6 · Block `6.1` (`COMMITTED`)**: Advertising Delivery Infrastructure (`adDeliveryInfra.ts`) with SHA-256 preload manifests, `$0.00` Charity lock, coarse regional/QR/Tizen codec filtering, daily frequency caps, edge failover recovery & idempotent event ingestion (`8/8` checks passed).
- **Phase 7 · Block `7.1` (`VERIFIED · AWAITING COMMIT`)**:
  - Built `src/server/advertiserOps.ts` enforcing 6-gate KYC onboarding readiness, automated campaign schedule pacing, SHA-256 non-transactional Pro-Forma invoice blueprints (`paymentCollectionActive: false`, `actualCashChargedUsd: 0`, `$0.00 / FREE` Charity isolation), SLA ticket breach triage, and 8-check verification suite (`8/8` passed).
  - Mounted strict-Zod endpoints (`/api/advertiser-ops/*`), wired interactive operations controls into `AdvertiserProfileView` (`CampaignViews.tsx`), added 21st QA invariant `qa_71_advertiser_ops_billing_boundary`, and verified unit + HTTP security tests.

---

## 7. NEXT ACTION

1. **Completed Gate**: **Phase 7 `Block 7.1` is `VERIFIED · AWAITING COMMIT`** (please review and manually commit all changes, locking `3.0% / 3.0%` of Phase 7 Software Operations).
2. **Next Authorised Options (After Owner Confirms `Block 7.1` Commit)**:
   - **Phase 8 Software-First Prep**: Advertisement Creation & Broadcast Rendering Validation (codec/bitrate/safe-margin/QR vision validation while keeping physical `Stage P6` Smart TV test deferred until app completion).
   - **Or Execute `TASK-P3-001`** (`READY`): Authorise external PostgreSQL provisioning/migration when ready to move beyond single-host JSON persistence.
   - **To unlock Track B (`15.0%` consent/household/multi-profile/epoch-`403`)**: Resolve **`DEC-OPEN-01`** (`Option A`, `B`, or `C`). Track B remains strictly **BLOCKED** until decided.

---

## 8. TASK HISTORY

| Task ID | Date | Sender -> Recipient | Phase / Stage | Status | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-000`–`TASK-007` | 2026-11-14 | AI Studio -> Owner | Phase 1 & Phase 2 (Blocks 2.1–2.7) | `COMMITTED` | Baseline specs + Auth/RBAC/QR, Profiles/Campaigns, Option A/B Ad Studio, 16:9 TV Preview/Sim, Opportunities/3-Tier QA, Moderation/7-Stage Analytics & Handover Package. |
| `TASK-P2FIX-6`, `TASK-SPEC-V2-FIX`, `TASK-SPEC-V2-2` | 2026-11-15 | AI Studio -> Owner | `P2-FIX.6` + `v2.1` + `v2.2` | `COMMITTED` | Confirmed committed by Project Owner (`"I've committed"`). |
| `TASK-P2-V2-1`–`TASK-P2-V2.4` | 2026-11-15 | AI Studio -> Owner | Phase 2 / `P2-V2` Track A (`Blocks P2-V2.1`–`2.4`) | **`COMMITTED`** | Confirmed committed (`100%` Track A Complete at `85.0%` AI Studio scope). |
| `TASK-P3-001` | 2026-11-15 | AI Studio -> External / Copilot | Phase 3 / Stage 3.1 | **`READY`** | Transitioned `DRAFT` -> `READY` per Owner Phase 3 activation; PostgreSQL 16+ schema blueprint written to `docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md` (JSON retained in AI Studio). |
| `TASK-P3-A` | 2026-11-15 | AI Studio -> Owner | Phase 3 / `Block P3-A` | **`COMMITTED`** | API Zod validation, cookie/header CSRF & same-origin protection, rate limiters (`429`), hashed/rotated sessions (`schemaVersion: 8`), `edisonFetch` fix, and `tests/securityHardening.test.ts`. |
| `TASK-P3-B` | 2026-11-15 | AI Studio -> Owner | Phase 3 / `Block P3-B` | **`COMMITTED`** | `EdisonDataRepository` persistence port, hardened `/uploads/*` CSP/symlink/polyglot controls, API timeout (`504`) & JSON error middleware, React `AppErrorBoundary`, CI workflow, and AI Studio host/port migration fixes. |
| `TASK-P3-C` | 2026-11-15 | AI Studio -> Owner | Phase 3 / `Block P3-C` | **`COMMITTED`** | `X-Request-Id` correlation & telemetry, CSV formula-neutralized `/api/admin/audit-logs/export`, software-only `TvPlatformAdapter` contracts + `AURA` Normal TV Remote & watchdog simulator (`tests/tvPlatformAdapter.test.ts`). |
| `TASK-P4-01` | 2026-11-15 | AI Studio -> Owner | Phase 4 / `Block 4.1` | **`COMMITTED`** | Software-first `AndroidTvTifHarness`, `SamsungTizenHarness`, `LgWebOsHarness` fail-closed capability gates, 16-case deterministic fault suite, SHA-256 `LocalOfflineIntelCacheEngine` atomic swap/rollback & simulator UI (`phase4AdaptersAndCache.test.ts`). |
| `TASK-P4-02` | 2026-11-15 | AI Studio -> Owner | Phase 4 / `Block 4.2` | **`COMMITTED`** | Idempotent offline telemetry sync queue with replay deduplication, multi-channel (`101/103/201`) SCTE-35/HbbTV cadence simulator & 8-vector emulator conformance suite + Bun CI lockfile correction. |
| `TASK-P4-03` | 2026-11-15 | AI Studio -> Owner | Phase 4 / `Block 4.3` | **`COMMITTED`** | Lawful broadcast cue fixtures (`SCTE-35`/`HbbTV`/`AV`), ADR-001/ADR-017 companion policy guardrails & 10-check Phase 4 software exit suite (`qa_43_metadata_fixtures_policy_phase4_exit`). |
| `TASK-P5-01` | 2026-11-15 | AI Studio -> Owner | Phase 5 / `Block 5.1` | **`COMMITTED`** | Fleet Shared Ad Intelligence Service (`ADR-016` / `PRD-19`), Ed25519 device & manifest attestation, conflict split guard, scoped delta sync, `>2.5%` FPR auto-rollback & 11/11 Scenarios `25`–`35` (`qa_51_shared_intel_fleet_scenarios_25_35`). |
| `TASK-P5-02` | 2026-11-16 | AI Studio -> Owner | Phase 5 / `Block 5.2` | **`COMMITTED`** | Per-channel `p5`/`p10`/`p50`/`mean` break-duration ML predictor rejecting mean overestimation & 10-fixture recorded stream benchmark (`10/10` passed, `0%` FPR, `qa_52_break_duration_predictor_calibration`). |
| `TASK-P6-01` | 2026-11-16 | AI Studio -> Owner | Phase 6 / `Block 6.1` | **`COMMITTED`** | Advertising Delivery Infrastructure (`adDeliveryInfra.ts`): SHA-256 preload manifests, `$0.00` Charity lock, coarse regional/QR/Tizen codec gates, daily frequency caps, edge CDN failover & idempotent ingestion (`8/8` checks, `qa_61_advertising_delivery_infrastructure`). |
| `TASK-P7-01` | 2026-11-16 | AI Studio -> Owner | Phase 7 / `Block 7.1` | **`AWAITING COMMIT`** | Advertiser & Campaign Operations (`advertiserOps.ts`): 6-gate KYC readiness evaluation, automated campaign pacing, non-transactional SHA-256 Pro-Forma blueprints (`paymentCollectionActive=false`, `$0.00` Charity lock), SLA breach triage & `8/8` verification suite (`qa_71_advertiser_ops_billing_boundary`). |


