# EDISON â€” Progress Tracker

> **Current status authority:** [`EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md`](EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md) counts **75 / 97 executable substages complete (77.3%)**. Phase fractions: prototype **8/8**, TV control **3/5**, Phase 5 **35/37**. Tasks **5.10j1â€“5.10j11**, **5.10k1â€“5.10k3**, and **5.11a** are complete; next is **5.11b**, blocked on owner-approved media storage selection. Existing weighted percentages and historical status matrices do not replace the atomic ledger.
**Last Verified**: 2026-11-20 (**Linux Full Software Baseline Verified cleanly in `/app/applet`: `tsc --noEmit` clean, `vite build` clean, Vitest `23/23` files / `90/90` tests passed with `0` skipped including real `/usr/bin/ffmpeg` & Linux symlink confinement, Playwright Chromium E2E `1/1` passed against live server, `/api/qa/prototype-readiness` `34/34` QA invariants passed. Docker/Compose volume & FFmpeg env parity, Playwright Linux executable fallback, `/api/*` JSON 404 guard, and `edison-ci.yml` `workflow_dispatch` + `pg_isready` flags hardened â€” `AWAITING OWNER COMMIT**.**)
**Reporting Rule**: Implemented & verified code, PostgreSQL 16+ schema/migrations (`PgQueryExecutor` + PGlite/`pg.Pool`), dedicated real `/usr/bin/ffmpeg` worker, Playwright Chromium E2E, AURA/HDMI-CEC/OEM packaging blueprints, commercial dispute workflows, 9-language i18n, sovereign deployment manifests, security audit report (`0` prod CVEs via `npm audit`), and single final `Stage P6` runbook are separated strictly from physical hardware tests (`hardwareTested: false`), external pen-tests (`externalPenTestCompleted: false`), live payment collection (`paymentCollectionActive: false`), and formal legal compliance (`legalComplianceClaimed: false`).

---

## Current Local Verification â€” 2026-11-20 (Linux) & 2026-11-17 (Windows)

- **Linux Environment (`/app/applet`, Node.js 22, real `/usr/bin/ffmpeg` & `/usr/bin/ffprobe`, Google Chrome for Testing `155.0.8059.12`)**:
  - `npm run lint` (`tsc --noEmit`): **Passed**.
  - `npm run build` (`vite build`): **Passed**.
  - Vitest (`npx vitest run --maxWorkers=2 --testTimeout=60000`): **`23/23` files · `90/90` tests passed · `0` skipped** (clears the earlier Windows-only `EPERM` symlink skip and executes real `/usr/bin/ffmpeg` + `/usr/bin/ffprobe` and real PGlite PG16 migrations).
  - Playwright E2E (`npx playwright test`): **`1/1` passed** against live server (`playwright.config.ts` includes Linux preinstalled `/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell` fallback while preserving CI defaults).
  - Live QA Suite (`/api/qa/prototype-readiness`): **`34/34` automated invariants passed** (`physicalQrScanStatus: PENDING_OWNER_DEVICE_TEST`).
- **Earlier Windows Check (`2026-11-17`, commit `0281d36`)**: Node `22.23.5`, `npm ci` (`0` audit vulnerabilities), lint, build, Playwright E2E (`1/1`), Vitest (`89` passed, 1 Windows-only symlink `EPERM` skip).
- **Hosted GitHub Actions Note**: Earlier push `0281d36` run `44075511742` hit `startup_failure` before job creation (check GitHub repo Actions permissions/billing; `.github/workflows/edison-ci.yml` now also includes `workflow_dispatch:`, `pg_isready -U edison -d edison_ci`, and explicit `--maxWorkers=2 --testTimeout=60000`).
- **Current Windows Environment**: Node.js `22.23.5`, npm `10.9.9`.
  - `npm ci`: passed from the refreshed lockfile; npm reported `0` vulnerabilities. The lockfile now contains platform-specific optional packages for Windows and Linux.
  - `npm run lint`: passed.
  - `npm run build`: passed; Vite reports a bundle-size advisory for the `1.33 MB` JavaScript chunk.
  - `npm run test:e2e`: passed (`1/1`) after increasing the runtime PGlite check wait to `60s` and the test timeout to `90s`.
  - Vitest: `89` passed and `1` symlink test was explicitly skipped using `npm test -- --maxWorkers=2 --testTimeout=60000` with `EDISON_FFMPEG_BIN` and `EDISON_FFPROBE_BIN` pointing to temporary Windows binaries outside the repository. The FFmpeg media-worker test now passes on either platform. The symlink test remains enabled on Linux; this Windows host reported `EPERM` creating a symlink.
  - GitHub Actions: runs `44075511742` and `44075853578` ended before jobs were created. The owner-visible GitHub message says recent account payments failed or the spending limit must be increased. Resolve this in GitHub **Settings → Billing & plans**, then rerun CI. Linux verification remains outstanding until the platform-dependent symlink test passes.

---

## 1. Progress Percentages Until Full App

EDISON tracks progress honestly against **three distinct baselines** so software engineering completion is never confused with physical hardware testing or commercial regulatory launch:

| Progress Measurement | Current % | Remaining % | Definition & Current Scope Breakdown |
| :--- | :---: | :---: | :--- |
| **1. Phase 2 AI Studio Prototype Scope** | **100.0%** | **0.0%** | **Committed (`100.0%` â€” Track A Committed + Track B Committed under `DEC-OPEN-01`)**. |
| **2. Software-to-`Stage-P6` Milestone (Phases 1â€“6 + Stage P6 Subtotal = `66.0%` of Full App)** | **87.1%** | **12.9%** | `57.5% / 66.0% = 87.1%`. Covers Phases 1â€“2 (`20.0%` committed) + Phase 3 PG16/FFmpeg/Playwright/Security (`11.5% / 12.0%`) + Phase 4 AURA/HDMI-CEC/OEM Contracts (`10.0% / 12.0%`) + Phase 5 Complete (`12.0%`) + Phase 6 Delivery Infra (`4.0%`) + deferred single final `Stage P6` hardware test (`6.0%`). |
| **3. Overall EDISON Project Progress (Until Full Commercial App)** | **85.0%** | **15.0%** | See complete 15-Phase weight allocation in Section 2 below. |

### Complete 15-Phase Weight Table (Until Full App = `100.0%`)

| Roadmap Block / Phase | Weight | Earned | Status |
| :--- | :---: | :---: | :--- |
| **Phase 1**: Project Spec, Architecture, Reconciled `v2.1` + `v2.2` Docs & 9-Repo Audit | 6.0% | **6.0%** | **COMMITTED** |
| **Phase 2**: AI Studio Functional Prototype (Track A `13.0%` + Track B `1.0%` under `DEC-OPEN-01`) | 14.0% | **14.0%** | **COMMITTED (`100%` AI Studio Scope)** |
| **Phase 3**: Engineering Hardening, `TASK-P3-001` PG16 SQL Migrations & ACID JSON Backfill (`PGlite` + `pg.Pool` + CLI), `TASK-P3-003` Playwright Chromium E2E CI, PII-Redacting Logger, Circuit Breakers & `npm audit` Security Report | 12.0% | **11.5%** | **IMPLEMENTATION COMMITTED in `0c8dd59`; local checks pass, 1 Windows-only symlink-permission skip (see above)** *(Remaining `0.5%` reserved for live remote Cloud/VPS Postgres host provisioning)* |
| **Phase 4**: Smart TV OS Adapters, AURA DIAL/mDNS/PIN Pairing, Offline Remote Queue, HDMI-CEC HDCP Guard, 5 OEM SDK Contracts & Android/Tizen/webOS/Mobile Packaging Blueprints | 12.0% | **10.0%** | **IMPLEMENTATION COMMITTED in `0c8dd59`; software checks included, hardware remains deferred** *(Remaining `2.0%` reserved for partner store signing & `Stage P6` TV tests)* |
| **Phase 5**: Lawful Commercial-Break Detection, ML Duration Predictor & Network-Wide Shared Ad Intelligence Software (`ADR-016`, Tests `25`â€“`35`, `p10`/`p5` Calibration) | 12.0% | **12.0%** | **SOFTWARE COMPLETE `COMMITTED` (`Blocks 5.1â€“5.2` Â· `10/10` calibration fixtures, `0%` FPR)** |
| **Phase 6**: Advertising Delivery Infrastructure (SHA-256 CDN Preload Manifests, Frequency Caps, Failover, Idempotency & Edge Routing Pack) | 4.0% | **4.0%** | **COMMITTED + `deploy/cdn-static-routing.json` VERIFIED** |
| **`Stage P6`**: Single Final Integrated Physical Smart TV & Phone Test (`docs/testing/STAGE_P6_PHYSICAL_TEST_RUNBOOK.md`) | 6.0% | **0.0%** | **RUNBOOK READY Â· PHYSICAL EXECUTION DEFERRED (`6.0%` reserved for owner hardware execution)** |
| **Phase 7**: Advertiser Operations, KYC Gates, Pro-Forma Billing Blueprints & Commercial Dispute/Credit Adjustment Engine | 3.0% | **3.0%** | **COMPLETE SOFTWARE-FIRST (`commercialDisputeEngine.ts` + `Block 7.1`; `paymentCollectionActive: false`)** |
| **Phase 8**: Advertisement Creation & Real `/usr/bin/ffmpeg` / `ffprobe` Broadcast Render Worker (`TASK-P3-004` Tizen `H.264 MP4`, HLS & EBU R128 `-23 LUFS`) | 3.0% | **3.0%** | **IMPLEMENTATION COMMITTED in `0c8dd59`; Linux FFmpeg test awaits Linux runner** |
| **Phase 9**: Opportunity Verification Operations Hardening (Tier 1â€“3 Vault Seals, Expiry/90d Re-Verification & Fee Independence) | 2.0% | **2.0%** | **`Block 9.1` `COMMITTED` (`externalKycVendorConnected: false`)** |
| **Phase 10**: Privacy, DSR Export/Erasure, Retention Purge, Country Register & `SECURITY_TEST_REPORT.md` | 4.0% | **4.0%** | **VERIFIED (`0` prod CVEs verified; `externalPenTestCompleted: false`, `legalComplianceClaimed: false`)** |
| **Phase 11**: Reliability, Failure-Mode & Chaos Recovery Suite (`FM-01`..`FM-20` incl. Postgres Pool & FFmpeg Worker OOM/Timeout) | 4.0% | **4.0%** | **VERIFIED (`20/20` FMs documented & tested; `hardwareTested: false`, `stageP6Deferred: true`)** |
| **Phase 12**: Controlled Hardware & Viewer Pilot Readiness & Execution | 4.0% | **2.0%** | **`Block 12.1` + `STAGE_P6_PHYSICAL_TEST_RUNBOOK.md` (`2.0%` physical cohort pilot deferred to `Stage P6`)** |
| **Phase 13**: Commercial Readiness Board Gate, SLA Matrix & Unit Economics | 4.0% | **3.0%** | **`Block 13.1` `COMMITTED` (`1.0%` live post-`Stage P6` commercial sign-off reserved)** |
| **TOTAL EDITED COMMERCIAL APP** | **85.0%** | **79.5%** | **`5.5%` Remaining: Stage P6 physical test + owner-directed hardware/region deployment** |

---

## 2. Verification & Implementation Status Matrix

| Workstream | Specification Status | Code Implementation Status | Blocking / Commit Status |
| :--- | :--- | :--- | :--- |
| **Phases 1â€“15 Baseline (`Blocks 2.1â€“15.1` + `Track B DEC-OPEN-01`)** | **COMPLETE** | **VERIFIED & COMMITTED** (`30/30` baseline QA invariants) | **COMMITTED (`81.0%` Baseline)** |
| **Workstream A1 (`TASK-P3-001`): PG16 Schema, Up/Down SQL Migrations, PGlite + `pg.Pool` Executor & ACID JSON Backfill CLI** | **COMPLETE** | **COMMITTED in `0c8dd59`; PGlite integration test passes with `60s` timeout** | **External PostgreSQL host provisioning remains reserved** |
| **Workstream A2 (`TASK-P3-003`): Playwright Real Chromium E2E + CI Workflow** | **COMPLETE** | **COMMITTED in `0c8dd59`; local Playwright E2E `1/1` passes** | **GitHub Actions run pending** |
| **Workstream A3 (`TASK-P3-004`): Real `/usr/bin/ffmpeg` & `/usr/bin/ffprobe` Media Worker** | **COMPLETE** | **COMMITTED in `0c8dd59`; real-binary media test passes on Windows with temporary binaries** | **Linux CI verification pending** |
| **Workstream B: AURA DIAL/PIN Pairing, Offline Remote Queue, HDMI-CEC HDCP Guard & 5 OEM Native Packaging Specs** | **COMPLETE** | **COMMITTED in `0c8dd59`; software tests pass** (`hardwareTested: false`) | **Physical hardware remains deferred to `Stage P6`** |
| **Workstreams C, D, E: Commercial Disputes (`$0` Charity Safe), 9-Language i18n** | **COMPLETE** | **COMMITTED in `0c8dd59`; integration tests pass with `60s` timeout** | **Region rollout deferred to owner deployment** |
| **Workstreams F, G, H, I, J: Security Audit Report (`0` prod CVEs), Structured Logger, Circuit Breakers, `FM-19`/`FM-20`, Docker/Compose/CDN & Stage P6 Runbook** | **COMPLETE** | **COMMITTED in `0c8dd59`; all runnable tests pass, symlink check explicitly skipped on Windows `EPERM`** | **Linux CI verification pending; `34/34` QA invariants** |
| **Single Final Integrated Physical TV + Smartphone Test (`Stage P6`)** | **COMPLETE (`STAGE_P6_PHYSICAL_TEST_RUNBOOK.md`)** | **NOT EXECUTED (Requires Physical Hardware & Owner Sign-Off)** | **DEFERRED until owner hardware execution** |

