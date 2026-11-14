# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.

---

## 1. PROJECT OWNER MESSAGE

> Block 2.5 committed to GitHub (`Committed, next` per ADR-010). Executed Phase 2 (AI Studio Functional Prototype), Block 2.6: Administration, Moderation Console (with Full Playable 16:9 Preview) & 7-Stage Trustworthy Analytics.

---

## 2. AI STUDIO INSTRUCTIONS

1. Execute Phase 2 sequentially by implementation block (`2.1` through `2.7`).
2. Enforce strict boundaries: no real payments (`paymentCollectionActive: false`), no real advertiser/employer outreach, no fake Smart TV integration.
3. Enforce Advertisement Creation Studio Option B QR integrity rules: never overwrite an existing QR code silently; block campaign submission on mismatch; flag unreadable/suspected QR uploads for admin review.
4. Keep VS Code Copilot status as `DRAFT` (standby) until Phase 2 prototype and physical QR scan verification (Block 2.7) are complete and the full handover package (`TASK-P3-001`) is prepared.
5. Keep the one-click **`Commit & Next`** clipboard shortcut visible in the persistent header (`src/App.tsx`) and report footers (`src/components/CopyReportFooter.tsx`), copying `"Committed to GitHub. Please proceed to the next block."`.
6. Maintain `EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md` and `SESSION_CONTINUITY_LOG.md` in GitHub so any Google account importing `Malaba29/EDISON-International-Smart-TV-Advertising-Network-` retains full rules, project path, and session history.

---

## 3. PENDING COPILOT TASK

- **Task ID**: `TASK-006-PHASE2-BLOCK26-PROTOTYPE`
- **Date and Time**: `2026-11-14T09:33:00-08:00`
- **Sender**: `AI Studio (Chief Engineer / Architect)`
- **Recipient**: `VS Code Copilot (Standby — No Action Required Yet)`
- **Phase, Stage, and Substage**: `Phase 2 / Stage 2.6 / Block 2.6 — Admin Moderation Console & 7-Stage Trustworthy Analytics`
- **Objective**: AI Studio implemented and verified Block 2.6 (Playable 16:9 Admin Campaign Moderation, Option B QR Flag Clearance, QR/Advertiser/Ticket Governance, Filterable Audit Ledger, and RBAC-scoped 7-Stage Measurement Integrity Funnel + CSV export) prior to final Block 2.7 (Physical Mobile QR Scan Testing & VS Code Handover).
- **Context**: Phase 1, Blocks 2.1–2.5, and `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md` (`DEFERRED`) are committed to GitHub. VS Code Copilot remains on standby until Phase 2 handover (`TASK-P3-001`) transitions to `READY`.
- **Required Action**: **NONE — Standby.** No `READY` task is assigned to VS Code Copilot yet.
- **Relevant Files and Dependencies**:
  - `server.ts`, `src/server/store.ts`, `src/types/edison.ts`, `src/components/AdminAnalyticsView.tsx`, `src/components/TvPreviewView.tsx`, `src/App.tsx`.
- **Acceptance Criteria**:
  - N/A for Copilot while status is `DRAFT`.
  - For AI Studio Block 2.6: Playable 16:9 inspection inside Campaign Moderation, written rejection/moderation reasons enforced, `decoded_mismatch` blocked from manual override, 7-stage funnel keeping simulated (1–4) separate from real HTTP 302s (5–6) and unverified Stage 7 (`destination_opened`/`verified_conversion` never inferred from HTTP 302).
- **Safety Restrictions**:
  - Admin endpoints strictly guarded by `requireAdmin` (HTTP 403 for non-admins); non-admins restricted strictly to own campaign/QR analytics.
- **Status**: `DRAFT` (No `READY` task for VS Code Copilot yet)
- **Expected Report**: Copilot must report `"No READY task available"` if triggered prematurely while status is `DRAFT`.

---

## 4. COPILOT EXECUTION REPORT

*No VS Code Copilot tasks have been executed yet.*

---

## 5. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Assessment**: Phase 1, Blocks 2.1–2.5, and `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md` committed by Project Owner. Block 2.6 (Admin Moderation Console & 7-Stage Trustworthy Analytics) has been implemented, compiled (`npm run build`), type-checked (`tsc --noEmit`), and verified against the live Express/Vite server (`BLOCK26_E2E_OK`). Status is `VERIFIED · AWAITING COMMIT`.

---

## 6. NEXT ACTION

1. **Project Owner**: Review Block 2.6 changes, commit to GitHub, and reply **`Next`** (or click **`Commit & Next`**) per ADR-010 to unlock Block 2.7 (Physical Mobile Phone QR Scan Testing & VS Code Handover Package).

---

## 7. TASK HISTORY

| Task ID | Date | Sender -> Recipient | Phase / Stage | Status | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-000-PHASE1-BOOTSTRAP` | 2026-11-14 | AI Studio -> Owner / Standby | Phase 1 / Stage 1.1 | `COMPLETE` | 25 docs, Smart TV preliminary research, Command Centre & Copy Report console committed to GitHub. |
| `TASK-001-PHASE2-PROTOTYPE-IN-PROGRESS` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.1 | `COMPLETE` | Express + Vite server, scrypt auth/RBAC, lockfile+fsync atomic JSON store, QR validator & `/r/:token` redirect engine committed. |
| `TASK-002-PHASE2-BLOCK22-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.2 | `COMPLETE` | Advertiser profiles, verification submission, support tickets, simulated billing estimate, and 10-state campaign management committed. |
| `TASK-003-PHASE2-BLOCK23-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.3 | `COMPLETE` | Advertisement Creation Studio (Option A & Option B) + cross-account governance continuity committed. |
| `TASK-004-PHASE2-BLOCK24-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.4 | `COMPLETE` | Full 16:9 TV Preview, Pre-Submission Approval Gate, Commercial-Break Simulator & Deferred Repo Research Plan committed. |
| `TASK-005-PHASE2-BLOCK25-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.5 | `COMPLETE` | Opportunity Submission, Independent 3-Tier Verification, Expiry, Complaints & Appeals committed. |
| `TASK-006-PHASE2-BLOCK26-PROTOTYPE` | 2026-11-14 | AI Studio -> Copilot (Standby) | Phase 2 / Block 2.6 | `DRAFT` | Admin Moderation Console (Playable 16:9 Preview) & 7-Stage Analytics (`VERIFIED · AWAITING COMMIT`). |
