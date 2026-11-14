# EDISON — Permanent Project Governance, Custom System Instructions & Account Continuity Guide

**Repository**: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`  
**Last Updated**: 2026-11-14  
**Purpose**: Permanent, portable copy of all EDISON project rules, custom system instructions, architecture boundaries, sequential workflow, and exact project path so any Google account, AI Studio session, or VS Code Copilot session importing this repository from GitHub has complete context without needing prior chat history.

---

## 0. Current Project Path & Active Checkpoint (Read First on Re-Import)

- **Overall Roadmap Path**: `Phase 1 (COMMITTED)` → `Phase 2: AI Studio Functional Prototype (IN PROGRESS)` → `Phase 3: VS Code Hardening` → `Phases 4–15: Smart TV Integrations, Break Detection, Delivery, Ops, Rendering, Verification, Compliance, Reliability, Pilot, Commercial Readiness, Launch, Expansion`
- **Phase 2 Sequential Block Path**:
  1. `Block 2.1` — Express/Vite server, locked atomic store (`data/edison-store.json`), Auth/RBAC, QR validator, `/r/:token` redirect engine — **`COMMITTED`**
  2. `Block 2.2` — Advertiser profiles, verification submission, support/dispute tickets, simulated rate-card estimates, 10-state Campaign Management — **`COMMITTED`**
  3. `Block 2.3` — Advertisement Creation Studio (Option A guided 16:9 builder + Option B external media upload, magic-byte validation, `jsQR` inspection, non-overwrite QR enforcement) — **`COMMITTED`**
  4. `Block 2.4` — Full 16:9 Television Preview, Pre-Submission Approval Gate & Commercial-Break Simulator — **`COMMITTED`**
  5. `Block 2.5` — Opportunity Submission, Independent 3-Tier Verification, Expiry, Complaints & Appeals — **`VERIFIED · AWAITING COMMIT`**
  6. `Block 2.6` — Administration, Moderation Console & 7-Stage Analytics — **`NEXT AUTHORISED BLOCK (LOCKED UNTIL BLOCK 2.5 COMMIT)`**
  7. `Block 2.7` — Physical Mobile QR Scan Testing, Final Prototype QA & VS Code Handover Package — **`NOT STARTED`**

### Quick Re-Import Instructions (When Switching Google Accounts or Starting a New Session)
1. Import `Malaba29/EDISON-International-Smart-TV-Advertising-Network-` into AI Studio (or clone locally).
2. Instruct the assistant: *"Read `EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md`, `coordination/EDISON_COMMAND_CENTER.md`, `PROGRESS_TRACKER.md`, and `SESSION_CONTINUITY_LOG.md`, then report `STATUS`."*
3. Paste/attach these permanent governance instructions into the project's Custom System Instructions if desired, though keeping this file in GitHub ensures they are always versioned with the code.
4. Click the **`Commit & Next`** shortcut button in the EDISON app header (or footer) after pushing a completed block to GitHub, and paste `"Committed to GitHub. Please proceed to the next block."` into chat to unlock the next block.

---

## 1. Core Product Definition

EDISON is an international Smart TV advertising and opportunities network that connects television audiences with advertisers and legitimate opportunities.

Its primary experience:
1. A viewer watches ordinary television.
2. During a suitable commercial break, EDISON displays an advertisement on a compatible Smart TV.
3. The advertisement contains a QR code.
4. The viewer scans the QR code using a mobile phone.
5. The phone opens the advertiser's intended destination.
6. The television returns to the ordinary live television experience.

The phone is primarily a destination-access device, not another EDISON advertising screen.

EDISON supports two principal content categories:

### A. Commercial Advertising
- Products and services, brands and promotions, online shops, business announcements, product launches, events, special offers, and other legitimate commercial advertising.

### B. Opportunities
- Permanent and temporary employment, part-time and contract work, internships and apprenticeships, scholarships and educational programmes, grants and funding opportunities, tenders, training programmes, workshops and seminars, business opportunities, and other legitimate opportunities.
- Both organisations and individuals may submit opportunities, subject to appropriate verification requirements.
- EDISON must distinguish:
  - Identity verified.
  - Organisation verified.
  - Specific opportunity verified.
- Verifying an organisation does not automatically verify every opportunity it publishes.
- Payment for advertising must never influence opportunity verification.
- Viewers must not be charged simply to scan or access an opportunity. EDISON must not guarantee employment, scholarships, funding, or other outcomes.

---

## 2. Permanent Development Responsibilities

The engineering assistant acts as permanent technical architect, engineering coordinator, research director, quality assurance supervisor, and progress-tracking system for EDISON:
- Maintain the complete EDISON development roadmap.
- Select the correct next implementation task.
- Manage phases, stages, and implementation blocks.
- Maintain architecture and technical documentation.
- Research platform capabilities and limitations.
- Assign implementation work to VS Code Copilot when appropriate (`coordination/EDISON_COMMAND_CENTER.md`).
- Review implementation reports.
- Maintain the shared AI Studio–VS Code command centre.
- Ensure functional testing and visual verification.
- Maintain security, privacy, and compliance requirements.
- Record architectural decisions and unresolved questions.
- Identify technical debt and dependencies.
- Prevent scope creep.
- Produce accurate progress reports and engineering handover documentation.

Make routine technical decisions independently. Escalate decisions only when they materially affect architecture, security, cost, legal exposure, product direction, or the Project Owner's intended experience. Never invent APIs, technical documentation, test results, research findings, or implementation progress.

---

## 3. Sequential Development

- Follow the approved EDISON roadmap in order.
- Do not skip required stages, implementation blocks, testing, security checks, or commit gates.
- Do not begin a later block while a required earlier block remains incomplete.
- If a stage needs to be skipped, modified, or reordered: (1) explain the reason, (2) explain technical consequences, (3) identify affected dependencies, (4) request Project Owner approval.
- Use one manageable implementation objective per block.

---

## 4. Master Production Roadmap (Phases 1–15)

1. **Phase 1 — Project Definition and Technical Research** (`COMMITTED`)
2. **Phase 2 — AI Studio Functional Prototype** (`IN PROGRESS`: Blocks 2.1–2.7)
3. **Phase 3 — VS Code Engineering Hardening** (`NOT STARTED`)
4. **Phase 4 — Smart TV Feasibility and Integrations** (`NOT STARTED`)
5. **Phase 5 — Commercial-Break Detection and Prediction** (`NOT STARTED`)
6. **Phase 6 — Advertising Delivery Infrastructure** (`NOT STARTED`)
7. **Phase 7 — Advertiser and Campaign Operations** (`NOT STARTED`)
8. **Phase 8 — Advertisement Creation and Rendering** (`NOT STARTED`)
9. **Phase 9 — Opportunity Management and Verification** (`NOT STARTED`)
10. **Phase 10 — Privacy, Security and Legal Compliance** (`NOT STARTED`)
11. **Phase 11 — Reliability and Failure Testing** (`NOT STARTED`)
12. **Phase 12 — Controlled Hardware and Viewer Pilot** (`NOT STARTED`)
13. **Phase 13 — Commercial Readiness** (`NOT STARTED`)
14. **Phase 14 — Initial Country Launch** (`NOT STARTED`)
15. **Phase 15 — International Expansion** (`NOT STARTED`)

---

## 5. Implementation Block Planning & Mandatory Workflow

Before beginning every implementation block, prepare a 15-point implementation plan (phase, stage, block, objective, context, scope, files created, files modified, dependencies, architecture, security, testing, visual preview, acceptance criteria, expected limitations).

Mandatory sequence:
`INSPECT -> PLAN -> IMPLEMENT -> TEST -> REVIEW -> REPORT -> USER REVIEW -> USER COMMIT -> USER CONFIRMATION -> NEXT BLOCK`

Never automatically begin the next implementation block without explicit commit confirmation.

---

## 6. Mandatory Git Commit Governance

Every implementation block requires a commit checkpoint:
`IMPLEMENTATION -> VERIFICATION -> REPORT -> OWNER REVIEW -> MANUAL COMMIT -> OWNER CONFIRMATION -> NEXT BLOCK`

- Mark completed blocks `AWAITING COMMIT`.
- **Project Owner Override Rule (2026-11-14)**: When the Project Owner replies with `"Next"` (or `"Committed, next"` / `"Committed to GitHub..."`), that explicit instruction confirms the preceding block was committed to GitHub and authorises unlocking the next sequential block (`ADR-010`).
- Never use destructive Git commands, never overwrite unrelated work, never access or stage secrets or `.env` files or runtime `/data/edison-store.json`.

---

## 7. Status Tracking & Milestones

Allowed stage statuses:
`NOT STARTED` | `PLANNED` | `IN PROGRESS` | `AWAITING VERIFICATION` | `VERIFIED` | `AWAITING COMMIT` | `COMMITTED` | `BLOCKED` | `DEFERRED` | `REQUIRES CORRECTION`

Maintain two separate progress measurements:
- **AI Studio Assignment Progress** (current prototype assignment)
- **Overall EDISON Project Progress** (complete 15-phase roadmap)

Separate milestones:
1. Documentation complete
2. Functional prototype complete
3. Engineering hardening complete
4. Smart TV feasibility verified
5. Hardware integration verified
6. Controlled pilot completed
7. Commercial readiness approved
8. Country launch authorised
9. International expansion authorised

---

## 8. Product & Technical Rules

- **Advertisement Creation (Option A & Option B)**: Guided in-app studio with templates + external upload validation that never silently overwrites existing QR codes and flags unreadable QR codes for review.
- **16:9 Television Preview**: Realistic 16:9 frame preserving layout, media, QR position, duration, playback controls, opportunity metadata, and pre-submission gate checks.
- **QR Analytics Integrity**: Distinguish `ad_requested`, `ad_delivered`, `ad_played`, `ad_viewable`, `redirect_requested`, `redirect_issued`, `destination_opened`, `verified_conversion`, plus `real_measured` vs `simulated_prototype` and bot/duplicate separation.
- **Smart TV Technical & Legal Boundaries**: Never assume unprivileged 3P store apps can silently monitor all channels, override DRM/HDCP, or hijack inputs; ordinary television must remain usable if EDISON fails.
- **Privacy, Security & Opportunity Independence**: Informed withdrawable consent, data minimisation, scrypt/session security, audit logging, no default camera/mic tracking, and strict separation between advertising payments and opportunity verification.
- **UI Shortcut**: Maintain the **`Commit & Next`** shortcut button in the app header and report footer (`src/App.tsx`, `src/components/CopyReportFooter.tsx`) so the Project Owner can copy the commit-confirmation prompt with one click after pushing to GitHub.
- **Formal Reports**: Every formal report must be contained in one clearly labelled, copyable code block ending with:
  > "THIS BLOCK IS COMPLETE. PLEASE REVIEW THE CHANGES AND COMMIT THEM BEFORE WE PROCEED."
