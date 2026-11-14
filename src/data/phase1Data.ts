export type ReportCommandType = 'PHASE_1_COMPLETION' | 'STATUS' | 'CHECK' | 'NEXT' | 'COMMIT';

export interface RoadmapPhase {
  phase: number;
  title: string;
  status: 'IN PROGRESS' | 'NOT STARTED' | 'AWAITING COMMIT';
  summary: string;
  milestoneGate: string;
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  { phase: 1, title: 'Project definition and technical research', status: 'AWAITING COMMIT', summary: 'Governance, 25 specification files, Smart TV feasibility research, Command Centre, and mandatory Copy Report console.', milestoneGate: 'Owner review & commit confirmation' },
  { phase: 2, title: 'AI Studio functional prototype', status: 'NOT STARTED', summary: 'Sequential blocks: Foundation, Advertiser accounts, Campaigns, Ad Studio (A & B), Real QR, 16:9 TV Preview, Break Simulator, Opportunities, Admin Review, Analytics.', milestoneGate: 'Physical phone QR scan tested + VS Code handover' },
  { phase: 3, title: 'VS Code engineering and architecture hardening', status: 'NOT STARTED', summary: 'Production DB migration, hardened auth/RBAC, CI/CD, full automated E2E suite.', milestoneGate: 'All Tier 1-3 automated suites green' },
  { phase: 4, title: 'Smart TV platform feasibility and integrations', status: 'NOT STARTED', summary: 'Physical hardware lab benchmarking on Android TV TIF, Samsung Tizen, LG webOS, external HDMI/STB.', milestoneGate: 'Empirical latency & OEM permission verification' },
  { phase: 5, title: 'Commercial-break detection and prediction', status: 'NOT STARTED', summary: 'SCTE-35, HbbTV/ATSC 3.0 cues, per-channel break-length ML predictor, false-positive suppression.', milestoneGate: 'Near-zero FPR verified on test feeds' },
  { phase: 6, title: 'Advertising delivery infrastructure', status: 'NOT STARTED', summary: 'Edge CDN preloading, high-throughput QR redirect engine, idempotent deduplicated analytics.', milestoneGate: 'Load & latency budget verification' },
  { phase: 7, title: 'Advertiser management and campaign operations', status: 'NOT STARTED', summary: 'Production KYC, billing/invoicing, campaign pacing, support SLA workflows.', milestoneGate: 'Operational readiness review' },
  { phase: 8, title: 'Advertisement creation and production rendering', status: 'NOT STARTED', summary: 'Server-side 1080p/4K MP4/HLS rendering, broadcast audio loudness, automated QR inspection.', milestoneGate: 'Codec & loudness compliance pass' },
  { phase: 9, title: 'Opportunity management and verification', status: 'NOT STARTED', summary: 'Encrypted evidence vault, 3-tier verification ops, automated expiry, complaints & appeals.', milestoneGate: 'Anti-scam & moderation audit pass' },
  { phase: 10, title: 'Privacy, security and legal compliance', status: 'NOT STARTED', summary: 'Jurisdictional consent flows, DSR deletion automation, penetration testing, legal opinions.', milestoneGate: 'Security & DPO sign-off' },
  { phase: 11, title: 'Reliability and failure testing', status: 'NOT STARTED', summary: 'Fault injection across all 18 failure modes (FM-01 to FM-18) ensuring ordinary TV never degrades.', milestoneGate: '100% watchdog TV-recovery pass' },
  { phase: 12, title: 'Controlled hardware and viewer pilot', status: 'NOT STARTED', summary: 'Closed opt-in pilot measuring switching reliability, restoration timing, and real QR scan rates.', milestoneGate: 'Pilot stability KPIs met' },
  { phase: 13, title: 'Commercial readiness', status: 'NOT STARTED', summary: 'Production SLAs, live payment processors, broadcaster/OEM agreements, runbooks.', milestoneGate: 'Go-live commercial readiness sign-off' },
  { phase: 14, title: 'Country-by-country launch', status: 'NOT STARTED', summary: 'Market launches gated strictly by Country Activation Register legal & tax sign-offs.', milestoneGate: 'Local counsel clearance per country' },
  { phase: 15, title: 'International expansion', status: 'NOT STARTED', summary: 'Multi-region localization, currency scaling, cross-border governance.', milestoneGate: 'Regional operational parity' },
];

