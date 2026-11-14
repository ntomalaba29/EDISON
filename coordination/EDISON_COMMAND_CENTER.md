# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.

---

## 1. PROJECT OWNER MESSAGE

> Block 2.3 committed to GitHub (`Next` = committed rule active per ADR-010). Proceeding to Phase 2 (AI Studio Functional Prototype), Block 2.4: Full 16:9 Television Preview, Pre-Submission Approval Gate & Commercial-Break Simulator.

---

## 2. AI STUDIO INSTRUCTIONS

1. Execute Phase 2 sequentially by implementation block (`2.1` through `2.7`).
2. Enforce strict boundaries: no real payments (`paymentCollectionActive: false`), no real advertiser/employer outreach, no fake Smart TV integration.
3. Enforce Advertisement Creation Studio Option B QR integrity rules: never overwrite an existing QR code silently; block campaign submission on mismatch; flag unreadable/suspected QR uploads for admin review.
4. Keep VS Code Copilot status as `DRAFT` (standby) until Phase 2 prototype and physical QR scan verification are complete and the full handover package is prepared.
5. Keep the one-click **`Commit & Next`** clipboard shortcut button visible in the persistent header (`src/App.tsx`) and report footers (`src/components/CopyReportFooter.tsx`), copying `"Committed to GitHub. Please proceed to the next block."`.
6. Maintain `EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md` and `SESSION_CONTINUITY_LOG.md` in GitHub so any Google account importing `Malaba29/EDISON-International-Smart-TV-Advertising-Network-` retains full rules, project path, and session history.

---

## 3. PENDING COPILOT TASK

- **Task ID**: `TASK-004-PHASE2-BLOCK24-PROTOTYPE`
- **Date and Time**: `2026-11-14T07:50:00-08:00`
- **Sender**: `AI Studio (Chief Engineer / Architect)`
- **Recipient**: `VS Code Copilot (Standby — No Action Required Yet)`
- **Phase, Stage, and Substage**: `Phase 2 / Stage 2.4 / Block 2.4 — Full 16:9 TV Preview, Pre-Submit Gate & Break Simulator`
- **Objective**: AI Studio is implementing Block 2.4 (Playable 16:9 TV Preview Player with fullscreen & Test QR Destination, server-enforced Pre-Submission Approval Gate, and explicitly labelled Commercial-Break Simulator returning to live simulated TV timestamp) prior to Block 2.5 (Opportunity Submission & 3-Tier Verification).
- **Context**: Phase 1 and Blocks 2.1–2.3 are committed to GitHub. VS Code Copilot remains on standby until Phase 2 handover (`TASK-P3-001`) transitions to `READY`.
- **Required Action**: **NONE — Standby.** No `READY` task is assigned to VS Code Copilot yet.
- **Relevant Files and Dependencies**:
  - `server.ts`, `src/server/store.ts`, `src/types/edison.ts`, `src/components/TvPreviewView.tsx`, `src/components/CampaignViews.tsx`, `src/components/AdStudioView.tsx`, `src/App.tsx`.
- **Acceptance Criteria**:
  - N/A for Copilot while status is `DRAFT`.
  - For AI Studio Block 2.4: Full 16:9 playable preview (Option A & Option B video/image) with Play/Pause/Restart/Fullscreen/Test QR/Return to Editor; server-enforced Pre-Submission Gate blocking missing/mismatched creative/QR; Commercial-Break Simulator with `SIMULATION — NOT LIVE BROADCAST TUNER` label, break countdown, companion phone scan panel, and automatic + immediate Manual Return to advancing live TV clock.
- **Safety Restrictions**:
  - No fake Smart TV tuner claims; simulator events explicitly tagged `measurementSource: 'simulated_prototype'`.
- **Status**: `DRAFT` (No `READY` task for VS Code Copilot yet)
- **Expected Report**: Copilot must report `"No READY task available"` if triggered prematurely while status is `DRAFT`.

---

## 4. COPILOT EXECUTION REPORT

*No VS Code Copilot tasks have been executed yet.*

---

## 5. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Assessment**: Phase 1 and Blocks 2.1–2.3 committed by Project Owner. Block 2.4 (Playable 16:9 TV Preview Player, Server-Enforced Pre-Submission Gate & Commercial-Break Simulator) has been implemented, compiled (`npm run build`), type-checked (`tsc --noEmit`), and verified against the live Express/Vite server (`BLOCK24_E2E_OK`). Status is `VERIFIED · AWAITING COMMIT`.

---

## 6. NEXT ACTION

1. **Project Owner**: Review Block 2.4 changes, commit to GitHub, and reply **`Next`** (or click **`Commit & Next`**) per ADR-010 to unlock Block 2.5 (Opportunity Submission & 3-Tier Verification).

---

## 7. TASK HISTORY

| Task ID | Date | Sender -> Recipient | Phase / Stage | Status | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-000-PHASE1-BOOTSTRAP` | 2026-11-14 | AI Studio -> Owner / Standby | Phase 1 / Stage 1.1 | `COMPLETE` | 25 docs, Smart TV preliminary research, Command Centre & Copy Report console committed to GitHub. |
| `TASK-001-PHASE2-PROTOTYPE-IN-PROGRESS` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.1 | `COMPLETE` | Express + Vite server, scrypt auth/RBAC, lockfile+fsync atomic JSON store, QR validator & `/r/:token` redirect engine committed. |
| `TASK-002-PHASE2-BLOCK22-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.2 | `COMPLETE` | Advertiser profiles, verification submission, support tickets, simulated billing estimate, and 10-state campaign management committed. |
| `TASK-003-PHASE2-BLOCK23-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.3 | `COMPLETE` | Advertisement Creation Studio (Option A & Option B) + cross-account governance continuity committed. |
| `TASK-004-PHASE2-BLOCK24-PROTOTYPE` | 2026-11-14 | AI Studio -> Copilot (Standby) | Phase 2 / Block 2.4 | `DRAFT` | Full 16:9 TV Preview, Pre-Submission Approval Gate & Commercial-Break Simulator. |
