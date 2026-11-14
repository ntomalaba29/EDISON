# EDISON — AI Studio & VS Code Copilot Command Centre

**Coordination Protocol**: Manual owner-triggered handoff only. No automatic polling, no background watchers, no scheduled synchronisation, no direct AI-to-AI communication.

---

## 1. PROJECT OWNER MESSAGE

> Block 2.7 committed to GitHub (`Next` per ADR-010). Phase 2 (AI Studio Functional Prototype, Blocks 2.1–2.7) is committed. Transitioning Phase 3 Engineering Hardening (`TASK-P3-001`) to `READY` for VS Code Copilot execution.

---

## 2. AI STUDIO INSTRUCTIONS

1. Phase 1 (`28` docs including `VSCODE_HANDOVER_PACKAGE.md`) and Phase 2 (Blocks `2.1` through `2.7`) are **COMMITTED** in GitHub.
2. Per `AI_STUDIO_WORKING_BOUNDARY.md`, Phase 3 production refactoring (`PostgreSQL`, Vitest/Playwright E2E suite, FFmpeg media pipeline) executes in **VS Code Copilot** against the local repository rather than inside AI Studio.
3. Enforce strict boundaries: no real payments (`paymentCollectionActive: false`), no real advertiser/employer outreach, no fake Smart TV integration, and keep physical smartphone QR scan verification honestly tracked (`PENDING_OWNER_DEVICE_TEST` until logged on real hardware).
4. Keep the one-click **`Commit & Next`** clipboard shortcut visible in the persistent header (`src/App.tsx`) and report footers (`src/components/CopyReportFooter.tsx`), copying `"Committed to GitHub. Please proceed to the next block."`.
5. Maintain `EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md` and `SESSION_CONTINUITY_LOG.md` in GitHub so any Google account importing `Malaba29/EDISON-International-Smart-TV-Advertising-Network-` retains full rules, project path, and session history.

---

## 3. PENDING COPILOT TASK

- **Task ID**: `TASK-P3-001`
- **Date and Time**: `2026-11-14T13:16:00-08:00`
- **Sender**: `AI Studio (Chief Engineer / Architect)`
- **Recipient**: `VS Code Copilot (Implementation Engineer)`
- **Phase, Stage, and Substage**: `Phase 3 / Stage 3.1 / PostgreSQL Migration & Production Persistence Hardening`
- **Objective**: Migrate EDISON prototype persistence (`src/server/store.ts` -> `data/edison-store.json`, schemaVersion 6) to PostgreSQL with versioned schema migrations, strict transactional audit logging, and foreign-key integrity across all 13 collections while preserving all Phase 2 RBAC, QR security, 3-tier opportunity decoupling, and 7-stage analytics provenance invariants.
- **Context**: Phase 1 and Phase 2 (Blocks 2.1–2.7) are committed to GitHub. Full architecture, schema contracts, flows, ADRs, and limitations are documented in `VSCODE_HANDOVER_PACKAGE.md` and `VSCODE_HANDOVER_PLAN.md`. Physical mobile QR scan testing (`physicalQrScanTests`) has 0 real device logs yet and remains `PENDING_OWNER_DEVICE_TEST`.
- **Required Action**: **EXECUTE `TASK-P3-001`.** Read `VSCODE_HANDOVER_PACKAGE.md`, inspect the existing TypeScript types (`src/types/edison.ts`) and `src/server/store.ts`, implement the PostgreSQL persistence layer + migrations behind clean repository/store interfaces, keep local/test seed setup repeatable, and verify all API routes + RBAC + analytics invariants pass.
- **Relevant Files and Dependencies**:
  - `server.ts`, `src/server/store.ts`, `src/server/qrValidator.ts`, `src/server/mediaSecurity.ts`, `src/types/edison.ts`, `VSCODE_HANDOVER_PACKAGE.md`, `VSCODE_HANDOVER_PLAN.md`, `KNOWN_LIMITATIONS.md`, `DECISIONS_LOG.md`, `package.json`.
- **Acceptance Criteria**:
  1. Relational PostgreSQL schema and repeatable migration scripts cover all 13 collections (`users`, `sessions`, `advertiserProfiles`, `campaigns`, `adCreatives`, `qrLinks`, `opportunities`, `opportunityComplaints`, `opportunityAppeals`, `supportTickets`, `analyticsEvents`, `physicalQrScanTests`, `auditLogs`).
  2. Zero regression in scrypt/session RBAC, Option B `decoded_mismatch` blocking, non-transitive 3-tier opportunity verification (`advertisingFeeInfluencesVerification: false`), `paymentCollectionActive: false`, `/r/:token` 302 bot/dedup separation, or Stage 7 (`destination_opened`) strict independence from HTTP 302.
  3. All API routes pass automated integration tests; `tsc --noEmit` and `npm run build` exit `0`.
- **Safety Restrictions**:
  - Preserve `paymentCollectionActive: false`, `advertisingFeeInfluencesVerification: false`, and zero Smart TV hardware claims.
  - Never commit `.env` or production database credentials; document required env vars in `.env.example`.
  - Do not run destructive git commands or overwrite unrelated files (`docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md`).
- **Status**: `READY`
- **Expected Report**: Complete Section 4 (`COPILOT EXECUTION REPORT`) with exact files created/modified, migration commands, test commands/outputs/exit codes, and remaining limitations/blockers, and set status to `AWAITING REVIEW` for AI Studio inspection.

---

## 4. COPILOT EXECUTION REPORT

*Awaiting VS Code Copilot execution of `TASK-P3-001`.*

---

## 5. AI STUDIO REVIEW

- **Reviewed By**: AI Studio
- **Assessment**: Phase 1 (`28` docs) and Phase 2 (Blocks 2.1–2.7) are verified and confirmed committed by Project Owner (`Next` per ADR-010). `VSCODE_HANDOVER_PACKAGE.md` authored and `TASK-P3-001` transitioned to **`READY`**. Note that `physicalQrTestsCount` remains `0` (`PENDING_OWNER_DEVICE_TEST`) until the Project Owner logs a physical smartphone camera test via the live preview or Phase 3 QA.

---

## 6. NEXT ACTION

1. **Project Owner**: Commit this Phase 3 Handover Activation update (`coordination/EDISON_COMMAND_CENTER.md`, `VSCODE_HANDOVER_PACKAGE.md`, updated progress docs) to GitHub.
2. **Project Owner -> VS Code Copilot**: Pull from GitHub locally and instruct VS Code Copilot to read `coordination/EDISON_COMMAND_CENTER.md` and execute **`TASK-P3-001`** (`Status: READY`).
3. **Optional Mobile Verification**: Test scanning any active QR code in `QR QA & VS Code Handover` with a real smartphone camera against the hosted preview URL and log the result.

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
| `TASK-007-PHASE2-BLOCK27-PROTOTYPE` | 2026-11-14 | AI Studio -> Owner | Phase 2 / Block 2.7 | `COMPLETE` | Physical Mobile QR Scan Lab, Prototype Readiness Audit & 11-Point VS Code Handover Package committed (`ADR-010`). |
| `TASK-P3-001` | 2026-11-14 | AI Studio -> VS Code Copilot | Phase 3 / Stage 3.1 | `READY` | PostgreSQL Migration & Production Persistence Hardening queued for VS Code Copilot execution. |
