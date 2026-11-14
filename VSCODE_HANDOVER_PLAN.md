# EDISON — VS Code Engineering Handover Plan

**Document Status**: Phase 1 Handover Blueprint (Executed at completion of Phase 2)

---

## 1. Purpose

This document defines the mandatory handover package that AI Studio must deliver to VS Code Copilot upon verified completion of Phase 2 (the AI Studio Functional Prototype), enabling seamless transition to Phase 3 (Production Engineering & Architecture Hardening).

---

## 2. Mandatory Handover Checklist (Phase 2 Exit Gate)

Before issuing a `READY` Phase 3 handover task in `coordination/EDISON_COMMAND_CENTER.md`, AI Studio must verify and document:
1. **Project Architecture**: Client, Express API, storage layer, QR redirect engine, `SimulationTvAdapter` boundary.
2. **Technology Stack**: Runtime versions, package dependencies, build/lint/test commands.
3. **Data Model**: Complete TypeScript interfaces and database schema for Advertisers, Campaigns, Studio Compositions, Media Assets, Opportunities, Verification Tiers, Complaints/Appeals, QR Tokens, Analytics Events, Consent Records, Audit Logs.
4. **Main Application Flows**: Advertiser onboarding -> Ad Studio/Upload -> Pre-Submit Gate -> Admin Preview/Approval -> Commercial-Break Simulator -> Physical QR Scan -> Analytics.
5. **Important Implementation Decisions**: Referenced by ADR ID from `DECISIONS_LOG.md`.
6. **Files & Components**: Annotated directory tree.
7. **Tests Performed**: Automated unit/integration results, API validation checks, and **verified physical mobile phone QR scan log**.
8. **Outstanding Work & Known Defects**: Honest defect ledger with severity.
9. **Technical Limitations**: Explicit list of mocked/prototype subsystems (`KNOWN_LIMITATIONS.md`).
10. **Next Engineering Tasks**: Ordered Phase 3 tasks queued for VS Code Copilot.
11. **Command Centre Instructions**: Exact workflow for `NEXT` execution inside VS Code.

---

## 3. Anticipated Phase 3 VS Code Tasks (`[PLANNED]`)

1. `TASK-P3-001`: Migrate prototype persistence to PostgreSQL + schema migrations + strict transactional audit logging.
2. `TASK-P3-002`: Harden authentication, password hashing/JWT or OAuth, and server-side RBAC enforcement.
3. `TASK-P3-003`: Build automated Vitest/Playwright E2E test suite covering campaign state machine, QR security rules, and 3-tier opportunity verification.
4. `TASK-P3-004`: Implement production media worker pipeline (FFmpeg 1080p/720p validation & loudness normalisation).