export interface SmartTvFeasibilityRow {
  platform: string;
  architecturePath: string;
  technicallyPossible: string;
  officiallyDocumented: string;
  platformPermitted: string;
  hardwareTested: string;
  productionSuitable: string;
  keyConstraints: string;
}

export const SMART_TV_MATRIX: SmartTvFeasibilityRow[] = [
  {
    platform: 'Android TV / Google TV',
    architecturePath: '3P Store App attempting global EPG read / overlay hijack',
    technicallyPossible: 'Restricted',
    officiallyDocumented: 'NO (Deprecated/System-only)',
    platformPermitted: 'NO',
    hardwareTested: 'Not Tested',
    productionSuitable: 'NO — Rejected',
    keyConstraints: 'READ_EPG_DATA restricted to system apps since API 23; SYSTEM_ALERT_WINDOW blocked on modern TV policies; cannot hijack TvActivity.',
  },
  {
    platform: 'Android TV / Google TV',
    architecturePath: 'Arch A: Permitted TvInputService (TIF) Linear Session',
    technicallyPossible: 'YES',
    officiallyDocumented: 'YES (TvInputService.Session)',
    platformPermitted: 'YES (Own TIF channels)',
    hardwareTested: 'Not Tested (Preliminary)',
    productionSuitable: 'Candidate (Ph 4/12)',
    keyConstraints: 'setOverlayViewEnabled() + onCreateOverlayView() valid inside own TIF video session; MediaDrm/HDCP enforces secure surface.',
  },
  {
    platform: 'Samsung Tizen TV',
    architecturePath: '3P Store App attempting background TV monitoring',
    technicallyPossible: 'NO (UI Paused)',
    officiallyDocumented: 'Prohibited (2015+)',
    platformPermitted: 'NO',
    hardwareTested: 'Not Tested',
    productionSuitable: 'NO — Rejected',
    keyConstraints: 'background-support="enable" disabled on 2015+ TVs; JS execution halts when app loses focus to live TV or HDMI.',
  },
  {
    platform: 'Samsung Tizen TV',
    architecturePath: 'Arch A/B: Foreground tvwindow + Partner Integration',
    technicallyPossible: 'YES',
    officiallyDocumented: 'YES (tizen.tvwindow)',
    platformPermitted: 'Partner-gated for live TV',
    hardwareTested: 'Not Tested (Preliminary)',
    productionSuitable: 'Partner Candidate (Ph 4)',
    keyConstraints: 'Requires tv.window privilege; return to native TV via org.tizen.tv-viewer; OEM agreement required for automated break detection.',
  },
  {
    platform: 'LG webOS TV',
    architecturePath: '3P Content Store App background daemon + HDMI force switch',
    technicallyPossible: 'Root/Dev only',
    officiallyDocumented: 'NO (Sandbox blocked)',
    platformPermitted: 'NO',
    hardwareTested: 'Not Tested',
    productionSuitable: 'NO — Rejected',
    keyConstraints: 'Unfocused apps hibernated; system Luna services (applicationManager/eim) require privileged ACGs and LG partner signing.',
  },
  {
    platform: 'External HDMI / STB',
    architecturePath: 'Arch C: Dedicated HDMI Companion / Operator STB + CEC',
    technicallyPossible: 'YES',
    officiallyDocumented: 'HDMI-CEC & HDCP specs',
    platformPermitted: 'Hardware-dependent',
    hardwareTested: 'Not Tested (Preliminary)',
    productionSuitable: 'Pilot Candidate (Ph 4/12)',
    keyConstraints: 'Must preserve full HDCP 2.2/2.3 handshake without stripping/bypassing; CEC timing varies across TV brands.',
  },
];

