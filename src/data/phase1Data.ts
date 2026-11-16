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
      'Baseline Blocks 2.1–2.7 + P2-V2.1–P2-V2.4 (Shared Ad Intelligence Prototype Preview & Track A Final Handover Sign-Off, 85% AI Studio) Committed. Remaining 15% (Track B) strictly blocked on DEC-OPEN-01.',
    milestoneGate: 'Track A 100% committed; Track B awaits Owner resolution of DEC-OPEN-01.',
    status: 'COMMITTED',
  },
  {
    phase: 3,
    title: 'Software-First Engineering & Architecture Hardening (Block P3-A + Block P3-B + TASK-P3-001)',
    summary:
      'IN PROGRESS — Block P3-A (API Zod validation, CSRF, edisonFetch, rate limits, SHA-256 sessions) COMMITTED. Block P3-B (EdisonDataRepository port, /uploads/* CSP/symlink/polyglot hardening, API timeout 504 & JSON error middleware, React AppErrorBoundary & GitHub CI workflow) VERIFIED & AWAITING COMMIT. TASK-P3-001 is READY (JSON retained without paid Cloud SQL). Track B excluded per DEC-OPEN-01.',
    milestoneGate: 'Hardened Track A codebase with repository portability, automated security/CI tests & PostgreSQL migration readiness.',
    status: 'AWAITING COMMIT',
  },
  {
    phase: 4,
    title: 'Smart TV Platform Feasibility & Adapter Engineering (Software-First)',
    summary:
      'Android TV TIF, Tizen & webOS adapters plus Normal Everyday TV Remote Control (AURA -> EDISON Control Engine -> platform adapters -> TV: power, volume/mute, channel, source/input, D-pad/back/home), strictly separate from ad-break switching/restoration; tested on emulators with zero physical TV hardware compatibility claimed prior to Stage P6.',
    milestoneGate: 'Software/emulator adapters verified without undocumented hooks; hardware compatibility checked only at Stage P6.',
    status: 'NOT STARTED',
  },
  {
    phase: 5,
    title: 'Commercial-Break Detection, Prediction & Shared Ad Intelligence',
    summary:
      'SCTE-35, HbbTV/ATSC 3.0 metadata, lawful pattern analysis, per-channel break-length ML predictor, plus production Network-Wide Shared Ad Intelligence service & scoped Local Intelligence Cache (ADR-016 / PRD-19; prototype preview only in Phase 2).',
    milestoneGate: 'Measured precision/recall, multi-TV corroboration, rollback & safety buffer verified in software.',
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
    ? `${pm.overallFullAppPct}% of Full 15-Phase App (${pm.remainingUntilFullAppPct}% remaining) · ${pm.softwareToStageP6Pct}% of Software-to-Stage-P6 Milestone · ${pm.aiStudioAssignmentPct}% of Phase 2 AI Studio Scope (${pm.consentBlockedScopePct}% blocked on DEC-OPEN-01)`
    : '28.0% of Full 15-Phase App (72.0% remaining) · 45.2% of Software-to-Stage-P6 · 85% of Phase 2 AI Studio Scope (15% Track B blocked on DEC-OPEN-01)';

  if (command === 'STATUS') {
    return {
      title: 'EDISON — STATUS REPORT',
      subtitle: 'Live phase, stage, block, and honest progress percentages until full app',
      body: [
        'EDISON — PROJECT STATUS REPORT',
        `Generated: ${generatedAt}`,
        `Current Phase: ${liveSnapshot?.phase ?? 'Phase 3 — Software-First Engineering Hardening (Track A Active · JSON Retained)'}`,
        `Current Stage: ${liveSnapshot?.stage ?? 'Block P3-A & P3-B Committed · Block P3-C Complete · TASK-P3-001 READY'}`,
        `Current Block: ${liveSnapshot?.block ?? 'Block P3-C (Request Correlation, Hardened Audit Export & Software-Only TvPlatformAdapter / AURA Remote Contracts)'}`,
        `Commit Gate: ${liveSnapshot?.gateStatus ?? 'BLOCK P3-C VERIFIED · AWAITING COMMIT (TRACK B BLOCKED ON DEC-OPEN-01 · NO CLOUD SQL PROVISIONED)'}`,
        '',
        `PROGRESS UNTIL FULL APP: ${pctBlock}`,
        '',
        'PHASE 2 & PHASE 3 PROGRESS:',
        '- Phase 1 + Blueprint v2.1 + v2.2 Shared Ad Intelligence Specs: COMMITTED (6.0% Full App)',
        '- Phase 2 Track A Complete (Blocks 2.1–2.7 + P2-V2.1–P2-V2.4, 85% AI Studio): COMMITTED (13.0% / 14.0% Full App)',
        '- Phase 3 Block P3-A (API Zod validation, CSRF, rate limits, hashed/rotated sessions & security suite): COMMITTED (3.0% / 12.0% Full App)',
        '- Phase 3 Block P3-B (EdisonDataRepository port, /uploads/* CSP/symlink/polyglot hardening, API timeout 504/JSON error middleware, AppErrorBoundary & CI): COMMITTED (3.0% / 12.0% Full App)',
        '- Phase 3 Block P3-C (X-Request-Id correlation, CSV formula-neutralized audit export, software-only TvPlatformAdapter & AURA Normal TV Remote simulator): VERIFIED · AWAITING COMMIT (3.0% / 12.0% Full App)',
        '- TASK-P3-001 PostgreSQL 16+ Migration Requirements Blueprint: READY (JSON persistence retained in AI Studio without Cloud SQL)',
        '- Track B (Consent / Household Geo / Multi-Profile / Epoch 403): BLOCKED ON DEC-OPEN-01 (15% Phase 2 scope)',
        '',
        'OVERALL EDISON PROJECT PROGRESS:',
        `- ${pm?.rubricSummary ?? 'Phase 1 Specs (6.0%) + Phase 2 Track A Complete (13.0%) + Phase 3 Blocks P3-A & P3-B Committed (6.0%) + Block P3-C Awaiting Commit (3.0%) = 28.0% of Full 15-Phase Commercial App (72.0% remaining).'}`,
        '- Normal Everyday TV Remote (AURA -> EDISON Control Engine -> platform adapters -> TV): SOFTWARE-ONLY CONTRACT/SIMULATOR COMPLETE IN P3-C (Zero physical hardware tested; Stage P6 deferred); Shared Intelligence Phase 5 Service NOT STARTED.',
        '',
        'LIVE STORE COUNTS:',
        countsLine,
        '',
        'NEXT AUTHORISED ACTION:',
        'Review and commit Block P3-C changes, then confirm commit to unlock Phase 4 software-only TV adapter & offline intelligence cache implementation (or authorise external PostgreSQL execution for TASK-P3-001). Track B remains strictly blocked pending DEC-OPEN-01.',
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
        `Active Block: ${liveSnapshot?.block ?? 'Block P3-C (Request Correlation, Hardened Audit Export & Software-Only TvPlatformAdapter / AURA Remote Contracts)'}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        `QR Telemetry: Redirect Requests=${s?.redirectRequestsTotal ?? 0} | Redirects Issued=${s?.redirectIssuedTotal ?? 0} | Suspected Bots=${s?.suspectedBotRedirects ?? 0} | Verified Destination Opens=${s?.verifiedDestinationOpens ?? 0} | Verified Conversions=${s?.verifiedConversionsTotal ?? 0}`,
        `Physical Phone Scan Logs: ${s?.physicalQrPassedCount ?? 0} passed / ${s?.physicalQrTestsCount ?? 0} total`,
        '',
        'VERIFIED IMPLEMENTATIONS (PHASE 2 TRACK A + BLOCKS P3-A/P3-B COMMITTED + BLOCK P3-C):',
        '- Persistence portability via EdisonDataRepository interface (JSON store schemaVersion 8 retained; zero Cloud SQL cost)',
        '- Auth/RBAC (advertiser, opportunity_submitter, admin) with scrypt hashing, session rotation & 2h idle timeout',
        '- API Zod validation schemas, cookie/header CSRF + edisonFetch, sliding-window rate limiting, 504 timeout & opaque JSON error middleware',
        '- X-Request-Id correlation middleware, sanitised request telemetry & CSV formula-neutralized Admin Audit Export (/api/admin/audit-logs/export)',
        '- Hardened /uploads/* static serving (CSP default-src none; sandbox, CORP same-origin, canonical realpath symlink guard, SVG/polyglot blocking)',
        '- Software-Only Modular TvPlatformAdapter contracts & AURA Normal Everyday TV Remote Control Engine with watchdog fault-recovery simulation (hardware testing deferred strictly to Stage P6)',
        '- React AppErrorBoundary + GitHub Actions CI (.github/workflows/edison-ci.yml)',
        '- Real QR destination validation & /r/:token redirect telemetry',
        '- Advertiser profile, 10-state campaigns & permanent $0.00 / FREE CHARITY ADS lock (paymentCollectionActive: false)',
        '- Option A Studio, Option B External Upload/jsQR, and zero-media Commercial Text-Only Ad format',
        '- Playable 16:9 TV Preview, Pre-Submission Approval Gate & Alternating 4-Slot Break Scheduler (SimulationTvAdapter)',
        '- Direct-Paid Commercial Priority vs MockAdNetworkBackfillAdapter (DEC-OPEN-03) & Separated 6-Stream Financial Ledger (ADR-012)',
        '- Opportunity Submission, Non-Transitive 3-Tier Verification, Expiry, Complaints & Appeals',
        '- Admin Moderation Console & 7-Stage Funnel Analytics',
        '- Vitest + Supertest Automated Suite (npm test — incl. tvPlatformAdapter.test.ts & securityHardening.test.ts)',
        '- Shared Ad Intelligence Prototype Preview (Mock Simulation Only — K=3 Quorum, Zero PII, Scoped Cache, Auto-Rollback)',
        '',
        'OUTSTANDING CHECKS & POST-PROTOTYPE CORE REQUIREMENTS:',
        '- Physical smartphone camera scan verification logged by Project Owner on real mobile hardware.',
        '- Normal Everyday TV Remote Control (AURA -> EDISON Control Engine -> platform adapters -> TV, ADR-017 / PRD-20): SOFTWARE SIMULATION CONTRACT COMPLETE IN P3-C (Zero physical HW compatibility claimed; Stage P6 deferred).',
        '- Network-Wide Shared Ad Intelligence Production Service (ADR-016 / PRD-19): APPROVED CORE REQUIREMENT / PHASE 5 PRODUCTION SERVICE NOT STARTED (Mock preview only in P2).',
        '- Track B Consent / Multi-Profile scope (15%) strictly BLOCKED awaiting Owner decision DEC-OPEN-01.',
        '- TASK-P3-001 (PostgreSQL Migration) is READY (docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md); JSON persistence retained without paid Cloud SQL until external DB execution.',
      ].join('\n'),
    };
  }

  if (command === 'NEXT') {
    return {
      title: 'EDISON — NEXT AUTHORISED ACTION',
      subtitle: 'Block P3-C verified & awaiting commit; Blocks P3-A & P3-B committed; TASK-P3-001 READY',
      body: [
        'EDISON — NEXT GATE EVALUATION',
        `Generated: ${generatedAt}`,
        `Current Gate: ${liveSnapshot?.gateStatus ?? 'BLOCK P3-C VERIFIED · AWAITING COMMIT (TRACK B BLOCKED ON DEC-OPEN-01 · NO CLOUD SQL PROVISIONED)'}`,
        `Progress Until Full App: ${pctBlock}`,
        '',
        'GATE STATUS & NEXT BLOCK:',
        'Block P3-C (X-Request-Id correlation, CSV formula-neutralized audit export, and software-only modular TvPlatformAdapter + AURA Normal Everyday TV Remote simulator) is VERIFIED & AWAITING COMMIT. TASK-P3-001 PostgreSQL blueprint is READY while retaining JSON persistence in AI Studio without paid Cloud SQL.',
        '',
        'AFTER COMMIT CONFIRMATION:',
        '- Next Software-First Phase 4 Block (Block 4.1): Platform-specific Android TV TIF / Samsung Tizen / LG webOS software adapter harnesses, local offline intelligence cache engine & deterministic fault-injection suite (Stage P6 physical hardware test remains deferred).',
        '- DEC-OPEN-01 (Blocks Track B Only): Select Option A, Option B, or Option C to unlock Track B (15%).',
        '- DEC-OPEN-02: Confirm k=1 short-break alternating rule.',
        '- DEC-OPEN-03: Google Ad Manager CTV account / format confirmation (mock adapter active until resolved).',
      ].join('\n'),
    };
  }

  if (command === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT CHECKPOINT',
      subtitle: 'Block P3-C verified and awaiting manual owner commit',
      body: [
        'EDISON — COMMIT CHECKPOINT (BLOCK P3-C)',
        `Generated: ${generatedAt}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        '',
        'STATUS: VERIFIED · AWAITING MANUAL OWNER COMMIT',
        'REQUIRED USER ACTION: Review the Block P3-C changes and manually commit them before proceeding.',
      ].join('\n'),
    };
  }

  return {
    title: 'EDISON — PHASE 3 HARDENING & FULL-APP PROGRESS REPORT',
    subtitle: 'Formal status report with live server telemetry and progress breakdown',
    body: [
      'EDISON — IMPLEMENTATION BLOCK COMPLETION REPORT',
      '',
      'Project: EDISON — International Smart TV Advertising & Opportunities Network',
      `Production Phase: ${liveSnapshot?.phase ?? 'Phase 3 — Software-First Engineering Hardening (Track A Active · JSON Retained)'}`,
      `Stage: ${liveSnapshot?.stage ?? 'Block P3-A & P3-B Committed · Block P3-C Complete · TASK-P3-001 READY'}`,
      `Implementation Block: ${liveSnapshot?.block ?? 'Block P3-C (Request Correlation, Hardened Audit Export & Software-Only TvPlatformAdapter / AURA Remote Contracts)'}`,
      `Status: ${liveSnapshot?.gateStatus ?? 'BLOCK P3-C VERIFIED · AWAITING COMMIT (TRACK B BLOCKED ON DEC-OPEN-01 · NO CLOUD SQL PROVISIONED)'}`,
      '',
      `PHASE 2 AI STUDIO SCOPE: ${pm?.aiStudioAssignmentPct ?? 85}% (100% Track A Committed; 15% Track B Blocked on DEC-OPEN-01)`,
      `OVERALL EDISON PROJECT PROGRESS: ${pm?.overallFullAppPct ?? 28.0}% of Full 15-Phase App (${pm?.remainingUntilFullAppPct ?? 72.0}% remaining) · ${pm?.softwareToStageP6Pct ?? 45.2}% of Software-to-Stage-P6 Milestone`,
      '',
      'LIVE STORE TELEMETRY:',
      countsLine,
      `Latest Audit: ${liveSnapshot?.latestAuditAction ?? 'N/A'} (${liveSnapshot?.latestAuditAt ?? 'N/A'})`,
      '',
      'REQUIRED USER ACTION:',
      'Review Block P3-C changes and manually commit them to unlock Phase 4 software adapter blocks (or TASK-P3-001 DB execution).',
      '',
      'PRODUCTION GATE:',
      'LOCKED UNTIL COMMIT CONFIRMATION (TRACK B BLOCKED ON DEC-OPEN-01).',
    ].join('\n'),
  };
}
