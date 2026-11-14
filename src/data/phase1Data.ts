import type { LiveReportSnapshot } from '../types/edison';

export interface RoadmapPhaseItem {
  phase: number;
  title: string;
  summary: string;
  milestoneGate: string;
  status: 'COMMITTED' | 'IN PROGRESS' | 'AWAITING COMMIT' | 'NOT STARTED';
}

export const ROADMAP_PHASES: RoadmapPhaseItem[] = [
  {
    phase: 1,
    title: 'Project Definition & Technical Research',
    summary:
      'Governance, requirements, business model, Smart TV feasibility research, architecture, risk/failure registers, testing strategy, 25 GitHub docs, Command Centre, Copy Report console.',
    milestoneGate: '25 documentation files authored, build/lint verified, committed to GitHub.',
    status: 'COMMITTED',
  },
  {
    phase: 2,
    title: 'AI Studio Functional Prototype',
    summary:
      'Sequential prototype blocks: 2.1 Auth/RBAC/Store/QR -> 2.2 Advertiser & Campaigns -> 2.3 Ad Creation Studio (A & B) -> 2.4 16:9 TV Preview & Simulator -> 2.5 Opportunities -> 2.6 Admin Moderation -> 2.7 Physical QR QA & Handover.',
    milestoneGate: 'All 7 prototype blocks verified and handed over for Phase 3 hardening.',
    status: 'IN PROGRESS',
  },
  {
    phase: 3,
    title: 'VS Code Engineering & Architecture Hardening',
    summary:
      'Production repository refactor, automated unit/integration/E2E test suite, persistent relational/cloud database migration, RBAC auth hardening, CI/CD, media pipeline workers.',
    milestoneGate: 'Hardened codebase with automated test coverage and production DB persistence.',
    status: 'NOT STARTED',
  },
  {
    phase: 4,
    title: 'Smart TV Platform Feasibility & Integrations',
    summary:
      'Physical hardware test lab (Android TV, Samsung Tizen, LG webOS, external HDMI/STB); proof-of-concept adapters within documented OEM permissions; latency benchmarking.',
    milestoneGate: 'Physical device benchmarks recorded per OS without undocumented hooks.',
    status: 'NOT STARTED',
  },
  {
    phase: 5,
    title: 'Commercial-Break Detection & Prediction',
    summary:
      'Evaluation of SCTE-35, HbbTV/ATSC 3.0 metadata, lawful pattern analysis, per-channel break-length ML predictor, false-positive/missed-break calibration.',
    milestoneGate: 'Measured precision/recall & safety buffer verified against broadcast feeds.',
    status: 'NOT STARTED',
  },
  {
    phase: 6,
    title: 'Advertising Delivery Infrastructure',
    summary:
      'Low-latency CDN, preloading manifests, high-throughput QR redirect service with abuse filtering, deduplicated event ingestion pipeline.',
    milestoneGate: 'Load-tested delivery & redirect pipeline with bot/duplicate separation.',
    status: 'NOT STARTED',
  },
  {
    phase: 7,
    title: 'Advertiser Management & Campaign Operations',
    summary:
      'Production KYC, billing/inicing integration, automated pacing, SLA support desk, advertiser audit logs.',
    milestoneGate: 'Explicit authorization for billing & live advertiser onboarding.',
    status: 'NOT STARTED',
  },
  {
    phase: 8,
    title: 'Advertisement Creation & Production Rendering',
    summary:
      'Server-side 1080p/4K MP4/HLS rendering from Studio JSON compositions, automated broadcast loudness/codec validation, automated QR vision inspection.',
    milestoneGate: 'Broadcast-compliant media pipeline verified across target TV decoders.',
    status: 'NOT STARTED',
  },
  {
    phase: 9,
    title: 'Opportunity Management & Verification',
    summary:
      'Dedicated verification operations tooling, document vault encryption, automated expiry & employer re-verification, complaint/investigation/appeal workflows.',
    milestoneGate: '3-tier verification strictly decoupled from advertising spend.',
    status: 'NOT STARTED',
  },
  {
    phase: 10,
    title: 'Privacy, Security & Legal Compliance',
    summary:
      'Jurisdiction-specific consent flows, DSR/deletion automation, penetration testing, legal sign-off on opportunity-vs-consent decoupling.',
    milestoneGate: 'External security audit & statutory compliance sign-off.',
    status: 'NOT STARTED',
  },
  {
    phase: 11,
    title: 'Reliability & Failure Testing',
    summary:
      'Chaos/fault injection across all 18+ failure modes (network drop, decoder crash, CEC/HDCP failure, return-to-TV watchdog verification).',
    milestoneGate: 'Zero unrecovered live TV interruptions across fault-injection suite.',
    status: 'NOT STARTED',
  },
  {
    phase: 12,
    title: 'Controlled Hardware & Viewer Pilot',
    summary:
      'Opt-in closed pilot using prompt-based or approved linear architecture; physical measurement of switching latency, restoration reliability, and QR scan rates.',
    milestoneGate: 'Pilot telemetry and viewer experience criteria passed on real hardware.',
    status: 'NOT STARTED',
  },
  {
    phase: 13,
    title: 'Commercial Readiness',
    summary:
      'Production SLAs, real payment processing, broadcaster/OEM commercial agreements, operational runbooks.',
    milestoneGate: 'Commercial readiness board approval.',
    status: 'NOT STARTED',
  },
  {
    phase: 14,
    title: 'Country-by-Country Launch',
    summary:
      'Activation gated strictly by Country Activation Register legal, tax, recruitment, and broadcast sign-offs.',
    milestoneGate: 'Approved Country Activation Register entry per territory.',
    status: 'NOT STARTED',
  },
  {
    phase: 15,
    title: 'International Expansion',
    summary:
      'Multi-region localization, cross-border compliance scaling, multi-currency billing.',
    milestoneGate: 'Sustained SLA, compliance, and unit economics in launched territories.',
    status: 'NOT STARTED',
  },
];

