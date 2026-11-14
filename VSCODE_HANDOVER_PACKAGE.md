# EDISON — Complete VS Code Engineering Handover Package (Phase 2 → Phase 3)

**Repository**: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`  
**Handover Date**: 2026-11-14  
**Authority**: `VSCODE_HANDOVER_PLAN.md` (11-Point Phase 2 Exit Checklist)  
**Triggering Coordination File**: `coordination/EDISON_COMMAND_CENTER.md` (`TASK-P3-001`: `READY`)

---

## 1. Project Architecture

- **Frontend SPA (`src/`)**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 (`@import "tailwindcss";` in `src/index.css`). Built into `dist/` via `npm run build`.
- **Single-Entry Express Server (`server.ts`)**:
  - Development (`npm run dev` / `tsx server.ts`): Mounts `vite.middlewares` in SPA middleware mode alongside `/api/*`, `/uploads/*`, and `/r/:token` on port `3000`.
  - Production (`npm start` / `node server.ts`): Serves `dist/` static assets + SPA fallback alongside `/api/*`, `/uploads/*`, and `/r/:token` on port `3000`.
- **Prototype Persistence (`src/server/store.ts` → `data/edison-store.json`, `schemaVersion: 6`)**:
  - Exclusive `O_CREAT | O_EXCL` advisory lockfile (`data/edison-store.lock`) with stale lock recovery.
  - Reload-on-mtime check, `fsyncSync`, and atomic `renameSync` writes.
  - **Phase 3 Requirement (`TASK-P3-001`)**: Replace single-host JSON persistence with PostgreSQL, migrations, and transactional audit logging.
- **QR Security & Redirect Engine (`src/server/qrValidator.ts` + `GET /r/:token`)**:
  - Normalises and validates `https://`, `http://`, `tel:`, and WhatsApp numbers; blocks `javascript:`, `data:`, `vbscript:`, IP literals, and opaque third-party URL shorteners.
  - `GET /r/:token` records `redirect_requested` and `redirect_issued` (`measurementSource: 'real_measured'`), applies User-Agent/prefetch bot filtering + 5s deduplication, and returns HTTP `302` directly to the advertiser/opportunity destination (`ADR-002` — never injects a secondary phone ad screen).
- **TV Boundary (`src/components/TvPreviewView.tsx`)**:
  - Uses explicit browser `SimulationTvAdapter` labelling (`SIMULATION — NOT LIVE BROADCAST TUNER`). Zero unprivileged Smart TV OS tuner hooks or DRM/HDCP bypasses (`ADR-001`, `ADR-005`).

---

## 2. Technology Stack & Commands

- **Runtime & Frameworks**: Node.js 22+, TypeScript (`typescript ^7.0.2`), Express `4.21.2`, React `19.0.1`, Vite `8.3.0`, Tailwind CSS `4.3.3`, `tsx 4.21.0`.
- **Key Libraries**: `qrcode` (QR matrix generation at ECC Level Q), `jsqr` (client/Option B QR payload decoding), `lucide-react` (UI icons), `dotenv`.
- **Verification Commands**:
  - `npm run lint` → `tsc --noEmit` (must exit `0`)
  - `npm run build` → `vite build` (must exit `0`)
  - `npm run dev` → `tsx server.ts` on `http://0.0.0.0:3000`
  - `npm start` → `node server.ts` (production)

---

## 3. Data Model (`src/types/edison.ts`, Schema Version 6 — 13 Collections)

1. `users`: `UserAccount` (`id`, salted scrypt `passwordHash`, `role`: `'advertiser' | 'opportunity_submitter' | 'admin'`, `verificationStatus`, `isPrototypeSeed`).
2. `sessions`: `SessionRecord` (`token`, `userId`, `role`, 7-day expiry).
3. `advertiserProfiles`: `AdvertiserProfile` (`registered_business | individual_sole_trader | public_ngo`, registration ID, verification status/notes).
4. `campaigns`: `CampaignRecord` (10-state lifecycle: `draft` -> `submitted` -> `under_review` -> `approved`/`rejected` -> `scheduled` -> `active` -> `paused` -> `completed`/`expired`; `paymentCollectionActive: false`; simulated rate-card estimate).
5. `adCreatives`: `AdCreativeRecord` (`option_a_studio` layout elements JSON + `option_b_upload` file metadata + `jsQR` inspection status `none_found | decoded_matched | decoded_mismatch | suspected_unreadable`).
6. `qrLinks`: `QrLinkRecord` (`token`, `ownerId`, `resolvedUrl`, `status`, redirect counters).
7. `opportunities`: `OpportunityRecord` (14 categories, `registered_organisation | individual_informal_employer`, independent 3-tier verification: identity / organisation / specific opportunity, anti-scam risk flags, `advertisingFeeInfluencesVerification: false`).
8. `opportunityComplaints`: `OpportunityComplaintRecord` (scam/guarantee/broken-QR reports, investigation statuses, cascade suspension).
9. `opportunityAppeals`: `OpportunityAppealRecord` (submitter appeal reason, extra evidence, reinstatement/denial decision).
10. `supportTickets`: `SupportTicketRecord` (campaign review, verification enquiry, QR technical, billing dispute, policy appeal).
11. `analyticsEvents`: `AnalyticsEventRecord` (strictly separates `simulated_prototype` vs `real_measured` `/r/:token` vs Stage 7 `destination_opened` / `verified_conversion`).
12. `physicalQrScanTests`: `PhysicalQrScanTestRecord` (real mobile phone device model, OS, camera app, scan latency, server-observed 302 count at log time).
13. `auditLogs`: `AuditLogRecord` (immutable governance, auth, media upload, moderation, and QA audit entries).

---

## 4. Main Application End-to-End Flows

1. **Auth & Onboarding**: `AuthRbacView` (`/api/auth/login`, `/api/auth/register`) -> `AdvertiserProfileView` (`PUT /api/advertiser/profile`) -> Admin KYC approval (`PATCH /api/admin/advertiser-profiles/:userId/verification`).
2. **Campaign & Ad Production**: `CampaignsView` (`POST /api/campaigns`) -> `AdStudioView` (`POST /api/media/upload` + `POST /api/ad-creatives` + `POST /api/ad-creatives/:id/attach`).
3. **16:9 Preview Gate & Break Simulation**: `TvPreviewView` (`GET /api/campaigns/:id/preview-gate`, `POST /api/campaigns/:id/transition`, `POST /api/simulator/events`).
4. **Opportunities & 3-Tier QA**: `OpportunityView` (`POST /api/opportunities`, `POST /api/opportunities/:id/submit`, `PATCH /api/admin/opportunities/:id/verify-tiers`, complaints & appeals).
5. **Admin Moderation & 7-Stage Funnel**: `AdminAnalyticsView` (`GET /api/admin/moderation-overview`, playable 16:9 `CreativeStage`, `POST /api/admin/creatives/:id/clear-qr-flag` blocking `decoded_mismatch`, `PATCH /api/admin/qr/:token/moderate`, `GET /api/analytics/funnel`, filterable `/api/admin/audit-logs`).
6. **Physical Mobile QR QA & Handover**: `QaHandoverView` (`GET /api/qa/qr-watch/:token`, `POST /api/qa/physical-qr-tests`, `GET /api/qa/prototype-readiness`).

---

## 5. Key Architecture Decisions (`DECISIONS_LOG.md`)

- `ADR-001`: Do not rely on unprivileged 3P Smart TV background channel hijacking.
- `ADR-002`: Direct-to-destination QR routing (`/r/:token` -> HTTP `302`; no phone ad screen).
- `ADR-003`: 3-tier opportunity verification strictly decoupled from advertising payment.
- `ADR-004`: Strict separation of `simulated_prototype` vs `real_measured` vs Stage 7 unverified analytics.
- `ADR-005`: Conservative fail-safe break formula; skip on uncertainty; restore ordinary TV.
- `ADR-006`: Decouple contextual opportunity access from ad-tracking consent (`[LEGAL REVIEW PENDING]`).
- `ADR-007`: Manual GitHub Command Centre (`coordination/EDISON_COMMAND_CENTER.md`) without polling.
- `ADR-008`: Anchor `.gitignore` to `/data/` so `src/data/` stays tracked in Git.
- `ADR-009`: Version permanent governance & `Commit & Next` UI shortcut in GitHub.
- `ADR-010`: Owner `"Next"` confirms preceding block commit.

---

## 6. Annotated File Directory

- `server.ts` — Express server, auth/session cookies & Bearer tokens, `/api/media/upload`, `/uploads/:filename`, `/r/:token`, all Phase 2 APIs
- `src/server/store.ts` — Atomic JSON store (`schemaVersion: 6`), seed data, RBAC, workflows, 7-stage funnel, readiness checks
- `src/server/qrValidator.ts` — URL/phone validation & safe scheme normalisation
- `src/server/mediaSecurity.ts` — Magic-byte upload validation & path traversal protection
- `src/types/edison.ts` — Domain TypeScript contracts
- `src/App.tsx` — Navigation shell & `Commit & Next` top shortcut
- `src/components/FoundationViews.tsx` — `AuthRbacView`, `QrEngineView`
- `src/components/CampaignViews.tsx` — `AdvertiserProfileView`, `CampaignsView`
- `src/components/AdStudioView.tsx` — Option A Studio & Option B Upload/jsQR Inspector
- `src/components/TvPreviewView.tsx` — 16:9 TV Preview (`CreativeStage`), Pre-Submit Gate & Commercial-Break Simulator
- `src/components/OpportunityView.tsx` — 14-Category Opportunities, 3-Tier QA, Complaints & Appeals
- `src/components/AdminAnalyticsView.tsx` — Playable 16:9 Admin Moderation & 7-Stage Analytics
- `src/components/QaHandoverView.tsx` — Physical QR Scan Lab, Prototype Readiness Audit & Handover Exporter
- `src/components/Views.tsx` + `src/data/documents.ts` + `src/data/phase1Data.ts` — Governance, 28-Document Browser, Roadmap & Report Console
- `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md` — Deferred Phase 4/5 open-source research shortlist (`Status: DEFERRED`)

---

## 7. Verification Evidence & Honest Pending Checks

- **Verified Automated Invariants**: `compile_applet` (`vite build`), `lint_applet` (`tsc --noEmit`), and live E2E verification scripts (`BLOCK21` through `BLOCK27_E2E_OK`, `7/7` automated store invariants passing, Stage 7 `verifiedDestinationOpens === 0`).
- **Pending Owner Physical Phone Scan**: Live runtime store currently records `0` persisted physical smartphone camera scan tests (`PENDING_OWNER_DEVICE_TEST`). Project Owner can log a physical device scan anytime via the `QR QA & VS Code Handover` tab or Phase 3 QA.
- **Pending Browser E2E**: No Chromium binary exists inside the AI Studio container; Playwright DOM E2E suite is queued in `TASK-P3-003`.

---

## 8. Known Technical Limitations (`KNOWN_LIMITATIONS.md`)

1. Single-host JSON file store (`data/edison-store.json`) is not suitable for multi-instance cloud deployment.
2. Media upload route stores raw validated image/video blobs without FFmpeg transcoding or EBU R128 loudness normalisation.
3. No rate limiting, CSRF tokens, or automated Vitest/Playwright suite exists in Phase 2.
4. Zero real payment gateways (`paymentCollectionActive: false`), zero legal approvals, and zero physical Smart TV hardware integrations exist.

---

## 9. Ordered Phase 3 VS Code Copilot Engineering Tasks

1. **`TASK-P3-001` (`READY` in `coordination/EDISON_COMMAND_CENTER.md`)**: Migrate `EdisonPrototypeStore` to PostgreSQL with schema migrations, foreign-key constraints, and strict transactional audit logging.
2. **`TASK-P3-002`**: Harden authentication/session cookies, CSRF protection, rate limiting, and Zod request validation schemas.
3. **`TASK-P3-003`**: Implement automated Vitest unit/API suite and Playwright browser E2E suite (desktop + mobile responsiveness + RBAC + 16:9 preview + Option B QR mismatch).
4. **`TASK-P3-004`**: Implement production media worker pipeline (FFmpeg 1080p/720p transcode, loudness normalisation, server-side multi-frame QR extraction).

---

## 10. VS Code Command Centre Execution Protocol

1. Pull latest GitHub commits on the local repository.
2. Read `coordination/EDISON_COMMAND_CENTER.md`, `VSCODE_HANDOVER_PACKAGE.md`, and `DECISIONS_LOG.md`.
3. Execute **only** the task marked `Status: READY` (`TASK-P3-001`) within its defined scope and safety boundaries.
4. Update Section 4 (`COPILOT EXECUTION REPORT`) with exact files modified, commands executed, test outputs, exit codes, and limitations, and set status to `AWAITING REVIEW` for AI Studio review.
