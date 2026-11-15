# EDISON — Complete VS Code Engineering Handover Package (Phase 2 Track A → Phase 3)

**Repository**: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`  
**Reconciled Date**: 2026-11-15 (`Phase 3 Activated — Block P3-A Complete / Awaiting Commit · TASK-P3-001 READY`)  
**Authority**: `VSCODE_HANDOVER_PLAN.md` (11-Point Phase 2 Exit Checklist)  
**Triggering Coordination File**: `coordination/EDISON_COMMAND_CENTER.md` (`TASK-P3-001`: **`READY`** — `docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md` prepared; JSON retained in AI Studio without paid Cloud SQL)

---

## 1. Project Architecture

- **Frontend SPA (`src/`)**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 (`@import "tailwindcss";` in `src/index.css`). Built into `dist/` via `npm run build`.
- **Testable Express App Factory & Single-Entry Server (`src/server/app.ts` + `server.ts`)**:
  - `createEdisonApp(store, { uploadsDir })` decouples Express middleware/route creation from listening on port `3000` so Supertest integration suites run hermetically against temporary directories.
  - Development (`npm run dev` / `tsx server.ts`): Mounts `vite.middlewares` in SPA middleware mode alongside `/api/*`, `/uploads/*`, and `/r/:token` on port `3000`.
  - Production (`npm start` / `node server.ts`): Serves `dist/` static assets + SPA fallback alongside `/api/*`, `/uploads/*`, and `/r/:token` on port `3000`.
- **Prototype Persistence (`src/server/store.ts` → `data/edison-store.json`, `schemaVersion: 8`)**:
  - Parameterised `{ dataDir }` + exclusive `O_CREAT | O_EXCL` advisory lockfile (`data/edison-store.lock`), `fsyncSync`, and atomic `renameSync` writes, now persisting SHA-256 `tokenHash`, session-bound `csrfToken`, and `idleExpiresAt` (`Block P3-A`).
  - **Phase 3 Requirement (`TASK-P3-001` — `READY`)**: Full PostgreSQL 16+ schema & backfill requirements documented in `docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md` (JSON retained in AI Studio without provisioning paid infrastructure).
- **QR Security & Redirect Engine (`src/server/qrValidator.ts` + `GET /r/:token`)**:
  - Normalises and validates `https://`, `http://`, `tel:`, and WhatsApp numbers; blocks `javascript:`, `data:`, `vbscript:`, IP literals, and opaque third-party URL shorteners.
  - `GET /r/:token` records `redirect_requested` and `redirect_issued` (`measurementSource: 'real_measured'`), applies User-Agent/prefetch bot filtering + 5s deduplication, and returns HTTP `302` straight to destination (`ADR-002`).
- **Dual Categories, Text-Only Format & Alternating Break Scheduler (`src/server/breakScheduler.ts`)**:
  - Permanent `$0.00 / FREE CHARITY ADS` lock across all `opportunity_promotion` campaigns (including free employer job listings).
  - Supports **3 Commercial Creative Formats**: Option A Guided Studio, Option B External Upload (`jsQR` verification blocking `decoded_mismatch`), and zero-media **`Text-Only` Commercial Ads**.
  - Alternating 4-Slot Break Scheduler (`CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL`), `k=1` pointer rule, conservative safety-buffer skip, Direct-Paid Commercial priority over `MockAdNetworkBackfillAdapter`, and strict 6-Stream Financial Revenue Ledger (`paymentCollectionActive: false`, `gamCtvAccountConfigured: false`).
- **TV & Shared Intelligence Simulation Boundaries**:
  - `SimulationTvAdapter` (`src/components/TvPreviewView.tsx`) and `SharedIntelligencePreviewView` (`src/server/sharedIntelligencePreview.ts`) are explicitly tagged as **software simulations** (`SIMULATION — NOT LIVE BROADCAST TUNER` / `PROTOTYPE SIMULATION PREVIEW`). Zero unprivileged Smart TV OS hooks or DRM/HDCP bypasses exist (`ADR-001`, `ADR-005`).
- **Approved Core Capabilities Pending Post-Prototype Implementation (Phases 4–5)**:
  - **Normal Everyday TV Remote Control (`ADR-017` / `PRD-20` — `NOT STARTED`)**: First-class core capability routing conventional everyday commands (power, volume/mute, channel up/down, source/input select, D-pad/OK/back/home) strictly via **`AURA → EDISON Control Engine → platform adapters → TV`**, separate from intelligent ad-break switching/restoration. **Zero physical TV hardware compatibility is claimed or tested** until Phase 4 adapters & the single `Stage P6` check.
  - **Network-Wide Shared Ad Intelligence (`ADR-016` / `PRD-19` — `PROTOTYPE SIMULATION PREVIEW ONLY`)**: Mock prototype simulation demonstrated in `SharedIntelligencePreviewView`; production Central Shared Intelligence Service & OS `Local Intelligence Cache` remain **`NOT STARTED`** (Phase 5).

---

## 2. Technology Stack & Commands

- **Runtime & Frameworks**: Node.js 22+, TypeScript (`typescript ^7.0.2`), Express `4.21.2`, React `19.0.1`, Vite `8.3.0`, Tailwind CSS `4.3.3`, `tsx 4.21.0`.
- **Key & Testing Libraries**: `zod`, `qrcode`, `jsqr`, `lucide-react`, `dotenv`, `vitest (^5.1.0)`, `supertest (^7.3.2)`.
- **Verification Commands**:
  - `npm test` → `vitest run` (`tests/qrValidator.test.ts`, `tests/breakScheduler.test.ts`, `tests/sharedIntelligence.test.ts`, `tests/apiRegression.test.ts`, `tests/securityHardening.test.ts` — 23/23 passing)
  - `npm run lint` → `tsc --noEmit` (must exit `0`)
  - `npm run build` → `vite build` (must exit `0`)
  - `npm run dev` / `npm start` → `tsx server.ts` / `node server.ts` on `http://0.0.0.0:3000`

---

## 3. Data Model (`src/types/edison.ts`, Schema Version 8 — 14 Collections)

1. `users`: `UserAccount` (salted `scrypt` `passwordHash`, roles `advertiser | opportunity_submitter | admin`).
2. `sessions`: `SessionRecord` (SHA-256 `tokenHash` at rest, session-bound `csrfToken`, 2h idle / 7d cap, HTTP-only `SameSite=Lax` cookie + Bearer).
3. `advertiserProfiles`: `AdvertiserProfile` (`registered_business | individual_sole_trader | public_ngo`, KYC state).
4. `campaigns`: `CampaignRecord` (10-state lifecycle, `paymentCollectionActive: false`, permanent `$0.00` Charity lock).
5. `adCreatives`: `AdCreativeRecord` (`option_a_studio`, `option_b_upload` + `jsQR`, and `text_only_commercial`).
6. `qrLinks`: `QrLinkRecord` (validated URLs + real HTTP 302 redirect/bot telemetry).
7. `opportunities`: `OpportunityRecord` (14 categories, registered + individual employers, non-transitive 3-tier verification, `advertisingFeeInfluencesVerification: false`).
8. `opportunityComplaints`: `OpportunityComplaintRecord` (complaint triage, scam flags, auto/manual suspension).
9. `opportunityAppeals`: `OpportunityAppealRecord` (appeal evidence + admin reinstatement/denial).
10. `supportTickets`: `SupportTicketRecord`.
11. `analyticsEvents`: `AnalyticsEventRecord` (strictly separates `simulated_prototype` vs `real_measured` `/r/:token` vs unverified Stage 7).
12. `physicalQrScanTests`: `PhysicalQrScanTestRecord` (owner physical phone camera test ledger).
13. `sharedIntelPreview`: `SharedIntelPreviewState` (mock prototype simulation state: 3 compatibility scopes, `K=3` quorum gate, zero PII, local caches).
14. `auditLogs`: `AuditLogRecord` (immutable security & moderation audit trail).

---

## 4. Automated Test & Verification Evidence

- **`npm test` (`vitest run`)**: Automated unit & Supertest HTTP integration suite across 5 test files (`qrValidator.test.ts`, `breakScheduler.test.ts`, `sharedIntelligence.test.ts`, `apiRegression.test.ts`, `securityHardening.test.ts` — 23/23 tests).
- **Automated Store Readiness (`GET /api/qa/prototype-readiness`)**: `12 / 12` automated invariants passing across Blocks `2.1`–`2.7`, `P2-V2.1`–`P2-V2.4`, and `Block P3-A`.
- **Pending Owner Physical Phone Scan**: Live runtime store records `0` owner physical smartphone scan logs (`PENDING_OWNER_DEVICE_TEST`).
- **Pending Browser Playwright E2E**: AI Studio container has no Chromium binary; full Playwright E2E is queued in `TASK-P3-003`.

---

## 5. Known Limitations & Unresolved Decisions (`KNOWN_LIMITATIONS.md` / `DECISIONS_LOG.md`)

1. **`DEC-OPEN-01` (Consent & Profile Conflict — Blocks Track B Only)**: Track B (`15%` of AI Studio scope: household TV registration, 7-level private geo, multi-profile personalisation, dual-layer consent epochs, `HTTP 403` post-withdrawal revocation) is **strictly blocked** until Owner chooses Option A, B, or C. **Does NOT block Phase 3 (`TASK-P3-001`) Track A engineering hardening** (any future Track B schema follows as an additive migration if approved).
2. **`DEC-OPEN-02` & `DEC-OPEN-03`**: `k=1` short-break rule confirmation & GAM CTV eligibility/format support remain open (`MockAdNetworkBackfillAdapter` active).
3. **Normal Everyday TV Remote & Shared Ad Intelligence Implementation Status**: Normal TV Remote Control (`AURA → EDISON Control Engine → platform adapters → TV`) is **`NOT STARTED`** (Phase 4, zero hardware compatibility tested or claimed); `SharedIntelligencePreviewView` is a **prototype simulation preview only** (`NOT STARTED` for Phase 5 central fleet service & OS local cache).
4. **Infrastructure**: Single-host JSON file persistence (`data/edison-store.json`), zero FFmpeg media pipeline (`TASK-P3-004`), zero real payments (`paymentCollectionActive: false`), zero country legal sign-offs.

---

## 6. Ordered Phase 3 Engineering Tasks (`TASK-P3-001` Now `READY` · `Block P3-A` Complete)

**Prerequisites to transition `TASK-P3-001` from `DRAFT` → `READY`** *(Independent of `DEC-OPEN-01`)*:
1. Project Owner reviews and manually commits `Block P2-V2.4`: **MET (`2026-11-15`)**.
2. Project Owner explicitly authorises Phase 3 activation: **MET (`2026-11-15`)**.

**Ordered Task Queue**:
1. **`Block P3-A` / former `TASK-P3-002` (`Status: VERIFIED · AWAITING COMMIT` in AI Studio)**: API Zod validation schemas, cookie/header CSRF & same-origin enforcement, rate limiting (`429`), hashed/rotated sessions (`schemaVersion: 8`), security headers, and `tests/securityHardening.test.ts`.
2. **`TASK-P3-001` (`Status: READY` — Blueprint Prepared, Execution Deferred Pending DB Provisioning Decision)**: Migrate `EdisonPrototypeStore` (Track A baseline schema) to PostgreSQL 16+ per `docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md`. *(JSON retained in AI Studio without paid Cloud SQL; Track B excluded while `DEC-OPEN-01` unresolved.)*
3. **`Block P3-B` (`Next Software-First AI Studio Block`)**: Extract `EdisonDataRepository` storage port interfaces, harden `/uploads/:filename` + CSP/DOM safety, and add request timeout/CI check hardening.
4. **`TASK-P3-003`**: Add Playwright browser E2E suite in CI covering desktop & mobile responsive UI alongside existing Vitest + Supertest tests.
5. **`TASK-P3-004`**: Build background media worker pipeline (FFmpeg 1080p/720p transcode, EBU R128 loudness normalisation, multi-frame QR extraction).
