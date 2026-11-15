# EDISON — Progress Tracker

**Last Verified**: 2026-11-15 (Pre-Commit Specification `v2.1` + Network-Wide Shared Ad Intelligence `v2.2` Addendum + Uncommitted `P2-FIX.6`)  
**Reporting Rule**: Implemented code, uncommitted fixes, documentation specifications, unresolved owner decisions, and production readiness are tracked strictly separately. Never mark approved core requirements (`v2.2`) as implemented code.

---

## 1. Progress Summary

- **Current Phase**: Phase 2 — Functional Prototype & Specification Alignment
- **Committed Baseline (Prior Records)**: Phase 1 governance docs + Phase 2 Blocks 2.1–2.7 (`server.ts`, `store.ts` v6, `AdStudioView`, `TvPreviewView`, `OpportunityView`, `AdminAnalyticsView`, `QaHandoverView`). *(`.git` unavailable inside sandbox.)*
- **Uncommitted Local Batch Ready for One Combined Owner Review / Commit**:
  1. **`P2-FIX.6` (Verified Code Cleanup, UNCOMMITTED)**: `package.json` renamed (`edison-smart-tv-network`), `@google/genai` removed, `.env.example` cleaned.
  2. **Pre-Commit Reconciled Specification `v2.1` (Documentation Only, UNCOMMITTED)**: Verified 9-repo GitHub audit, exposed `DEC-OPEN-01` Consent Conflict, enforced single final `Stage P6` test, removed lawyer dependency, flagged GAM CTV format uncertainty (`DEC-OPEN-03`).
  3. **Blueprint `v2.2` Addendum — Network-Wide Shared Ad Intelligence (Documentation Only, UNCOMMITTED)**: Recorded `PRD-19` / `ADR-016` across 13 docs as an **APPROVED CORE REQUIREMENT — IMPLEMENTATION `NOT STARTED`**.
- **Application Source Status**: Zero edits made to `server.ts`, `src/**`, `package.json`, or `.env.example` during `v2.1` or `v2.2` documentation passes.

---

## 2. Verification & Implementation Status Matrix

| Workstream | Specification Status | Code Implementation Status | Blocking / Commit Status |
| :--- | :--- | :--- | :--- |
| **Phase 1 + Blocks 2.1–2.7 Baseline** | Complete | **VERIFIED ON DISK** (`tsc --noEmit` & `vite build` pass) | Reported committed prior *(except below)* |
| **`P2-FIX.6`** (`package.json`, `.env.example`) | Complete | **VERIFIED ON DISK** | **UNCOMMITTED (Combined Commit)** |
| **Blueprint `v2.1` Reconciliation + `v2.2` Shared Ad Intelligence Docs** | **COMPLETE / RECONCILED** | N/A (Documentation Only — Zero Code Changes) | **UNCOMMITTED (Combined Commit)** |
| Dual Categories (`CHARITY ADS` / `COMMERCIAL ADS`) & `$0` Charity / Free Job Lock | Complete (`ADR-011`) | **NOT STARTED** (`store.ts` bills USD uniformly) | **UNBLOCKED** *(Eligible post-commit)* |
| Commercial `Text-Only` Ad Format | Complete (`ADR-011`) | **NOT STARTED** (`AdStudioView` has Banner/Video only) | **UNBLOCKED** *(Eligible post-commit)* |
| Core Alternating Break Scheduler (`CHARITY -> COMMERCIAL`) + Direct Priority / Mock `AdNetworkAdapter` | Core Spec Ready (`DEC-OPEN-02` k=1 minor; `DEC-OPEN-03` GAM format unresolved) | **NOT STARTED** (`TvPreviewView` runs single-ad sim) | **UNBLOCKED** *(Eligible post-commit)* |
| 7-Stream Revenue-Report Separation | Complete (`ADR-012`) | **NOT STARTED** | **UNBLOCKED** *(Eligible post-commit)* |
| **Network-Wide Shared Ad Intelligence (`v2.2` — Central Service, Sync, Offline Cache, Corroboration, Rollback, Scenarios `25`–`35`)** | **APPROVED CORE REQUIREMENT (`ADR-016` / `PRD-19`)** | **NOT STARTED** | **UNBLOCKED FOR SOFTWARE PHASE 5 / SCOPED** |
| **Household 7-Level Geo, Individual Profiles, Matcher, Named TV Greetings, Dual Consent & Epoch `403` QR** | **Conflict Exposed — `DEC-OPEN-01`** | **NOT STARTED** | **`BLOCKED — AWAITING OWNER CONSENT DECISION DEC-OPEN-01` (DO NOT SCHEDULE YET)** |
| **`TASK-P3-001` (PostgreSQL / Production Hardening)** | Scoped (`DRAFT`) | **NOT STARTED** | **PAUSED (`DRAFT`)** until Phase 2 `v2.1` extensions settle |
| **Single Final Integrated Physical TV Test (`Stage P6`)** | Complete (`ADR-014`) | **NOT STARTED** | **DEFERRED UNTIL APP COMPLETION (Zero repeated HW tests)** |
