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
    milestoneGate: 'All 7 prototype blocks verified, committed, and handed over for Phase 3 hardening.',
    status: 'COMMITTED',
  },
  {
    phase: 3,
    title: 'VS Code Engineering & Architecture Hardening',
    summary:
      'Handover activated (VSCODE_HANDOVER_PACKAGE.md; TASK-P3-001 READY): PostgreSQL migration, automated Vitest/Playwright E2E test suite, RBAC auth hardening, CI/CD, and FFmpeg media pipeline workers.',
    milestoneGate: 'Hardened codebase with automated test coverage and production DB persistence.',
    status: 'IN PROGRESS',
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
    ? `Users: ${s.userCount} | Profiles: ${s.profileCount} | Campaigns: ${s.campaignCount} (Active: ${s.activeCampaignCount}) | Ad Creatives: ${s.adCreativeCount} | Opportunities: ${s.opportunityCount ?? 0} (Live: ${s.verifiedLiveOpportunityCount ?? 0}) | QR Links: ${s.qrCount} | Sim Events: ${s.simulatedEventsTotal ?? 0} | Real 302s: ${s.redirectIssuedTotal} | Physical Phone QR Scans: ${s.physicalQrPassedCount ?? 0}/${s.physicalQrTestsCount ?? 0} | Audits: ${s.auditLogCount}`
    : 'Live store telemetry connecting...';

  const pm = liveSnapshot?.progressMetrics;
  const pctBlock = pm
    ? `${pm.overallFullAppPct}% of Full 15-Phase App (${pm.remainingUntilFullAppPct}% remaining) · ${pm.softwareToStageP6Pct}% of Software-to-Stage-P6 Milestone · ${pm.aiStudioAssignmentPct}% of AI Studio Assignment (${pm.consentBlockedScopePct}% blocked on DEC-OPEN-01)`
    : '15.5% of Full 15-Phase App (84.5% remaining) · 25% of Software-to-Stage-P6 · 62% of AI Studio Assignment';

  if (command === 'STATUS') {
    return {
      title: 'EDISON — STATUS REPORT',
      subtitle: 'Live phase, stage, block, and honest progress percentages until full app',
      body: [
        'EDISON — PROJECT STATUS REPORT',
        `Generated: ${generatedAt}`,
        `Current Phase: ${liveSnapshot?.phase ?? 'Phase 2 — AI Studio Functional Prototype (Track A Active)'}`,
        `Current Stage: ${liveSnapshot?.stage ?? 'P2-V2 Track A (Non-Consent Core) · Phase 3 TASK-P3-001 Held in DRAFT'}`,
        `Current Block: ${liveSnapshot?.block ?? 'Block P2-V2.1 ($0 Charity Lock & Commercial Text-Only Format)'}`,
        `Commit Gate: ${liveSnapshot?.gateStatus ?? 'AWAITING OWNER REVIEW & COMMIT'}`,
        '',
        `PROGRESS UNTIL FULL APP: ${pctBlock}`,
        '',
        'AI STUDIO ASSIGNMENT PROGRESS:',
        '- Phase 1 + Blueprint v2.1 Reconciliation + v2.2 Shared Ad Intelligence Specs: COMMITTED (10%)',
        '- Phase 2 Baseline Blocks 2.1–2.7 + P2-FIX.1–6: COMMITTED (45%)',
        '- Block P2-V2.1 ($0 Charity Lock + Commercial Text-Only Ad + Ledger Types + Progress Metrics): ACTIVE (7%)',
        '- Block P2-V2.2 (Alternating 4-Slot Scheduler + Direct Priority + Mock AdNetworkAdapter + 7-Stream Analytics): NEXT UNBLOCKED (7%)',
        '- Block P2-V2.3 (Vitest + Supertest Automated Regression Suite): QUEUED (6%)',
        '- Track B (Consent / Household Geo / Multi-Profile / Epoch 403): BLOCKED ON DEC-OPEN-01 (15%)',
        '- Shared Ad Intelligence Prototype Preview & Final Handover Sign-Off: QUEUED (10%)',
        '',
        'OVERALL EDISON PROJECT PROGRESS:',
        `- ${pm?.rubricSummary ?? 'Phase 1 Specs (6%) + Phase 2 Blocks 2.1-2.7 & P2-V2.1 (9.5%) = 15.5% of Full 15-Phase Commercial App (84.5% remaining).'}`,
        '- Phase 3 (TASK-P3-001) held in DRAFT; Phases 4–15 NOT STARTED; single Stage P6 physical TV test deferred until app completion.',
        '',
        'LIVE STORE COUNTS:',
        countsLine,
        '',
        'NEXT AUTHORISED ACTION:',
        'Review & commit Block P2-V2.1, then proceed to Block P2-V2.2 (Alternating Break Scheduler + Direct Priority + Mock AdNetworkAdapter). Resolve DEC-OPEN-01 when ready to unlock Track B.',
      ].join('\n'),
    };
  }

  if (command === 'CHECK') {
    return {
      title: 'EDISON — CHECK REPORT',
      subtitle: 'Verification evidence, outstanding work, and progress metrics',
      body: [
        'EDISON — VERIFICATION & GATE CHECK',
        `Generated: ${generatedAt}`,
        `Active Block: ${liveSnapshot?.block ?? 'Block P2-V2.1 ($0 Charity Lock & Commercial Text-Only Format)'}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        `QR Telemetry: Redirect Requests=${s?.redirectRequestsTotal ?? 0} | Redirects Issued=${s?.redirectIssuedTotal ?? 0} | Suspected Bots=${s?.suspectedBotRedirects ?? 0} | Verified Destination Opens=${s?.verifiedDestinationOpens ?? 0} | Verified Conversions=${s?.verifiedConversionsTotal ?? 0}`,
        `Physical Phone Scan Logs: ${s?.physicalQrPassedCount ?? 0} passed / ${s?.physicalQrTestsCount ?? 0} total`,
        '',
        'VERIFIED IMPLEMENTATIONS (PHASE 2):',
        '- Locked atomic JSON persistence (data/edison-store.json, schemaVersion 7)',
        '- Auth/RBAC (advertiser, opportunity_submitter, admin) with scrypt hashing',
        '- Real QR destination validation & /r/:token redirect telemetry',
        '- Advertiser profile, 10-state campaigns & permanent $0.00 / FREE CHARITY ADS lock (paymentCollectionActive: false)',
        '- Option A Studio, Option B External Upload/jsQR, and zero-media Commercial Text-Only Ad format',
        '- Playable 16:9 TV Preview, Pre-Submission Approval Gate & Commercial-Break Simulator',
        '- Opportunity Submission, Non-Transitive 3-Tier Verification, Expiry, Complaints & Appeals',
        '- Admin Moderation Console & 7-Stage Funnel Analytics',
        '',
        'OUTSTANDING CHECKS:',
        '- Physical smartphone camera scan verification logged by Project Owner on real mobile hardware.',
        '- Track B Consent / Multi-Profile scope strictly BLOCKED awaiting Owner decision DEC-OPEN-01.',
        '- Phase 3 Engineering Hardening (TASK-P3-001 held in DRAFT until Phase 2 settles).',
      ].join('\n'),
    };
  }

  if (command === 'NEXT') {
    return {
      title: 'EDISON — NEXT AUTHORISED ACTION',
      subtitle: 'Phase 2 Track A sequence and Owner decisions required',
      body: [
        'EDISON — NEXT GATE EVALUATION',
        `Generated: ${generatedAt}`,
        `Current Gate: ${liveSnapshot?.gateStatus ?? 'AWAITING OWNER REVIEW & COMMIT'}`,
        `Progress Until Full App: ${pctBlock}`,
        '',
        'GATE STATUS:',
        'Prior P2-FIX.6 + Blueprint v2.1/v2.2 commit confirmed. Block P2-V2.1 is implemented and requires Owner review & commit before unlocking Block P2-V2.2.',
        '',
        'OWNER DECISIONS PENDING:',
        '- DEC-OPEN-01: Select Option A (Account-Free Contextual), Option B (Full Household + Multi-Profile + Epoch 403), or Option C (Hybrid Opt-In).',
        '- DEC-OPEN-02: Confirm k=1 short-break alternating rule.',
      ].join('\n'),
    };
  }

  if (command === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT CHECKPOINT',
      subtitle: 'Block P2-V2.1 files for manual owner commit',
      body: [
        'EDISON — COMMIT CHECKPOINT (BLOCK P2-V2.1)',
        `Generated: ${generatedAt}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        '',
        'STATUS: AWAITING MANUAL OWNER COMMIT',
        'KEY FILES: src/types/edison.ts, src/server/store.ts, server.ts, src/components/CampaignViews.tsx, src/components/AdStudioView.tsx, src/components/TvPreviewView.tsx, PROGRESS_TRACKER.md, coordination/EDISON_COMMAND_CENTER.md',
        'REMINDER: Do not stage .env or runtime /data/edison-store.json secrets.',
      ].join('\n'),
    };
  }

  return {
    title: 'EDISON — PHASE 2 TRACK A & FULL-APP PROGRESS REPORT',
    subtitle: 'Formal status report with live server telemetry and progress breakdown',
    body: [
      'EDISON — IMPLEMENTATION BLOCK COMPLETION REPORT',
      '',
      'Project: EDISON — International Smart TV Advertising & Opportunities Network',
      `Production Phase: ${liveSnapshot?.phase ?? 'Phase 2 — AI Studio Functional Prototype (Track A Active)'}`,
      `Stage: ${liveSnapshot?.stage ?? 'P2-V2 Track A (Non-Consent Core) · Phase 3 TASK-P3-001 Held in DRAFT'}`,
      `Implementation Block: ${liveSnapshot?.block ?? 'Block P2-V2.1 ($0 Charity Lock & Commercial Text-Only Format)'}`,
      `Status: ${liveSnapshot?.gateStatus ?? 'AWAITING OWNER REVIEW & COMMIT'}`,
      '',
      `AI STUDIO ASSIGNMENT PROGRESS: ${pm?.aiStudioAssignmentPct ?? 62}%`,
      `OVERALL EDISON PROJECT PROGRESS: ${pm?.overallFullAppPct ?? 15.5}% of Full 15-Phase App (${pm?.remainingUntilFullAppPct ?? 84.5}% remaining) · ${pm?.softwareToStageP6Pct ?? 25}% of Software-to-Stage-P6 Milestone`,
      '',
      'LIVE STORE TELEMETRY:',
      countsLine,
      `Latest Audit: ${liveSnapshot?.latestAuditAction ?? 'N/A'} (${liveSnapshot?.latestAuditAt ?? 'N/A'})`,
      '',
      'REQUIRED USER ACTION:',
      'Review and commit Block P2-V2.1 before proceeding to Block P2-V2.2.',
      '',
      'PRODUCTION GATE:',
      'LOCKED UNTIL COMMIT CONFIRMATION.',
    ].join('\n'),
  };
}