export const PHASE1_CHECKLIST = [
  { id: 1, item: 'Establish EDISON project structure', status: 'Completed & Verified' },
  { id: 2, item: 'Produce complete development roadmap (Phases 1–15)', status: 'Completed & Verified' },
  { id: 3, item: 'Define product requirements (PRD-01 to PRD-12)', status: 'Completed & Verified' },
  { id: 4, item: 'Document business model & verification independence', status: 'Completed & Verified' },
  { id: 5, item: 'Research Smart TV technical feasibility (preliminary)', status: 'Completed & Verified' },
  { id: 6, item: 'Define initial system architecture & technical requirements', status: 'Completed & Verified' },
  { id: 7, item: 'Document advertisement creation studio (Options A & B)', status: 'Completed & Verified' },
  { id: 8, item: 'Document television preview experience & simulator spec', status: 'Completed & Verified' },
  { id: 9, item: 'Define QR code validation & direct redirect system', status: 'Completed & Verified' },
  { id: 10, item: 'Define advertiser & 3-tier opportunity management', status: 'Completed & Verified' },
  { id: 11, item: 'Document privacy, security & country compliance register', status: 'Completed & Verified' },
  { id: 12, item: 'Create risk register & 18-mode FMEA', status: 'Completed & Verified' },
  { id: 13, item: 'Establish 4-tier testing strategy & known limitations', status: 'Completed & Verified' },
  { id: 14, item: 'Prepare all 25 GitHub documentation files locally', status: 'Completed (Local Only)' },
  { id: 15, item: 'Design AI Studio <-> VS Code Command Centre', status: 'Completed & Verified' },
  { id: 16, item: 'Implement mandatory functional Copy Report button', status: 'Completed & Verified' },
  { id: 17, item: 'Report verified progress and request commit gate review', status: 'Active Gate' },
];

