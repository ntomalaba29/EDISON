# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.  
**Git Verification Note**: `.git` metadata is absent inside `/app/applet`; commits and pushes are performed manually by the Project Owner.

---

## 1. PROJECT OWNER MESSAGE

> **Phase 3 & Blocks 4.1–4.2 Committed · Phase 4 Block 4.3 Complete & Verified (`TASK-P3-001` `READY` — JSON Persistence Retained)**:
> - Project Owner confirmed manual commit of **`Block 4.2`** & CI workflow fix (`"Committed, next"`), locking the offline telemetry sync queue, cadence simulator, 8-vector conformance, and Bun GitHub Actions CI (`6.0%` Phase 4 committed).
> - Completed **Phase 4 · Stage 4.3 · Block 4.3 (Broadcast Metadata Cue Fixtures, Companion Policy Guardrails & 10-Check Phase 4 Software Exit Suite)**:
>   - Created `src/server/broadcastMetadataParser.ts` enforcing lawful fail-closed cue parsing across `scte35_splice_insert`, `hbbtv_ait_dsmcc`, and `av_cadence_marker` fixtures (DRM/HDCP skip, HbbTV external hijack rejection, `<0.85` AV confidence skip), `ADR-001`/`ADR-017` companion policy evaluation (`DENY_FAIL_CLOSED` vs `ALLOW_BOUNDED`), and a 10-check `runPhase4SoftwareExitSuite()`.
>   - Exposed authenticated Block 4.3 endpoints (`POST /api/tv-adapters/parse-cue`, `POST /api/tv-adapters/evaluate-policy`, `POST /api/tv-adapters/phase4-exit-suite`), interactive Simulator UI panels in `TvPreviewView.tsx`, 17th automated QA invariant `qa_43_metadata_fixtures_policy_phase4_exit`, and unit + HTTP security tests (`hardwareTested: false`, `Stage P6` strictly deferred).
> - Track B (`15.0%` consent/household/multi-profile/epoch-`403`) remains **strictly blocked** pending separate `DEC-OPEN-01` resolution.
> - Overall progress is now **`37.0%` of the 15-Phase Full App** (`59.7%` to `Stage P6` · Phase 2 Track A `85.0%` committed + Phase 3 `9.0%` committed + Phase 4 `Blocks 4.1–4.2` `6.0%` committed + `Block 4.3` `3.0%` **`VERIFIED · AWAITING COMMIT`**).

---

## 2. PROGRESS PERCENTAGES UNTIL FULL APP

- **Phase 2 AI Studio Prototype Scope**: **`85.0%`** (**`100%` of unblocked Track A committed** · `15.0%` Track B Consent/Household/Multi-Profile/Epoch-`403` strictly **BLOCKED on `DEC-OPEN-01`**)
- **Software-to-`Stage-P6` Milestone (Phases 1–6 Subtotal = `62.0%` of Full App)**: **`59.7%`** (`37.0% / 62.0%`)
- **Overall EDISON Project Progress (Until Full 15-Phase International Commercial App = `100.0%`)**: **`37.0%`** (**`63.0%` remaining**)
  - Phase 1 Specs (`v1`–`v2.2`): `6.0% / 6.0%` (**Committed**)
  - Phase 2 Prototype: `13.0% / 14.0%` (`Blocks 2.1`–`2.7` + `P2-FIX.6` + `P2-V2.1`–`P2-V2.4` **Committed**; `1.0%` reserved for Track B / `DEC-OPEN-01`)
  - Phase 3 Hardening: `9.0% / 12.0%` (`Blocks P3-A`, `P3-B` & `P3-C` **Committed** `9.0%`; `TASK-P3-001` **`READY`** `3.0%` with JSON retained in AI Studio)
  - Phase 4 Smart TV OS Adapters & Normal TV Remote: `9.0% / 12.0%` (**`Blocks 4.1–4.2` `COMMITTED` `6.0%` + `Block 4.3` `VERIFIED · AWAITING COMMIT` `3.0%`**; remaining `3.0%` reserved for OEM partner SDK bindings & `Stage P6` hardware test)
  - Phase 5 Break Detection & Shared Ad Intelligence (`12%`), Phase 6 Single Final Integrated TV Test (`6%`), Phases 7–9 Delivery/Billing/Render (`12%`), Phases 10–12 Ops/Legal/Failure Testing (`12%`), Phases 13–15 Launch/Expansion (`14%`): `0.0%` (**Not Started / Deferred**)

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

*No VS Code Copilot tasks have been executed. `Blocks P3-A`, `P3-B`, `P3-C` & Phase 4 `Blocks 4.1–4.2` (Committed) and Phase 4 `Block 4.3` (Awaiting Commit) were executed software-first inside AI Studio.*

---

## 6. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Phase 3 (`P3-A`, `P3-B` & `P3-C` — `COMMITTED`)**: API hardening, `EdisonDataRepository`, `X-Request-Id` telemetry, CSV formula-neutralized audit export, and modular TV/AURA contracts.
- **Phase 4 · Blocks `4.1`–`4.2` (`COMMITTED`)**: Platform harnesses, 16-case deterministic fault suite, SHA-256 offline cache swap/rollback, idempotent telemetry queue deduplication, 3-channel cadence simulator, 8-vector emulator conformance, and Bun frozen-lockfile CI workflow.
- **Phase 4 · Block `4.3` (`VERIFIED · AWAITING COMMIT`)**:
  - Built `src/server/broadcastMetadataParser.ts` validating lawful `scte35_splice_insert`, `hbbtv_ait_dsmcc`, and `av_cadence_marker` cue fixtures (DRM/HDCP skip, HbbTV 3P hijack block, low-confidence AV skip).
  - Enforced `evaluateCompanionPolicyGuardrail()` (`ADR-001` / `ADR-017`) blocking `bypass_hdcp`, `background_screen_scrape`, unprivileged `monitor_epg_global`, and 3P broadcast overlays.
  - Added 10-check `runPhase4SoftwareExitSuite()`, API endpoints (`/api/tv-adapters/parse-cue`, `/evaluate-policy`, `/phase4-exit-suite`), Simulator UI controls in `TvPreviewView.tsx`, 17th QA invariant `qa_43_metadata_fixtures_policy_phase4_exit`, and unit + HTTP security tests.

---

## 7. NEXT ACTION

1. **Completed Gate**: **Phase 4 `Block 4.3` is `VERIFIED · AWAITING COMMIT`** (please review and manually commit all changes).
2. **Next Authorised Options (After Owner Confirms `Block 4.3` Commit)**:
   - **Phase 5 / Block `5.1`** (Lawful Break-Detection Confidence Calibration & Network-Wide Shared Ad Intelligence Fleet Production Service — `ADR-016` / `PRD-19`): Production `v2.2` backend service with signed attestation key verification, fleet corroboration quorum, automatic rollback triggers, and scenarios `25`–`35` (keeping physical TV hardware testing strictly deferred to `Stage P6`).
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
| `TASK-P4-03` | 2026-11-15 | AI Studio -> Owner | Phase 4 / `Block 4.3` | **`AWAITING COMMIT`** | Lawful broadcast cue fixtures (`SCTE-35`/`HbbTV`/`AV`), ADR-001/ADR-017 companion policy guardrails & 10-check Phase 4 software exit suite (`qa_43_metadata_fixtures_policy_phase4_exit`). |