export interface SmartTvMatrixRow {
  platform: string;
  architecturePath: string;
  keyConstraints: string;
  technicallyPossible: string;
  officiallyDocumented: string;
  platformPermitted: string;
  hardwareTested: string;
  productionSuitable: string;
}

export const SMART_TV_MATRIX: SmartTvMatrixRow[] = [
  {
    platform: 'Android TV / Tizen / webOS (3P Store)',
    architecturePath: 'Silent background channel monitoring + forced screen takeover',
    keyConstraints:
      'READ_EPG_DATA restricted to system apps; Tizen prohibits background UI web apps; webOS suspends unfocused apps.',
    technicallyPossible: 'Partially (root/system sig)',
    officiallyDocumented: 'NO (explicitly restricted)',
    platformPermitted: 'NO (violates store & OS security)',
    hardwareTested: 'Not Tested',
    productionSuitable: 'NO — REJECTED',
  },
  {
    platform: 'Android TV / HbbTV / Tizen (Linear App)',
    architecturePath: 'Arch A: Permitted Linear / TIF / HbbTV App inside owned session',
    keyConstraints:
      'EDISON operates within its own linear TV channel, TvInputService session, or HbbTV stream; cannot hijack third-party inputs.',
    technicallyPossible: 'YES',
    officiallyDocumented: 'YES (TvInputService, HbbTV, tizen.tvwindow)',
    platformPermitted: 'YES (within own session)',
    hardwareTested: 'Not Tested',
    productionSuitable: 'Candidate (Phase 4/12)',
  },
  {
    platform: 'Samsung / LG / Google TV OEM',
    architecturePath: 'Arch B: OEM / Pay-TV Operator Partnership (privileged service)',
    keyConstraints:
      'Requires formal OEM/Operator agreements, partner-gated SDKs, and native ACR/SCTE-35 integration.',
    technicallyPossible: 'YES',
    officiallyDocumented: 'Partner-gated SDKs',
    platformPermitted: 'Requires OEM/Operator contract',
    hardwareTested: 'Not Tested',
    productionSuitable: 'Long-term Target (Phase 4/12+)',
  },
  {
    platform: 'External HDMI / STB Companion',
    architecturePath: 'Arch C: Dedicated HDMI Companion Hardware / CEC Switcher',
    keyConstraints:
      'Strict HDCP 2.2/2.3 repeater compliance required; must never strip or bypass DRM/HDCP.',
    technicallyPossible: 'YES (HDCP hurdles)',
    officiallyDocumented: 'HDMI-CEC & HDCP specs exist',
    platformPermitted: 'Hardware-dependent',
    hardwareTested: 'Not Tested',
    productionSuitable: 'Candidate Pilot Option (Phase 4/12)',
  },
  {
    platform: 'Cross-Platform Pilot Mode',
    architecturePath: 'Opt-in Viewer Prompt Pilot (viewer accepts break switch)',
    keyConstraints:
      'Relies on explicit viewer action rather than background OS hijacking; safe for initial controlled validation.',
    technicallyPossible: 'YES',
    officiallyDocumented: 'YES',
    platformPermitted: 'YES (explicit user action)',
    hardwareTested: 'Not Tested',
    productionSuitable: 'Recommended Initial Pilot',
  },
];

