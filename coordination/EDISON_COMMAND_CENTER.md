# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.  
**Git Verification Note**: `.git` metadata is absent inside `/app/applet`; commits and pushes are performed manually by the Project Owner.

---

## 1. PROJECT OWNER MESSAGE

> **Phase 3 Block P3-C Committed · Phase 4 Block 4.1 Complete & Verified (`TASK-P3-001` `READY` — JSON Persistence Retained)**:
> - Project Owner confirmed manual commit of **`Block P3-C`** (`"Committed, next"`), locking all three Phase 3 AI Studio hardening blocks (`P3-A`, `P3-B`, `P3-C` = `9.0%`).
> - Completed **Phase 4 · Stage 4.1 · Block 4.1 (Software-First Smart TV Adapter Harnesses & Offline Intelligence Cache)**:
>   - Upgraded `src/server/tvPlatformAdapter.ts` with platform-specific software harnesses (`SimulationTvHarness`, `AndroidTvTifHarness`, `SamsungTizenHarness`, `LgWebOsHarness`) enforcing `enterAdBreakSession`, `exitToOrdinaryTv`, fail-closed privilege boundaries (LG webOS without partner Luna privilege), and a **16-case deterministic fault-injection suite** across all 4 platforms × 4 fault modes (`hardwareTested: false`, `Stage P6` strictly deferred).
>   - Implemented `src/server/offlineIntelCache.ts` (`LocalOfflineIntelCacheEngine`) with SHA-256 manifest verification, scope isolation, anti-downgrade guard, atomic pointer swap, instant `previousGoodVersion` rollback, and offline break-duration feasibility evaluation (`P10` >= ad + switching + buffer).
>   - Exposed authenticated Block 4.1 endpoints (`/api/tv-adapters/break-lifecycle`, `/api/tv-adapters/fault-suite`, `/api/offline-intel-cache/*`), integrated interactive UI controls into `TvPreviewView.tsx`, and added unit + HTTP regression tests plus `qa_41_tv_harnesses_and_offline_cache` (`15/15` automated QA invariants).
> - Track B (`15.0%` consent/household/multi-profile/epoch-`403`) remains **strictly blocked** pending separate `DEC-OPEN-01` resolution.
> - Overall progress is now **`31.0%` of the 15-Phase Full App** (`50.0%` to `Stage P6` · Phase 2 Track A `85.0%` committed + Phase 3 `9.0%` committed + Phase 4 `Block 4.1` `3.0%` **`VERIFIED · AWAITING COMMIT`**).

---

## 2. PROGRESS PERCENTAGES UNTIL FULL APP

- **Phase 2 AI Studio Prototype Scope**: **`85.0%`** (**`100%` of unblocked Track A committed** · `15.0%` Track B Consent/Household/Multi-Profile/Epoch-`403` strictly **BLOCKED on `DEC-OPEN-01`**)
- **Software-to-`Stage-P6` Milestone (Phases 1–6 Subtotal = `62.0%` of Full App)**: **`50.0%`** (`31.0% / 62.0%`)
- **Overall EDISON Project Progress (Until Full 15-Phase International Commercial App = `100.0%`)**: **`31.0%`** (**`69.0%` remaining**)
  - Phase 1 Specs (`v1`–`v2.2`): `6.0% / 6.0%` (**Committed**)
  - Phase 2 Prototype: `13.0% / 14.0%` (`Blocks 2.1`–`2.7` + `P2-FIX.6` + `P2-V2.1`–`P2-V2.4` **Committed**; `1.0%` reserved for Track B / `DEC-OPEN-01`)
  - Phase 3 Hardening: `9.0% / 12.0%` (`Blocks P3-A`, `P3-B` & `P3-C` **Committed** `9.0%`; `TASK-P3-001` **`READY`** `3.0%` with JSON retained in AI Studio)
  - Phase 4 Smart TV OS Adapters & Normal TV Remote: `3.0% / 12.0%` (**`Block 4.1` `VERIFIED · AWAITING COMMIT` `3.0%`** — software-first harnesses, 16-case fault suite & SHA-256 offline cache; zero physical TV hardware tested, `Stage P6` strictly deferred)
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

*No VS Code Copilot tasks have been executed. `Blocks P3-A`, `P3-B`, `P3-C` (Committed) and Phase 4 `Block 4.1` (Awaiting Commit) were executed software-first inside AI Studio.*

---

## 6. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Phase 3 (`P3-A`, `P3-B` & `P3-C` — `COMMITTED`)**:
  - API Zod validation, cookie/header CSRF & `edisonFetch`, rate limits, SHA-256 hashed/rotated sessions (`schemaVersion: 8`), `EdisonDataRepository` portability port, `/uploads/*` CSP/symlink/polyglot hardening, `X-Request-Id` correlation & telemetry, CSV formula-neutralized audit export, and modular `TvPlatformAdapter` / AURA Normal TV Remote contracts — **all confirmed committed by Owner**.
- **Phase 4 · Block `4.1` (`VERIFIED · AWAITING COMMIT`)**:
  - Upgraded `src/server/tvPlatformAdapter.ts` to concrete `SimulationTvHarness`, `AndroidTvTifHarness`, `SamsungTizenHarness`, and `LgWebOsHarness` adapters with `enterAdBreakSession`, `exitToOrdinaryTv`, fail-closed privilege guards, and 16-case `runDeterministicFaultSuite()`.
  - Built `src/server/offlineIntelCache.ts` (`LocalOfflineIntelCacheEngine`) enforcing SHA-256 manifest verification, scope isolation, anti-downgrade, atomic pointer swap, `previousGoodVersion` rollback, and offline `P10` break-duration feasibility guards.
  - Added Block 4.1 endpoints (`/api/tv-adapters/break-lifecycle`, `/api/tv-adapters/fault-suite`, `/api/offline-intel-cache/*`), integrated interactive UI controls in `TvPreviewView.tsx`, created `tests/phase4AdaptersAndCache.test.ts`, expanded `tests/securityHardening.test.ts`, and added 15th automated QA invariant `qa_41_tv_harnesses_and_offline_cache` (`15/15` passing).

---

## 7. NEXT ACTION

1. **Completed Gate**: **Phase 4 `Block 4.1` is `VERIFIED · AWAITING COMMIT`** (please review and manually commit all changes).
2. **Next Authorised Options (After Owner Confirms `Block 4.1` Commit)**:
   - **Phase 4 / Block `4.2`** (Offline Telemetry Sync Queue, Multi-Channel Adapter State Persistence & Cadence Simulator): Persist/drain queued offline intelligence observations with replay deduplication, simulate channel-specific SCTE-35/HbbTV cadence streams driving `TvPlatformAdapter` + `LocalOfflineIntelCacheEngine` end-to-end, and add software emulator conformance vectors (still keeping physical TV testing strictly deferred to `Stage P6`).
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
| `TASK-P4-01` | 2026-11-15 | AI Studio -> Owner | Phase 4 / `Block 4.1` | **`AWAITING COMMIT`** | Software-first `AndroidTvTifHarness`, `SamsungTizenHarness`, `LgWebOsHarness` fail-closed capability gates, 16-case deterministic fault suite, SHA-256 `LocalOfflineIntelCacheEngine` atomic swap/rollback & simulator UI (`phase4AdaptersAndCache.test.ts`). |

