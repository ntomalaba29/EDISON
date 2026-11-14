# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.

---

## 1. PROJECT OWNER MESSAGE

> Block 2.1 committed to GitHub. Proceeding to Phase 2 (AI Studio Functional Prototype), Block 2.2: Advertiser profiles, verification submission workflow, support/dispute tickets, simulated rate-card estimates, and full 10-state campaign management.

---

## 2. AI STUDIO INSTRUCTIONS

1. Execute Phase 2 sequentially by implementation block (`2.1` through `2.7`).
2. Enforce strict boundaries: no real payments (`paymentCollectionActive: false`), no real advertiser/employer outreach, no fake Smart TV integration.
3. Keep VS Code Copilot status as `DRAFT` (standby) until Phase 2 prototype and physical QR scan verification are complete and the full handover package is prepared.
4. Keep the one-click `"Committed, next"` clipboard shortcut button visible across all EDISON app views (`src/components/CopyReportFooter.tsx`), and always include a copyable `"Committed, next"` line at every block commit gate (note: AI Studio host chat suggestion chips and system prompt settings can only be modified by the Project Owner in AI Studio settings, not by the assistant).

---

## 3. PENDING COPILOT TASK

- **Task ID**: `TASK-002-PHASE2-BLOCK22-PROTOTYPE`
- **Date and Time**: `2026-11-14T06:18:00-08:00`
- **Sender**: `AI Studio (Chief Engineer / Architect)`
- **Recipient**: `VS Code Copilot (Standby — No Action Required Yet)`
- **Phase, Stage, and Substage**: `Phase 2 / Stage 2.2 / Block 2.2 — Advertiser Profiles & 10-State Campaign Management`
- **Objective**: AI Studio has implemented Block 2.2 (Advertiser profiles, verification queue requests, support tickets, simulated billing estimates, and full 10-state campaign CRUD/cloning/transition APIs + UI) prior to Block 2.3 (Advertisement Creation Studio).
- **Context**: Phase 1 and Phase 2 Block 2.1 are committed to GitHub. VS Code Copilot remains on standby until Phase 2 handover (`TASK-P3-001`) transitions to `READY`.
- **Required Action**: **NONE — Standby.** No `READY` task is assigned to VS Code Copilot yet.
- **Relevant Files and Dependencies**:
  - `server.ts`, `src/types/edison.ts`, `src/server/store.ts`, `src/components/CampaignViews.tsx`, `src/App.tsx`.
- **Acceptance Criteria**:
  - N/A for Copilot while status is `DRAFT`.
  - For AI Studio Block 2.2: Advertiser profile edit & verification request persisted; all 10 campaign states enforced (`draft`, `submitted`, `under_review`, `approved`, `rejected`, `scheduled`, `active`, `paused`, `completed`, `expired`); QR validation required prior to campaign submission; admin-only RBAC on review transitions (`under_review`/`approved`/`rejected`) and advertiser verification decisions; billing preview explicitly labelled simulated (`paymentCollectionActive: false`).
- **Safety Restrictions**:
  - No destructive Git operations; no commits/pushes without owner confirmation.
  - Zero real payment collection or live invoicing.
- **Status**: `DRAFT` (No `READY` task for VS Code Copilot yet)
- **Expected Report**: Copilot must report `"No READY task available"` if triggered prematurely while status is `DRAFT`.

---

## 4. COPILOT EXECUTION REPORT

*No VS Code Copilot tasks have been executed yet.*

---

## 5. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Assessment**: Phase 1 and Phase 2 Block 2.1 committed by Project Owner. Block 2.2 implemented and verified against typechecking, production build, and live REST API CRUD/RBAC/state-machine integration checks.

---

## 6. NEXT ACTION

1. **Project Owner**: Review Block 2.2 in the live preview, commit Block 2.2 to GitHub, and confirm commit completion to unlock **Block 2.3 (Advertisement Creation Studio — Option A Builder & Option B Media Upload/QR Inspection)**.

---

## 7. TASK HISTORY

| Task ID | Date | Sender -> Recipient | Phase / Stage | Status | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-000-PHASE1-BOOTSTRAP` | 2026-11-14 | AI Studio -> Owner / Standby | Phase 1 / Stage 1.1 | `COMPLETE` | 25 docs, Smart TV preliminary research, Command Centre & Copy Report console committed to GitHub. |
| `TASK-001-PHASE2-PROTOTYPE-IN-PROGRESS` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.1 | `COMPLETE` | Express + Vite server, scrypt auth/RBAC, lockfile+fsync atomic JSON store, QR validator & `/r/:token` redirect engine committed. |
| `TASK-002-PHASE2-BLOCK22-PROTOTYPE` | 2026-11-14 | AI Studio -> Copilot (Standby) | Phase 2 / Block 2.2 | `DRAFT` | Advertiser profiles, verification submission, support tickets, simulated billing estimate, and 10-state campaign management. |
