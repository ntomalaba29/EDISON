# EDISON — Complete VS Code Engineering Handover Package (Phase 2 Track A → Phase 3)

**Repository**: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`  
**Reconciled Date**: 2026-11-15 (`Block P2-V2.4` — Track A Complete at `85.0%` AI Studio Assignment Scope)  
**Authority**: `VSCODE_HANDOVER_PLAN.md` (11-Point Phase 2 Exit Checklist)  
**Triggering Coordination File**: `coordination/EDISON_COMMAND_CENTER.md` (`TASK-P3-001`: **`DRAFT`** — independent of `DEC-OPEN-01`; prerequisites to move to `READY`: Owner commit of `P2-V2.4` + explicit Owner Phase 3 activation)

---

## 1. Project Architecture

- **Frontend SPA (`src/`)**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 (`@import "tailwindcss";` in `src/index.css`). Built into `dist/` via `npm run build`.
- **Testable Express App Factory & Single-Entry Server (`src/server/app.ts` + `server.ts`)**:
  - `createEdisonApp(store, { uploadsDir })` decouples Express middleware/route creation from listening on port `3000` so Supertest integration suites run hermetically against temporary directories.
  - Development (`npm run dev` / `tsx server.ts`): Mounts `vite.middlewares` in SPA middleware mode alongside `/api/*`, `/uploads/*`, and `/r/:token` on port `3000`.
  - Production (`npm start` / `node server.ts`): Serves `dist/` static assets + SPA fallback alongside `/api/*`, `/uploads/*`, and `/r/:token` on port `3000`.
- **Prototype Persistence (`src/server/store.ts` → `data/edison-store.json`, `schemaVersion: 7`)**:
  - Parameterised `{ dataDir }` + exclusive `O_CREAT | O_EXCL` advisory lockfile (`data/edison-store.lock`), `fsyncSync`, and atomic `renameSync` writes.
  - **Phase 3 Requirement (`TASK-P3-001`)**: Migrate single-host JSON persistence to PostgreSQL, schema migrations, and transactional audit logging.
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
- **Key & Testing Libraries**: `qrcode`, `jsqr`, `lucide-react`, `dotenv`, `vitest (^5.1.0)`, `supertest (^7.3.2)`.
- **Verification Commands**:
  - `npm test` → `vitest run` (`tests/qrValidator.test.ts`, `tests/breakScheduler.test.ts`, `tests/sharedIntelligence.test.ts`, `tests/apiRegression.test.ts`)
  - `npm run lint` → `tsc --noEmit` (must exit `0`)
  - `npm run build` → `vite build` (must exit `0`)
  - `npm run dev` / `npm start` → `tsx server.ts` / `node server.ts` on `http://0.0.0.0:3000`

---

## 3. Data Model (`src/types/edison.ts`, Schema Version 7 — 14 Collections)

1. `users`: `UserAccount` (salted `scrypt` `passwordHash`, roles `advertiser | opportunity_submitter | admin`).
2. `sessions`: `SessionRecord` (7-day HTTP-only cookie + Bearer tokens).
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

- **`npm test` (`vitest run`)**: Automated unit & Supertest HTTP integration suite across 4 test files (`qrValidator.test.ts`, `breakScheduler.test.ts`, `sharedIntelligence.test.ts`, `apiRegression.test.ts`).
- **Automated Store Readiness (`GET /api/qa/prototype-readiness`)**: `11 / 11` automated invariants passing across Blocks `2.1`–`2.7` + `P2-V2.1`–`P2-V2.4`.
- **Pending Owner Physical Phone Scan**: Live runtime store records `0` owner physical smartphone scan logs (`PENDING_OWNER_DEVICE_TEST`).
- **Pending Browser Playwright E2E**: AI Studio container has no Chromium binary; full Playwright E2E is queued in `TASK-P3-003`.

---

## 5. Known Limitations & Unresolved Decisions (`KNOWN_LIMITATIONS.md` / `DECISIONS_LOG.md`)

1. **`DEC-OPEN-01` (Consent & Profile Conflict — Blocks Track B Only)**: Track B (`15%` of AI Studio scope: household TV registration, 7-level private geo, multi-profile personalisation, dual-layer consent epochs, `HTTP 403` post-withdrawal revocation) is **strictly blocked** until Owner chooses Option A, B, or C. **Does NOT block Phase 3 (`TASK-P3-001`) Track A engineering hardening** (any future Track B schema follows as an additive migration if approved).
2. **`DEC-OPEN-02` & `DEC-OPEN-03`**: `k=1` short-break rule confirmation & GAM CTV eligibility/format support remain open (`MockAdNetworkBackfillAdapter` active).
3. **Normal Everyday TV Remote & Shared Ad Intelligence Implementation Status**: Normal TV Remote Control (`AURA → EDISON Control Engine → platform adapters → TV`) is **`NOT STARTED`** (Phase 4, zero hardware compatibility tested or claimed); `SharedIntelligencePreviewView` is a **prototype simulation preview only** (`NOT STARTED` for Phase 5 central fleet service & OS local cache).
4. **Infrastructure**: Single-host JSON file persistence (`data/edison-store.json`), zero FFmpeg media pipeline (`TASK-P3-004`), zero real payments (`paymentCollectionActive: false`), zero country legal sign-offs.

---

## 6. Ordered Phase 3 VS Code Copilot Engineering Tasks (Currently Held `DRAFT`)

**Prerequisites to transition `TASK-P3-001` from `DRAFT` → `READY`** *(Independent of `DEC-OPEN-01`)*:
1. Project Owner reviews and manually commits `Block P2-V2.4` (closing 100% of unblocked Track A).
2. Project Owner explicitly authorises Phase 3 activation (`TASK-P3-001 -> READY`) in `coordination/EDISON_COMMAND_CENTER.md`.

**Ordered Task Queue**:
1. **`TASK-P3-001` (`Status: DRAFT` — awaits `P2-V2.4` commit & explicit Owner Phase 3 activation)**: Migrate `EdisonPrototypeStore` (Track A baseline schema) to PostgreSQL with migrations and transactional audit logging. *(Keep Track B tables out of scope while `DEC-OPEN-01` remains unresolved.)*
2. **`TASK-P3-002`**: Harden authentication/session cookies, CSRF protection, rate limiting, and Zod validation schemas.
3. **`TASK-P3-003`**: Add Playwright browser E2E suite in CI covering desktop & mobile responsive UI alongside existing Vitest + Supertest tests.
4. **`TASK-P3-004`**: Build background media worker pipeline (FFmpeg 1080p/720p transcode, EBU R128 loudness normalisation, multi-frame QR extraction).
