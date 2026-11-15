# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.  
**Git Verification Note**: `.git` metadata is absent inside `/app/applet`; commits and pushes are performed manually by the Project Owner.

---

## 1. PROJECT OWNER MESSAGE

> **Phase 3 Block P3-A Committed · Block P3-B Complete & Verified (`TASK-P3-001` `READY` — JSON Persistence Retained)**:
> - Project Owner confirmed manual commit of **`Block P3-A`** (`"Committed, next"`).
> - Completed **`Block P3-B`** software-first inside AI Studio: extracted `EdisonDataRepository` persistence port (`src/server/repository.ts`), hardened `/uploads/:filename` + media byte validation against SVG/polyglot payloads, symlinks, and framing (`Content-Security-Policy: default-src 'none'; sandbox`, `Cross-Origin-Resource-Policy: same-origin`), added configurable API timeout (`504`) & opaque JSON error middleware, added React `AppErrorBoundary`, and configured GitHub Actions CI (`/.github/workflows/edison-ci.yml`). JSON persistence (`schemaVersion: 8`) remains intentionally retained with zero Cloud SQL provisioning or paid external infrastructure.
> - Track B (`15.0%` consent/household/multi-profile/epoch-`403`) remains **strictly blocked** pending separate `DEC-OPEN-01` resolution.
> - Overall progress is now **`25.0%` of the 15-Phase Full App** (`40.3%` to `Stage P6` · Phase 2 Track A `85.0%` committed + Phase 3 `Block P3-A` `3.0%` committed + `Block P3-B` `3.0%` **`VERIFIED · AWAITING COMMIT`**).

---

## 2. PROGRESS PERCENTAGES UNTIL FULL APP

- **Phase 2 AI Studio Prototype Scope**: **`85.0%`** (**`100%` of unblocked Track A committed** · `15.0%` Track B Consent/Household/Multi-Profile/Epoch-`403` strictly **BLOCKED on `DEC-OPEN-01`**)
- **Software-to-`Stage-P6` Milestone (Phases 1–6 Subtotal = `62.0%` of Full App)**: **`40.3%`** (`25.0% / 62.0%`)
- **Overall EDISON Project Progress (Until Full 15-Phase International Commercial App = `100.0%`)**: **`25.0%`** (**`75.0%` remaining**)
  - Phase 1 Specs (`v1`–`v2.2`): `6.0% / 6.0%` (**Committed**)
  - Phase 2 Prototype: `13.0% / 14.0%` (`Blocks 2.1`–`2.7` + `P2-FIX.6` + `P2-V2.1`–`P2-V2.4` **Committed**; `1.0%` reserved for Track B / `DEC-OPEN-01`)
  - Phase 3 Hardening: `6.0% / 12.0%` (`Block P3-A` **Committed** `3.0%` + `Block P3-B` `EdisonDataRepository` port, upload/static CSP/symlink hardening, API timeout/error middleware, React `AppErrorBoundary` & CI workflow **`VERIFIED · AWAITING COMMIT`** `3.0%`; `TASK-P3-001` **`READY`** with JSON retained in AI Studio)
  - Phase 4 Smart TV OS Adapters & Normal TV Remote (`12%`), Phase 5 Break Detection & Shared Ad Intelligence (`12%`), Phase 6 Single Final Integrated TV Test (`6%`), Phases 7–9 Delivery/Billing/Render (`12%`), Phases 10–12 Ops/Legal/Failure Testing (`12%`), Phases 13–15 Launch/Expansion (`14%`): `0.0%` (**Not Started / Deferred**)

---

## 3. AI STUDIO INSTRUCTIONS

1. Preserve all committed Blocks `2.1`–`2.7`, `P2-FIX.6`, `v2.1`, `v2.2`, and `P2-V2.1`–`P2-V2.4` guarantees.
2. **Do NOT implement consent epochs, `HTTP 403` QR revocation, household TV accounts, 7-level private household geo records, or individual personalisation profiles** (`Track B`) until the Project Owner explicitly resolves `DEC-OPEN-01` (`Option A`, `B`, or `C`). `DEC-OPEN-01` blocks **ONLY Track B** — Phase 3 Track A hardening runs independently.
3. Retain locked atomic JSON persistence (`data/edison-store.json`, `schemaVersion: 8`) in AI Studio; do **NOT** provision Cloud SQL, create paid infrastructure, or incur external costs without explicit separate authorisation.
4. Keep `Network-Wide Shared Ad Intelligence` (`ADR-016` / `PRD-19`) clearly labelled **`PROTOTYPE SIMULATION PREVIEW — PHASE 5 PRODUCTION SERVICE NOT STARTED`**, and keep `Normal Everyday TV Remote Control` (`AURA → EDISON Control Engine → platform adapters → TV`, `ADR-017` / `PRD-20`) recorded as an **approved core capability with implementation `NOT STARTED`** (zero physical hardware tested or claimed).
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
  - Preserve all `Block P3-A` security controls (`zod`, cookie/header CSRF + same-origin, rate limiters, hashed/rotated sessions, security headers) during repository extraction (`Block P3-B`).
