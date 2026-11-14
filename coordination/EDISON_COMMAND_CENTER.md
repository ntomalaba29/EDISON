# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.

---

## 1. PROJECT OWNER MESSAGE

> Block 2.6 committed to GitHub (`Next` per ADR-010). Executed Phase 2 (AI Studio Functional Prototype), Block 2.7: Physical Mobile Phone QR Scan Testing, Final Prototype QA & VS Code Handover Package.

---

## 2. AI STUDIO INSTRUCTIONS

1. Execute Phase 2 sequentially by implementation block (`2.1` through `2.7`).
2. Enforce strict boundaries: no real payments (`paymentCollectionActive: false`), no real advertiser/employer outreach, no fake Smart TV integration, and never claim automated loopback curl requests prove physical mobile camera QR scans.
3. Enforce Advertisement Creation Studio Option B QR integrity rules: never overwrite an existing QR code silently; block campaign submission on mismatch; flag unreadable/suspected QR uploads for admin review.
4. Keep VS Code Copilot task `TASK-P3-001` as `DRAFT` (standby) until Project Owner reviews Block 2.7, executes optional live mobile camera QR scan verification, commits Block 2.7 to GitHub, and confirms commit (`Next`).
5. Keep the one-click **`Commit & Next`** clipboard shortcut visible in the persistent header (`src/App.tsx`) and report footers (`src/components/CopyReportFooter.tsx`), copying `"Committed to GitHub. Please proceed to the next block."`.
6. Maintain `EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md` and `SESSION_CONTINUITY_LOG.md` in GitHub so any Google account importing `Malaba29/EDISON-International-Smart-TV-Advertising-Network-` retains full rules, project path, and session history.

---

## 3. PENDING COPILOT TASK

- **Task ID**: `TASK-P3-001`
- **Date and Time**: `2026-11-14T13:00:00-08:00`
- **Sender**: `AI Studio (Chief Engineer / Architect)`
- **Recipient**: `VS Code Copilot (Standby — Do Not Execute While Status is DRAFT)`
- **Phase, Stage, and Substage**: `Phase 3 / Stage 3.1 / PostgreSQL Migration & Production Persistence Hardening`
- **Objective**: Migrate EDISON prototype persistence (`src/server/store.ts` -> `data/edison-store.json`, schemaVersion 6) to PostgreSQL with schema migrations, strict transactional audit logging, and foreign-key integrity across all 13 collections while preserving all Phase 2 RBAC, QR security, 3-tier opportunity decoupling, and 7-stage analytics provenance invariants.
- **Context**: Phase 1 and Phase 2 Blocks 2.1–2.6 are committed; Block 2.7 (Physical Mobile QR Scan Lab, Final Prototype Readiness Audit, and 11-Point VS Code Handover Package) is verified and awaiting Project Owner commit + real device QR scan confirmation.
- **Required Action**: **NONE — Standby until Project Owner confirms Block 2.7 commit and flips status to `READY`.**
- **Relevant Files and Dependencies**:
  - `server.ts`, `src/server/store.ts`, `src/server/qrValidator.ts`, `src/server/mediaSecurity.ts`, `src/types/edison.ts`, `VSCODE_HANDOVER_PLAN.md`, `KNOWN_LIMITATIONS.md`, `DECISIONS_LOG.md`.
- **Acceptance Criteria**:
  - Zero regression in scrypt/session RBAC, Option B `decoded_mismatch` blocking, non-transitive 3-tier opportunity verification, `/r/:token` 302 bot/dedup separation, or Stage 7 (`destination_opened`) strict independence from HTTP 302.
  - Database schema migrations repeatable on clean PostgreSQL instance; automated unit/integration tests pass.
- **Safety Restrictions**:
  - Preserve `paymentCollectionActive: false`, `advertisingFeeInfluencesVerification: false`, and zero Smart TV hardware claims; do not access `.env` secrets.
- **Status**: `DRAFT` (Locked until Block 2.7 Owner Commit Confirmation)
- **Expected Report**: Copilot must report `"No READY task available — TASK-P3-001 is still DRAFT"` if triggered prematurely while status is `DRAFT`.

---

## 4. COPILOT EXECUTION REPORT

*No VS Code Copilot tasks have been executed yet.*

---

## 5. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Assessment**: Phase 1, Blocks 2.1–2.6, and `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md` committed by Project Owner. Block 2.7 (Physical Mobile QR Scan Lab, Prototype Readiness Audit, and 11-Point VS Code Handover Package) has been implemented, compiled (`npm run build`), type-checked (`tsc --noEmit`), and verified against the live Express/Vite server (`BLOCK27_E2E_OK`). Physical smartphone camera scanning remains `PENDING_OWNER_DEVICE_TEST` until scanned on a real mobile phone. Status: `VERIFIED · AWAITING COMMIT`.

---

## 6. NEXT ACTION

1. **Project Owner**: Open the live EDISON preview (`QR QA & VS Code Handover` tab), point a physical mobile phone camera at the QR code on screen (optional live device log), review and commit Block 2.7 to GitHub, and reply **`Next`** (or click **`Commit & Next`**) per ADR-010 to authorise transitioning `TASK-P3-001` to `READY`.

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
| `TASK-006-PHASE2-BLOCK26-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.6 | `COMPLETE` | Admin Moderation Console (Playable 16:9 Preview) & 7-Stage Trustworthy Analytics committed. |
| `TASK-007-PHASE2-BLOCK27-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.7 | `COMPLETE` | Physical Mobile QR Scan Lab, Prototype Readiness Audit & 11-Point VS Code Handover Package (`VERIFIED · AWAITING COMMIT`). |
| `TASK-P3-001` | 2026-11-14 | AI Studio -> Copilot (Standby) | Phase 3 / Stage 3.1 | `DRAFT` | PostgreSQL Migration & Persistence Hardening (Locked until Block 2.7 commit confirmation). |
