# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.

---

## 1. PROJECT OWNER MESSAGE

> Phase 1 committed to GitHub. Proceeding to Phase 2 (AI Studio Functional Prototype), Block 2.1: Express server foundation, atomic prototype persistence, role-based authentication, and real QR destination validation & redirect routing.

---

## 2. AI STUDIO INSTRUCTIONS

1. Execute Phase 2 sequentially by implementation block (`2.1` through `2.7`).
2. Enforce strict boundaries: no real payments, no real advertiser/employer outreach, no fake Smart TV integration.
3. Keep VS Code Copilot status as `DRAFT` (standby) until Phase 2 prototype and physical QR scan verification are complete and the full handover package is prepared.

---

## 3. PENDING COPILOT TASK

- **Task ID**: `TASK-001-PHASE2-PROTOTYPE-IN-PROGRESS`
- **Date and Time**: `2026-11-14T05:55:00-08:00`
- **Sender**: `AI Studio (Chief Engineer / Architect)`
- **Recipient**: `VS Code Copilot (Standby — No Action Required Yet)`
- **Phase, Stage, and Substage**: `Phase 2 / Stage 2.1 / Block 2.1 — Application Foundation, Persistence & QR Redirect Core`
- **Objective**: AI Studio is building the Phase 2 functional prototype (`server.ts`, prototype store, Auth/RBAC, QR redirect `/r/:token`) prior to Phase 3 VS Code handover.
- **Context**: Phase 1 was committed to GitHub by the Project Owner. VS Code Copilot remains on standby until Phase 2 handover (`TASK-P3-001`) transitions to `READY`.
- **Required Action**: **NONE — Standby.** No `READY` task is assigned to VS Code Copilot yet.
- **Relevant Files and Dependencies**:
  - `server.ts`, `src/types/edison.ts`, `src/server/store.ts`, `src/server/qrValidator.ts`, `src/components/FoundationViews.tsx`.
- **Acceptance Criteria**:
  - N/A for Copilot while status is `DRAFT`.
  - For AI Studio Block 2.1: Express + Vite server boots on port 3000; registration/login/RBAC verified (`403` on non-admin `/api/admin/audit-logs`); QR validation rejects unsafe schemes/shorteners; `/r/:token` executes `302` redirect and increments `real_measured` scans; `tsc --noEmit` and `vite build` pass.
- **Safety Restrictions**:
  - No destructive Git operations; no commits/pushes without owner confirmation.
  - No real payments or external outreach.
  - Do not claim physical smartphone QR scanning is verified until tested with a real device.
- **Status**: `DRAFT` (No `READY` task for VS Code Copilot yet)
- **Expected Report**: Copilot must report `"No READY task available"` if triggered prematurely while status is `DRAFT`.

---

## 4. COPILOT EXECUTION REPORT

*No VS Code Copilot tasks have been executed yet.*

---

## 5. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Assessment**: Phase 1 committed by Project Owner. Phase 2 Block 2.1 implemented and undergoing build/API/server verification.

---

## 6. NEXT ACTION

1. **AI Studio**: Verify `tsc --noEmit`, `vite build`, restart dev server on `server.ts`, and test live API endpoints (`/api/health`, `/api/auth/*`, `/api/admin/audit-logs`, `/api/qr/*`, `/r/:token`).
2. **Project Owner**: Review Block 2.1 in the live preview, commit Block 2.1 to GitHub, and confirm commit completion to unlock **Block 2.2 (Advertiser Profiles & 10-State Campaign Management)**.

---

## 7. TASK HISTORY

| Task ID | Date | Sender -> Recipient | Phase / Stage | Status | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-000-PHASE1-BOOTSTRAP` | 2026-11-14 | AI Studio -> Owner / Standby | Phase 1 / Stage 1.1 | `COMPLETE` | 25 docs, Smart TV preliminary research, Command Centre & Copy Report console committed to GitHub. |
| `TASK-001-PHASE2-PROTOTYPE-IN-PROGRESS` | 2026-11-14 | AI Studio -> Copilot (Standby) | Phase 2 / Block 2.1 | `DRAFT` | Express + Vite server, scrypt auth/RBAC, atomic JSON store, QR validator & `/r/:token` redirect engine. |