export interface Phase1ChecklistItem {
  id: number;
  item: string;
  status: string;
}

export const PHASE1_CHECKLIST: Phase1ChecklistItem[] = [
  { id: 1, item: 'Project Master Specification (PROJECT_MASTER_SPECIFICATION.md)', status: 'VERIFIED · COMMITTED' },
  { id: 2, item: 'Business Model & Non-Influenced Verification Policy (BUSINESS_MODEL.md)', status: 'VERIFIED · COMMITTED' },
  { id: 3, item: 'Product Requirements Document (PRODUCT_REQUIREMENTS.md)', status: 'VERIFIED · COMMITTED' },
  { id: 4, item: 'System Architecture Specification (SYSTEM_ARCHITECTURE.md)', status: 'VERIFIED · COMMITTED' },
  { id: 5, item: 'Technical Requirements Specification (TECHNICAL_REQUIREMENTS.md)', status: 'VERIFIED · COMMITTED' },
  { id: 6, item: 'Smart TV Compatibility Preliminary Research (SMART_TV_COMPATIBILITY_RESEARCH.md)', status: 'VERIFIED · COMMITTED' },
  { id: 7, item: 'Commercial-Break Detection Research (COMMERCIAL_BREAK_DETECTION.md)', status: 'VERIFIED · COMMITTED' },
  { id: 8, item: 'Advertising & QR Redirect Architecture (ADVERTISING_AND_QR_SYSTEM.md)', status: 'VERIFIED · COMMITTED' },
  { id: 9, item: 'Advertisement Creation Studio Requirements (ADVERTISEMENT_CREATION_STUDIO.md)', status: 'VERIFIED · COMMITTED' },
  { id: 10, item: '16:9 Television Preview Requirements (TELEVISION_PREVIEW_EXPERIENCE.md)', status: 'VERIFIED · COMMITTED' },
  { id: 11, item: 'Opportunity Management & 3-Tier Verification (OPPORTUNITY_MANAGEMENT.md)', status: 'VERIFIED · COMMITTED' },
  { id: 12, item: 'Advertiser Management Specification (ADVERTISER_MANAGEMENT.md)', status: 'VERIFIED · COMMITTED' },
  { id: 13, item: 'Privacy, Security & Compliance Baseline (PRIVACY_SECURITY_AND_COMPLIANCE.md)', status: 'VERIFIED · COMMITTED' },
  { id: 14, item: 'Country Activation Register, Risk Register & 18 Failure Modes', status: 'VERIFIED · COMMITTED' },
  { id: 15, item: 'Complete 15-Phase Roadmap, Testing Strategy & Known Limitations', status: 'VERIFIED · COMMITTED' },
  { id: 16, item: 'AI Studio Working Boundary, Progress Tracker, Decisions Log & VS Code Handover Plan', status: 'VERIFIED · COMMITTED' },
  { id: 17, item: 'Shared Command Centre (coordination/EDISON_COMMAND_CENTER.md) & Copy Report Console', status: 'VERIFIED · COMMITTED' },
];

export type ReportCommandType =
  | 'PHASE_1_COMPLETION'
  | 'STATUS'
  | 'CHECK'
  | 'NEXT'
  | 'COMMIT';