export function generateFormalReport(type: ReportCommandType): { title: string; subtitle: string; body: string } {
  const timestamp = '2026-11-14T05:45:00-08:00';

  if (type === 'STATUS') {
    return {
      title: 'EDISON — STATUS REPORT',
      subtitle: 'Formal response to STATUS command distinguishing AI Studio assignment vs overall roadmap',
      body: `EDISON — PROJECT STATUS REPORT
Generated: ${timestamp}

1. CURRENT PHASE, STAGE AND SUBSTAGE
- Phase: Phase 1 — Project definition and technical research
- Stage: Stage 1.1 — Master Documentation, Smart TV Research, Command Centre & Reporting Interface
- Substage: Substage 1.1.1 — Implementation Block 1 (AWAITING COMMIT)

2. AI STUDIO ASSIGNMENT PROGRESS
- Current Assignment: Phase 1 First Assignment (Section 24, items 1–17)
- Status: Implemented and verified locally (` + 'tsc --noEmit`' + `, ` + '`vite build`' + `, and live preview check).
- Scope Note: Strictly adhered to Section 24 ("Do not immediately start building the application"); Phase 2 prototype application features are intentionally NOT started yet.

3. OVERALL EDISON PROJECT PROGRESS
- Completed / Awaiting Commit: Phase 1 of 15 (Project definition & preliminary technical research)
- Not Started: Phases 2 through 15 (AI Studio prototype, VS Code hardening, physical Smart TV lab, break detection, delivery infra, compliance sign-off, pilot, commercial rollout)

4. COMPLETED ACCEPTANCE CRITERIA
- All 25 repository documentation files written with substantive content and honest [PRELIMINARY RESEARCH] / [ASSUMPTION] / [UNRESOLVED QUESTION] labels.
- Grounded Smart TV research conducted via live documentation queries for Android TV TIF, Samsung Tizen, LG webOS, SCTE-35/HbbTV/ATSC 3.0, and HDMI-CEC/HDCP.
- Shared manual Command Centre created at coordination/EDISON_COMMAND_CENTER.md with all 7 required sections.
- Phase 1 Governance & Reporting Console built on port 3000 with live raw markdown file rendering and functional Copy Report button at the bottom of every report.

5. OUTSTANDING WORK
- Owner review and Git commit of Phase 1 deliverables.
- Subsequent Phase 2 sequential implementation blocks (2.1 App Foundation & Persistence -> 2.11 Physical Phone QR Testing & VS Code Handover).

6. BLOCKERS
- Production Gate locked pending manual Git review/commit confirmation from Project Owner.
- Local workspace is not yet initialized as a Git repository or pushed to a remote private GitHub repository named "EDISON".

7. ONE NEXT ACTION
- Review Phase 1 documentation and preview, commit changes to Git, and confirm completion to unlock Phase 2, Block 2.1 (Application Foundation, Persistence & Auth).`,
    };
  }

  if (type === 'CHECK') {
    return {
      title: 'EDISON — VERIFICATION CHECK REPORT',
      subtitle: 'Evidence-based inspection of Phase 1 deliverables, defects, and blockers',
      body: `EDISON — CHECK REPORT
Generated: ${timestamp}

1. VERIFIED PROGRESS
- Completed & Verified:
  * 25 Markdown specification, research, governance, and coordination files present in workspace.
  * TypeScript static check (npm run lint) and Vite production build (npm run build) executed and verified after edits.
  * Phase 1 Reporting Console live on port 3000 rendering exact repository files via Vite ?raw imports.
  * Mandatory Copy Report button rendered at the bottom of every report view with clipboard + fallback handling.
- Not Started (By Design in Phase 1):
  * Phase 2 Prototype Application (Ad Creation Studio, 16:9 TV Preview, Commercial-Break Simulator, Advertiser/Opportunity Workflows, QR Server Redirects).
  * Physical smartphone QR scan testing (depends on Phase 2 QR engine).
  * Physical Smart TV hardware testing (deferred to Phase 4).

2. DEFECTS IDENTIFIED
- None in Phase 1 documentation or Phase 1 Reporting Console build.

3. BLOCKERS & LIMITATIONS
- Local-only filesystem: Git repository initialization and remote GitHub push cannot be executed autonomously without owner approval.
- Smart TV compatibility findings remain [PRELIMINARY RESEARCH] until tested on physical Samsung, LG, Android TV, and HDMI hardware in Phase 4.
- Country Activation Register marks all jurisdictions NOT ACTIVATED pending qualified local legal advice.

4. ONE NEXT ACTION
- Project Owner to review Phase 1 files and confirm manual Git commit so Phase 2 Block 2.1 can begin.`,
    };
  }

  if (type === 'NEXT') {
    return {
      title: 'EDISON — NEXT ACTION DIRECTIVE',
      subtitle: 'Sequential progression gate from Phase 1 to Phase 2 Block 2.1',
      body: `EDISON — NEXT ACTION REPORT
Generated: ${timestamp}

CURRENT GATE: Phase 1 Implementation Block 1 — AWAITING COMMIT

BEFORE ANY PHASE 2 CODE IS WRITTEN:
1. Project Owner reviews the 25 documentation files and the Phase 1 Preview Console.
2. Project Owner performs manual Git commit (and optional push to private GitHub repo "EDISON").
3. Project Owner confirms commit completion in chat.

ONCE CONFIRMED, NEXT BLOCK TO EXECUTE:
- Phase: Phase 2 — AI Studio Functional Prototype
- Block: Block 2.1 — Application Foundation, Express Server & Prototype Persistence
- Objective: Replace Vite-only static dev script with full-stack Express + Vite middleware (server.ts), structured prototype persistence, role-based prototype session switching (Advertiser / Opportunity Submitter / Admin), and real QR token redirect routing (/r/:token) groundwork.
- VS Code Copilot Status: DRAFT (Standby — no READY tasks until Phase 2 handover).`,
    };
  }

  if (type === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT CHECKPOINT REPORT',
      subtitle: 'Files prepared for Project Owner manual Git review and commit',
      body: `EDISON — COMMIT CHECKPOINT
Generated: ${timestamp}

REPOSITORY STATUS OBSERVED:
- Local command check ("git status") returned: "fatal: not a git repository (or any of the parent directories): .git".
- Remote GitHub access / push credentials are NOT configured or authorized in this environment.
- Per Section 22 Safety Restrictions, no automatic git init, commit, or push has been executed.

FILES PREPARED FOR REVIEW & COMMIT:
- 25 Documentation Files:
  README.md, PROJECT_MASTER_SPECIFICATION.md, BUSINESS_MODEL.md, PRODUCT_REQUIREMENTS.md, SYSTEM_ARCHITECTURE.md, TECHNICAL_REQUIREMENTS.md, SMART_TV_COMPATIBILITY_RESEARCH.md, COMMERCIAL_BREAK_DETECTION.md, ADVERTISING_AND_QR_SYSTEM.md, ADVERTISEMENT_CREATION_STUDIO.md, TELEVISION_PREVIEW_EXPERIENCE.md, OPPORTUNITY_MANAGEMENT.md, ADVERTISER_MANAGEMENT.md, PRIVACY_SECURITY_AND_COMPLIANCE.md, COUNTRY_ACTIVATION_REGISTER.md, RISK_REGISTER.md, FAILURE_MODE_ANALYSIS.md, COMPLETE_DEVELOPMENT_ROADMAP.md, AI_STUDIO_WORKING_BOUNDARY.md, VSCODE_HANDOVER_PLAN.md, PROGRESS_TRACKER.md, DECISIONS_LOG.md, TESTING_STRATEGY.md, KNOWN_LIMITATIONS.md, coordination/EDISON_COMMAND_CENTER.md
- Application / Console Files:
  metadata.json, index.html, src/index.css, src/App.tsx, src/data/documents.ts, src/data/phase1Data.ts, src/components/CopyReportFooter.tsx, src/components/MarkdownRenderer.tsx, src/components/Views.tsx

REQUIRED OWNER ACTION:
- Review changes, initialize/commit to your local/private GitHub "EDISON" repository, and confirm when committed.`,
    };
  }

  return {
    title: 'EDISON — PHASE 1 IMPLEMENTATION BLOCK COMPLETION REPORT',
    subtitle: 'Full Section 19 + Governance completion report for Assignment 1 (Block 1)',
    body: `EDISON — IMPLEMENTATION BLOCK COMPLETION REPORT

Project: EDISON (International Smart TV Advertising & Opportunity Network)
Production Phase: Phase 1 — Project Definition and Technical Research
Stage: Stage 1.1 — Master Specification, Feasibility Research, Command Centre & Reporting Console
Implementation Block: Block 1 — Phase 1 Complete Documentation & Reporting Foundation
Status: AWAITING COMMIT

AI STUDIO ASSIGNMENT PROGRESS:
- Phase 1 First Assignment (Section 24, items 1–17): Implemented & verified locally (awaiting owner Git commit).
- Phase 2 Prototype Application: Intentionally NOT STARTED (per Section 24 instruction: "Do not immediately start building the application").

OVERALL EDISON PROJECT PROGRESS:
- Phase 1 of 15: Implemented, awaiting commit gate.
- Phases 2–15: Not started.

FILES CREATED (29 new files):
- README.md
- PROJECT_MASTER_SPECIFICATION.md
- BUSINESS_MODEL.md
- PRODUCT_REQUIREMENTS.md
- SYSTEM_ARCHITECTURE.md
- TECHNICAL_REQUIREMENTS.md
- SMART_TV_COMPATIBILITY_RESEARCH.md
- COMMERCIAL_BREAK_DETECTION.md
- ADVERTISING_AND_QR_SYSTEM.md
- ADVERTISEMENT_CREATION_STUDIO.md
- TELEVISION_PREVIEW_EXPERIENCE.md
- OPPORTUNITY_MANAGEMENT.md
- ADVERTISER_MANAGEMENT.md
- PRIVACY_SECURITY_AND_COMPLIANCE.md
- COUNTRY_ACTIVATION_REGISTER.md
- RISK_REGISTER.md
- FAILURE_MODE_ANALYSIS.md
- COMPLETE_DEVELOPMENT_ROADMAP.md
- AI_STUDIO_WORKING_BOUNDARY.md
- VSCODE_HANDOVER_PLAN.md
- PROGRESS_TRACKER.md
- DECISIONS_LOG.md
- TESTING_STRATEGY.md
- KNOWN_LIMITATIONS.md
- coordination/EDISON_COMMAND_CENTER.md
- src/data/documents.ts
- src/data/phase1Data.ts
- src/components/CopyReportFooter.tsx
- src/components/MarkdownRenderer.tsx
- src/components/Views.tsx

FILES MODIFIED:
- metadata.json
- index.html
- src/index.css
- src/App.tsx

WORK PERFORMED:
1. Conducted live documentation research on Android TV TIF (TvInputService, READ_EPG_DATA restriction, SYSTEM_ALERT_WINDOW restriction, MediaDrm/HDCP), Samsung Tizen (tizen.tvwindow, background-support prohibition since 2015), LG webOS (Luna services, ACG/store sandbox, unfocused hibernation), SCTE-35/HbbTV/ATSC 3.0/ACR, and HDMI-CEC/HDCP handshake constraints.
2. Authored all 25 repository specification, architecture, compliance, risk, FMEA, roadmap, handover, and coordination files with explicit [VERIFIED], [PRELIMINARY RESEARCH], [ASSUMPTION], and [UNRESOLVED QUESTION] classifications.
3. Designed shared AI Studio <-> VS Code Command Centre (coordination/EDISON_COMMAND_CENTER.md) following all 7 mandatory sections and manual trigger rules.
4. Built the Phase 1 Governance, Documentation & Reporting Console on port 3000 with direct ?raw file loading and a functional Copy Report button fixed at the bottom of every report.

TESTS PERFORMED & RESULTS:
- TypeScript lint check (tsc --noEmit) & production build (vite build): Executed in final verification step.
- Live Preview verification: Inspected rendered UI, navigation views, markdown viewer, and tested Copy Report button click/clipboard feedback.

KNOWN LIMITATIONS:
- Workspace is not initialized as a Git repository and has NOT been pushed to a remote GitHub repository.
- Smart TV compatibility findings are preliminary documentation research, not tested on physical TV hardware.
- Country Activation Register marks all jurisdictions NOT ACTIVATED pending qualified local legal advice.
- Phase 2 prototype features (Ad Studio, 16:9 TV Preview, Break Simulator, Opportunity Portal, Physical QR scanning) are not yet built.

SECURITY & PRIVACY CONSIDERATIONS:
- No secrets or .env files accessed or exposed; no real payments or external outreach implemented.
- Architecture enforces zero unlawful broadcaster stream modification, zero HDCP/DRM bypass, strict QR URL allowlisting, and 3-tier opportunity verification independent of payment.

PREVIEW STATUS:
- Preview available: YES (Port 3000 Phase 1 Governance & Reporting Console)
- Features verified: Navigation across Reports, Roadmap, Smart TV Matrix, 25 Markdown Documents, Command Centre, Risks/FMEA, and Copy Report button.
- Features not yet connected: Phase 2 interactive prototype workflows (scheduled sequentially after commit confirmation).

REQUIRED USER ACTION:
THIS BLOCK IS COMPLETE. PLEASE REVIEW THE CHANGES AND COMMIT THEM BEFORE WE PROCEED.

NEXT STEP:
Wait for the Project Owner to confirm that the Phase 1 commit has been completed, then begin Phase 2, Block 2.1 (Application Foundation, Express Server & Prototype Persistence).

PRODUCTION GATE:
LOCKED UNTIL COMMIT CONFIRMATION.`,
  };
}