- **Prerequisites (`DRAFT` -> `READY`)**:
  1. Project Owner reviewed and confirmed manual Git commit of `Block P2-V2.4`: **MET (`2026-11-15`)**.
  2. Project Owner explicitly authorised Phase 3 activation and `TASK-P3-001` transition to `READY`: **MET (`2026-11-15`)**.
- **Status**: **`READY`** *(PostgreSQL requirements blueprint prepared; AI Studio continues software-first Phase 3 blocks on JSON persistence without provisioning paid Cloud SQL.)*
- **Expected Report**: Exact files, migration SQL applied, backfill verification counts, Vitest/Supertest exit codes (`0`), and remaining limitations.

---

## 5. COPILOT EXECUTION REPORT

*No VS Code Copilot tasks have been executed. `Block P3-A` (Committed) and `Block P3-B` (Awaiting Commit) were executed software-first inside AI Studio.*

---

## 6. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Block `P3-A` (`COMMITTED` — Phase 3 Part 1)**:
  - API Zod validation (`src/server/validationSchemas.ts`), cookie/header CSRF & same-origin protection (`src/lib/csrfFetch.ts` migrated cleanly across all React components to `edisonFetch` avoiding getter-only `window.fetch` errors), rate limiting (`429`), SHA-256 hashed/rotated sessions (`schemaVersion: 8`), security headers, and `tests/securityHardening.test.ts` — **confirmed committed by Owner**.
- **Block `P3-B` (`VERIFIED · AWAITING COMMIT` — Phase 3 Part 2: Persistence Portability, Asset Hardening & Fault Boundaries)**:
  - Extracted `EdisonDataRepository` port interface (`src/server/repository.ts`), implemented it on `EdisonPrototypeStore`, and decoupled `createEdisonApp(repository, ...)` so `TASK-P3-001` PostgreSQL can drop in later without rewriting HTTP routes (while strictly retaining JSON persistence and incurring zero Cloud SQL costs).
  - Hardened `src/server/mediaSecurity.ts` & `/uploads/:filename` with strict base64 checks, SVG/HTML/polyglot byte rejection, PNG IHDR dimension bounds, canonical `realpathSync` symlink-escape guard, and `Content-Security-Policy: default-src 'none'; sandbox` + `Cross-Origin-Resource-Policy: same-origin` + `X-Frame-Options: DENY`.
  - Added configurable `apiTimeoutMiddleware` (`504`), opaque `apiErrorMiddleware` (`400`/`413`/`500` JSON with zero HTML stack leaks), React `AppErrorBoundary` (`src/components/AppErrorBoundary.tsx`), and `.github/workflows/edison-ci.yml`.
  - Expanded `tests/securityHardening.test.ts` and `qa_p3b_portability_asset_hardening` (`13 / 13` automated QA invariants passing).

---

## 7. NEXT ACTION

1. **Completed Gate**: **`Block P3-B` is `VERIFIED · AWAITING COMMIT`** (please review and manually commit all changes).
2. **Next Authorised Options (After Owner Confirms `Block P3-B` Commit)**:
   - **`Block P3-C`** (Software-First Phase 3 Part 3 / Phase 4 Entry Prep): Structured request correlation/logging & audit export hardening, plus software-only Phase 4 modular `TvPlatformAdapter` contract & Normal Everyday TV Remote (`AURA → EDISON Control Engine → platform adapters → TV`) software simulator/unit suite (still keeping physical TV testing deferred strictly to `Stage P6`).
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
| `TASK-P3-B` | 2026-11-15 | AI Studio -> Owner | Phase 3 / `Block P3-B` | **`AWAITING COMMIT`** | `EdisonDataRepository` persistence port, hardened `/uploads/*` CSP/symlink/polyglot controls, API timeout (`504`) & JSON error middleware, React `AppErrorBoundary`, CI workflow, and expanded `tests/securityHardening.test.ts`. |
