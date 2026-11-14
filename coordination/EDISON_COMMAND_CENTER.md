# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.

---

## 1. PROJECT OWNER MESSAGE

> Block 2.2 committed to GitHub. Proceeding to Phase 2 (AI Studio Functional Prototype), Block 2.3: Advertisement Creation Studio (Option A non-designer guided builder + Option B external media upload, validation, and non-overwrite QR inspection).

---

## 2. AI STUDIO INSTRUCTIONS

1. Execute Phase 2 sequentially by implementation block (`2.1` through `2.7`).
2. Enforce strict boundaries: no real payments (`paymentCollectionActive: false`), no real advertiser/employer outreach, no fake Smart TV integration.
3. Enforce Advertisement Creation Studio Option B QR integrity rules: never overwrite an existing QR code silently; block campaign submission on mismatch; flag unreadable/suspected QR uploads for admin review.
4. Keep VS Code Copilot status as `DRAFT` (standby) until Phase 2 prototype and physical QR scan verification are complete and the full handover package is prepared.
5. Keep the one-click `"Committed, next"` clipboard shortcut button visible across all EDISON app views (`src/components/CopyReportFooter.tsx`), and always include a copyable `"Committed, next"` line at every block commit gate.

---

## 3. PENDING COPILOT TASK

- **Task ID**: `TASK-003-PHASE2-BLOCK23-PROTOTYPE`
- **Date and Time**: `2026-11-14T06:50:00-08:00`
- **Sender**: `AI Studio (Chief Engineer / Architect)`
- **Recipient**: `VS Code Copilot (Standby — No Action Required Yet)`
- **Phase, Stage, and Substage**: `Phase 2 / Stage 2.3 / Block 2.3 — Advertisement Creation Studio (Option A & Option B)`
- **Objective**: AI Studio has implemented Block 2.3 (Option A guided 16:9 builder with templates, logo/product/background uploads, layer stacking/resizing, safe-zone & WCAG contrast checks, plus Option B external PNG/JPG/WebP/MP4/WebM magic-byte validation, jsQR inspection, and non-overwrite QR enforcement) prior to Block 2.4 (Full 16:9 TV Preview & Commercial-Break Simulator).
- **Context**: Phase 1, Block 2.1, and Block 2.2 are committed to GitHub. VS Code Copilot remains on standby until Phase 2 handover (`TASK-P3-001`) transitions to `READY`.
- **Required Action**: **NONE — Standby.** No `READY` task is assigned to VS Code Copilot yet.
- **Relevant Files and Dependencies**:
  - `server.ts`, `src/server/mediaSecurity.ts`, `src/server/store.ts`, `src/types/edison.ts`, `src/components/AdStudioView.tsx`, `src/App.tsx`.
- **Acceptance Criteria**:
  - N/A for Copilot while status is `DRAFT`.
  - For AI Studio Block 2.3: Option A templates & layout element editor persisted (schema v4); `/api/media/upload` enforces magic-byte & size limits and blocks SVG/HTML XSS; Option B scans frames via `jsQR`, blocks overlay when QR exists, flags `suspected_unreadable` for admin review, and blocks campaign submission on `decoded_mismatch`.
- **Safety Restrictions**:
  - No destructive Git operations; no commits/pushes without owner confirmation.
  - No execution of untrusted SVG/HTML payloads (`/uploads/:filename` serves `X-Content-Type-Options: nosniff`).
- **Status**: `DRAFT` (No `READY` task for VS Code Copilot yet)
- **Expected Report**: Copilot must report `"No READY task available"` if triggered prematurely while status is `DRAFT`.

---

## 4. COPILOT EXECUTION REPORT

*No VS Code Copilot tasks have been executed yet.*

---

## 5. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Assessment**: Phase 1, Block 2.1, and Block 2.2 committed by Project Owner. Block 2.3 implemented and verified against typechecking, ESLint, production build, media magic-byte security checks, and Ad Creative QR integrity enforcement.

---

## 6. NEXT ACTION

1. **Project Owner**: Review Block 2.3 in the live preview, commit Block 2.3 to GitHub, and confirm `"Committed, next"` to unlock **Block 2.4 (Full 16:9 Television Preview, Pre-Submission Gate & Commercial-Break Simulator)**.

---

## 7. TASK HISTORY

| Task ID | Date | Sender -> Recipient | Phase / Stage | Status | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-000-PHASE1-BOOTSTRAP` | 2026-11-14 | AI Studio -> Owner / Standby | Phase 1 / Stage 1.1 | `COMPLETE` | 25 docs, Smart TV preliminary research, Command Centre & Copy Report console committed to GitHub. |
| `TASK-001-PHASE2-PROTOTYPE-IN-PROGRESS` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.1 | `COMPLETE` | Express + Vite server, scrypt auth/RBAC, lockfile+fsync atomic JSON store, QR validator & `/r/:token` redirect engine committed. |
| `TASK-002-PHASE2-BLOCK22-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.2 | `COMPLETE` | Advertiser profiles, verification submission, support tickets, simulated billing estimate, and 10-state campaign management committed. |
| `TASK-003-PHASE2-BLOCK23-PROTOTYPE` | 2026-11-14 | AI Studio -> Copilot (Standby) | Phase 2 / Block 2.3 | `DRAFT` | Advertisement Creation Studio (Option A guided builder & Option B upload/QR inspection). |