export function generateFormalReport(
  command: ReportCommandType,
  liveSnapshot: LiveReportSnapshot | null
): { title: string; subtitle: string; body: string } {
  const s = liveSnapshot?.summary;
  const generatedAt = liveSnapshot?.generatedAt ?? new Date().toISOString();
  const countsLine = s
    ? `Users: ${s.userCount} | Profiles: ${s.profileCount} | Campaigns: ${s.campaignCount} (Active: ${s.activeCampaignCount}) | Ad Creatives: ${s.adCreativeCount} | Opportunities: ${s.opportunityCount ?? 0} (Live: ${s.verifiedLiveOpportunityCount ?? 0}) | Open Complaints: ${s.openComplaintCount ?? 0} | QR Links: ${s.qrCount} | Sim Events: ${s.simulatedEventsTotal ?? 0} | Real 302s: ${s.redirectIssuedTotal} | Audits: ${s.auditLogCount}`
    : 'Live store telemetry connecting...';

  if (command === 'STATUS') {
    return {
      title: 'EDISON — STATUS REPORT',
      subtitle: 'Live phase, stage, block, and commit gate snapshot',
      body: [
        'EDISON — PROJECT STATUS REPORT',
        `Generated: ${generatedAt}`,
        `Current Phase: ${liveSnapshot?.phase ?? 'Phase 2 — AI Studio Functional Prototype'}`,
        `Current Stage: ${liveSnapshot?.stage ?? 'Stage 2.6 — Admin Moderation Console & 7-Stage Trustworthy Analytics'}`,
        `Current Block: ${liveSnapshot?.block ?? 'Block 2.6 (Verified)'}`,
        `Commit Gate: ${liveSnapshot?.gateStatus ?? 'VERIFIED · AWAITING COMMIT'}`,
        '',
        'AI STUDIO ASSIGNMENT PROGRESS:',
        '- Phase 1 (27 Docs & Research): COMMITTED',
        '- Block 2.1 (Express/Vite, Locked Atomic Store, Auth/RBAC, QR Validator, /r/:token): COMMITTED',
        '- Block 2.2 (Advertiser Profiles, Support Tickets, Rate-Card Estimates, 10-State Campaigns): COMMITTED',
        '- Block 2.3 (Option A Ad Studio & Option B External Upload/jsQR Inspector): COMMITTED',
        '- Block 2.4 (Full 16:9 TV Preview Player, Pre-Submission Gate & Commercial-Break Simulator): COMMITTED',
        '- Deferred Open-Source Repository Research Plan (docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md): COMMITTED (DEFERRED RESEARCH RECORD)',
        '- Block 2.5 (Opportunity Submission, Independent 3-Tier Verification, Expiry, Complaints & Appeals): COMMITTED',
        '- Block 2.6 (Admin Moderation Console with Playable 16:9 Preview & 7-Stage Trustworthy Analytics): VERIFIED · AWAITING COMMIT',
        '- Block 2.7 (Physical Mobile QR Testing & VS Code Handover Package): NOT STARTED (Sequential Gate)',
        '',
        'OVERALL EDISON PROJECT PROGRESS:',
        '- Phase 1 committed; Phase 2 in progress (6 of 7 blocks built); Phases 3–15 NOT STARTED.',
        '',
        'LIVE STORE COUNTS:',
        countsLine,
        '',
        'NEXT AUTHORISED ACTION:',
        'Review Block 2.6 changes, commit to GitHub, and reply "Next" (or "Committed, next" per ADR-010) to unlock Block 2.7.',
      ].join('\n'),
    };
  }

  if (command === 'CHECK') {
    return {
      title: 'EDISON — CHECK REPORT',
      subtitle: 'Verification evidence, outstanding work, and active blockers',
      body: [
        'EDISON — VERIFICATION & GATE CHECK',
        `Generated: ${generatedAt}`,
        `Active Block: ${liveSnapshot?.block ?? 'Block 2.6 (Verified)'}`,
        `Live Store Telemetry: ${countsLine}`,
        `QR Telemetry: Redirect Requests=${s?.redirectRequestsTotal ?? 0} | Redirects Issued=${s?.redirectIssuedTotal ?? 0} | Suspected Bots=${s?.suspectedBotRedirects ?? 0} | Verified Destination Opens=${s?.verifiedDestinationOpens ?? 0} | Verified Conversions=${s?.verifiedConversionsTotal ?? 0}`,
        '',
        'VERIFIED IMPLEMENTATIONS:',
        '- Locked atomic JSON persistence (data/edison-store.json, schemaVersion 5)',
        '- Auth/RBAC (advertiser, opportunity_submitter, admin) with scrypt hashing',
        '- Real QR destination validation & /r/:token redirect telemetry',
        '- Advertiser profile & 10-state campaign workflow (paymentCollectionActive: false)',
        '- Option A 16:9 Ad Creation Studio & Option B magic-byte + jsQR inspection',
        '- Playable 16:9 TV Preview, Pre-Submission Approval Gate & Commercial-Break Simulator',
        '- Opportunity Submission, Non-Transitive 3-Tier Verification, Expiry & Campaign Lockout, Complaints & Appeals',
        '- Admin Moderation Console (Playable 16:9 CreativeStage, QR/Profile/Ticket Moderation, Audit Filter) & 7-Stage Funnel Analytics separating Simulated vs Real Measured vs Independent Verification',
        '',
        'OUTSTANDING BLOCKS IN PHASE 2:',
        '- Block 2.7: Physical Mobile QR Scan Testing & VS Code Handover Package',
      ].join('\n'),
    };
  }

  if (command === 'NEXT') {
    return {
      title: 'EDISON — NEXT AUTHORISED ACTION',
      subtitle: 'Gate check before unlocking Block 2.7',
      body: [
        'EDISON — NEXT GATE EVALUATION',
        `Generated: ${generatedAt}`,
        `Current Gate: ${liveSnapshot?.gateStatus ?? 'VERIFIED · AWAITING COMMIT'}`,
        '',
        'GATE RULE (ADR-010):',
        'Block 2.6 is marked VERIFIED · AWAITING COMMIT. Block 2.7 (Physical Mobile QR Scan Testing & VS Code Handover Package) remains LOCKED until the Project Owner commits Block 2.6 and replies "Next".',
        '',
        'OWNER CONFIRMATION:',
        'Next',
      ].join('\n'),
    };
  }

  if (command === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT CHECKPOINT',
      subtitle: 'Files and verification summary for manual owner commit',
      body: [
        'EDISON — COMMIT CHECKPOINT (BLOCK 2.6)',
        `Generated: ${generatedAt}`,
        `Live Store Telemetry: ${countsLine}`,
        '',
        'STATUS: AWAITING MANUAL OWNER COMMIT',
        'REMINDER: Do not stage .env or runtime data/edison-store.json secrets.',
        '',
        'AFTER COMMITTING, REPLY WITH:',
        'Next',
      ].join('\n'),
    };
  }

  return {
    title: 'EDISON — IMPLEMENTATION BLOCK COMPLETION REPORT (BLOCK 2.6)',
    subtitle: 'Formal completion report with live server telemetry',
    body: [
      'EDISON — IMPLEMENTATION BLOCK COMPLETION REPORT',
      '',
      'Project: EDISON — International Smart TV Advertising & Opportunities Network',
      `Production Phase: ${liveSnapshot?.phase ?? 'Phase 2 — AI Studio Functional Prototype'}`,
      `Stage: ${liveSnapshot?.stage ?? 'Stage 2.6 — Admin Moderation Console & 7-Stage Trustworthy Analytics'}`,
      `Implementation Block: ${liveSnapshot?.block ?? 'Block 2.6 — Administration, Moderation Console & 7-Stage Analytics'}`,
      `Status: ${liveSnapshot?.gateStatus ?? 'VERIFIED · AWAITING COMMIT'}`,
      '',
      'AI STUDIO ASSIGNMENT PROGRESS:',
      'Phase 1, Blocks 2.1–2.5, and Deferred Research Plan committed; Block 2.6 implemented and verified (awaiting owner commit). Block 2.7 pending sequentially.',
      '',
      'OVERALL EDISON PROJECT PROGRESS:',
      'Phase 1 committed; Phase 2 in progress (6 of 7 prototype blocks built); Phases 3–15 NOT STARTED.',
      '',
      'LIVE STORE TELEMETRY:',
      countsLine,
      `Latest Audit: ${liveSnapshot?.latestAuditAction ?? 'N/A'} (${liveSnapshot?.latestAuditAt ?? 'N/A'})`,
      '',
      'IMPLEMENTED:',
      '- Admin Moderation Console (GET /api/admin/moderation-overview, POST /api/admin/creatives/:id/clear-qr-flag, PATCH /api/admin/qr/:token/moderate) embedding the playable 16:9 CreativeStage (Play/Pause/Restart/Fullscreen, Safe-Zone Guide, QR Domain Inspection).',
      '- Enforced mandatory written rejection reasons, fix instructions, and moderator notes across campaigns, Option B QR review flags, advertiser verifications, QR link moderation, and support tickets.',
      '- Seven-Stage Analytics Funnel (GET /api/analytics/funnel) strictly scoped by RBAC and provenance: Stages 1–4 tagged Simulated Prototype Only; Stages 5–6 tagged Real Measured with bot/prefetch & 5s duplicate separation; Stage 7 (destination_opened / verified_conversion) never inferred from HTTP 302.',
      '- Filterable Immutable Audit Ledger (GET /api/admin/audit-logs?targetType=...) and safe CSV export.',
      '',
      'KNOWN LIMITATIONS:',
      '- JSON file persistence (prototype only; PostgreSQL/cloud migration deferred to Phase 3).',
      '- Stages 1–4 reflect browser simulator UI events rather than physical TV tuner metrics.',
      '- Stage 7 Destination Opens remain 0 unless an external destination callback/webhook is integrated.',
      '- Physical mobile phone QR scan testing is pending in Block 2.7; headless Chromium is absent in this container.',
      '',
      'REQUIRED USER ACTION:',
      'Review the implementation and manually commit the changes.',
      '',
      'NEXT STEP:',
      'Wait for the user to confirm that the commit has been completed ("Next" per ADR-010).',
      '',
      'PRODUCTION GATE:',
      'LOCKED UNTIL COMMIT CONFIRMATION.',
    ].join('\n'),
  };
}
