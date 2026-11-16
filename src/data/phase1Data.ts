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
    title: 'Software-First Engineering & Architecture Hardening (Blocks P3-A, P3-B, P3-C + TASK-P3-001)',
    summary:
      'Blocks P3-A, P3-B & P3-C COMMITTED. TASK-P3-001 PostgreSQL 16+ blueprint is READY (JSON retained in AI Studio without paid Cloud SQL). Track B excluded per DEC-OPEN-01.',
    milestoneGate: 'Hardened Track A codebase with repository portability, automated security/CI tests & PostgreSQL migration readiness.',
    status: 'COMMITTED',
  },
  {
    phase: 4,
    title: 'Smart TV Platform Feasibility & Adapter Engineering (Software-First)',
    summary:
      'Blocks 4.1–4.3 COMMITTED (Adapter harnesses, 16-case fault suite, SHA-256 offline cache/sync queue, 8-vector conformance, cue fixtures, policy guardrails & 10/10 software exit). Software/emulator adapters complete (9.0% / 12.0%); physical OEM SDK & Stage P6 hardware deferred.',
    milestoneGate: 'Software/emulator adapters verified without undocumented hooks; hardware compatibility checked only at Stage P6.',
    status: 'COMMITTED',
  },
  {
    phase: 5,
    title: 'Commercial-Break Detection, Prediction & Shared Ad Intelligence',
    summary:
      'Blocks 5.1 & 5.2 COMMITTED (12.0%: Ed25519 Fleet Shared Ad Intelligence Service + 11/11 Scenarios 25–35 + Per-channel p10/p5 ML lower-bound break duration predictor + 10-fixture benchmark at 0% FPR).',
    milestoneGate: 'Measured precision/recall, multi-TV corroboration, rollback & safety buffer verified in software.',
    status: 'COMMITTED',
  },
  {
    phase: 6,
    title: 'Advertising Delivery Infrastructure',
    summary:
      'Block 6.1 COMMITTED (4.0%: SHA-256 CDN preload manifests, coarse regional/schedule/codec filtering, $0.00 Charity isolation, daily frequency caps, edge outage failover & idempotent event ingestion).',
    milestoneGate: 'Load-tested delivery & redirect pipeline with bot/duplicate separation (Stage P6 physical test deferred).',
    status: 'COMMITTED',
  },
  {
    phase: 7,
    title: 'Advertiser Management & Campaign Operations',
    summary:
      'Block 7.1 VERIFIED & AWAITING COMMIT (3.0%: 6-gate KYC readiness evaluation, automated campaign pacing, non-transactional SHA-256 Pro-Forma invoice blueprints with $0.00 Charity lock & SLA ticket triage; paymentCollectionActive: false).',
    milestoneGate: 'Explicit authorization for billing & live advertiser onboarding.',
    status: 'AWAITING COMMIT',
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
    : '56.0% of Full 15-Phase App (44.0% remaining) · 80.3% of Software-to-Stage-P6 · 85% of Phase 2 AI Studio Scope (15% Track B blocked on DEC-OPEN-01)';

  if (command === 'STATUS') {
    return {
      title: 'EDISON — STATUS REPORT',
      subtitle: 'Live phase, stage, block, and honest progress percentages until full app',
      body: [
        'EDISON — PROJECT STATUS REPORT',
        `Generated: ${generatedAt}`,
        `Current Phase: ${liveSnapshot?.phase ?? 'Phase 7 — Advertiser and Campaign Operations (Software-First · Non-Transactional Billing)'}`,
        `Current Stage: ${liveSnapshot?.stage ?? 'Phases 1–6 Committed · Phase 7 Block 7.1 Advertiser Ops & Pacing Verified · TASK-P3-001 READY'}`,
        `Current Block: ${liveSnapshot?.block ?? 'Block 7.1 (Advertiser Onboarding Gates, Campaign Pacing, Pro-Forma Invoice Blueprint & Support SLA Triage)'}`,
        `Commit Gate: ${liveSnapshot?.gateStatus ?? 'BLOCK 7.1 VERIFIED · AWAITING COMMIT (TRACK B BLOCKED ON DEC-OPEN-01 · STAGE P6 HARDWARE DEFERRED)'}`,
        '',
        `PROGRESS UNTIL FULL APP: ${pctBlock}`,
        '',
        'PHASE 2 TO PHASE 7 PROGRESS:',
        '- Phase 1 + Blueprint v2.1 + v2.2 Shared Ad Intelligence Specs: COMMITTED (6.0% Full App)',
        '- Phase 2 Track A Complete (Blocks 2.1–2.7 + P2-V2.1–P2-V2.4, 85% AI Studio): COMMITTED (13.0% / 14.0% Full App)',
        '- Phase 3 Software-First Hardening (Blocks P3-A, P3-B, P3-C): COMMITTED (9.0% / 12.0% Full App)',
        '- Phase 4 Software Exit Complete (Blocks 4.1–4.3): COMMITTED (9.0% / 12.0% Full App; OEM SDK & Stage P6 deferred)',
        '- Phase 5 Complete Software-First (Block 5.1 Fleet Intelligence + Block 5.2 p10/p5 ML Predictor): COMMITTED (12.0% / 12.0% Full App)',
        '- Phase 6 Block 6.1 (Advertising Delivery Infrastructure Software-First): COMMITTED (4.0% / 4.0% Full App)',
        '- Phase 7 Block 7.1 (Advertiser Operations Software-First: 6-Gate KYC Readiness, Pacing, SHA-256 Pro-Forma Blueprint & SLA Triage): VERIFIED · AWAITING COMMIT (3.0% / 3.0%; paymentCollectionActive=false)',
        '- TASK-P3-001 PostgreSQL 16+ Migration Requirements Blueprint: READY (JSON persistence retained in AI Studio without Cloud SQL)',
        '- Track B (Consent / Household Geo / Multi-Profile / Epoch 403): BLOCKED ON DEC-OPEN-01 (15% Phase 2 scope)',
        '',
        'OVERALL EDISON PROJECT PROGRESS:',
        `- ${pm?.rubricSummary ?? 'Phase 1 Specs (6.0%) + Phase 2 Track A Complete (13.0%) + Phase 3 Hardening Committed (9.0%) + Phase 4 Software Exit Committed (9.0%) + Phase 5 Complete Committed (12.0%) + Phase 6 Delivery Infra Committed (4.0%) + Phase 7 Block 7.1 Advertiser Ops Awaiting Commit (3.0%) = 56.0% of 15-Phase Full Commercial App (80.3% to Stage P6; 44.0% remaining).'}`,
        '- Normal Everyday TV Remote & Smart TV OS Harnesses (AURA -> EDISON Control Engine -> platform adapters -> TV): SOFTWARE EXIT (10/10) COMMITTED; Phase 5 Fleet + p10/p5 Predictor COMMITTED; Phase 6 Delivery Infrastructure COMMITTED; Phase 7 Block 7.1 Advertiser Operations (8/8 checks) VERIFIED SOFTWARE-FIRST (Zero real payments active; zero physical hardware tested; Stage P6 strictly deferred).',
        '',
        'LIVE STORE COUNTS:',
        countsLine,
        '',
        'NEXT AUTHORISED ACTION:',
        'Review and commit Block 7.1 changes (completing Phase 7 Software Operations 3.0%), then confirm commit to unlock Phase 8 Advertisement Creation & Broadcast Rendering Validation software work or authorise external PostgreSQL execution for TASK-P3-001. Track B remains strictly blocked pending DEC-OPEN-01.',
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
        `Active Block: ${liveSnapshot?.block ?? 'Block 7.1 (Advertiser Onboarding Gates, Campaign Pacing, Pro-Forma Invoice Blueprint & Support SLA Triage)'}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        `QR Telemetry: Redirect Requests=${s?.redirectRequestsTotal ?? 0} | Redirects Issued=${s?.redirectIssuedTotal ?? 0} | Suspected Bots=${s?.suspectedBotRedirects ?? 0} | Verified Destination Opens=${s?.verifiedDestinationOpens ?? 0} | Verified Conversions=${s?.verifiedConversionsTotal ?? 0}`,
        `Physical Phone Scan Logs: ${s?.physicalQrPassedCount ?? 0} passed / ${s?.physicalQrTestsCount ?? 0} total`,
        '',
        'VERIFIED IMPLEMENTATIONS (PHASES 1–6 COMMITTED + PHASE 7 BLOCK 7.1):',
        '- Persistence portability via EdisonDataRepository interface (JSON store schemaVersion 8 retained; zero Cloud SQL cost)',
        '- Auth/RBAC (advertiser, opportunity_submitter, admin) with scrypt hashing, session rotation & 2h idle timeout',
        '- API Zod validation schemas, cookie/header CSRF + edisonFetch, sliding-window rate limiting, 504 timeout & opaque JSON error middleware',
        '- X-Request-Id correlation middleware, sanitised request telemetry & CSV formula-neutralized Admin Audit Export (/api/admin/audit-logs/export)',
        '- Hardened /uploads/* static serving (CSP default-src none; sandbox, CORP same-origin, canonical realpath symlink guard, SVG/polyglot blocking)',
        '- Software-First Android TV TIF, Samsung Tizen & LG webOS harnesses + 16-case fault suite + AURA Remote + 8 conformance vectors + 10-check Phase 4 software exit gate',
        '- Phase 5 Fleet Shared Ad Intelligence Service (11/11 Scenarios 25–35) & Per-Channel p10/p5 ML Break Predictor (10/10 recorded stream fixtures, 0% FPR)',
        '- Phase 6 Block 6.1 Advertising Delivery Infrastructure: SHA-256 preload manifests, coarse regional & Tizen/WebM codec gating, $0.00 Charity lock, daily frequency caps, edge CDN outage failover & idempotent ingestion (8/8 checks passed)',
        '- Phase 7 Block 7.1 Advertiser & Campaign Operations: 6-gate KYC readiness evaluation, automated campaign pacing, SHA-256 Pro-Forma invoice blueprints ($0.00 actual cash, $0.00 Charity isolation, paymentCollectionActive=false), SLA ticket breach triage & 8/8 ops suite passed',
        '- React AppErrorBoundary + GitHub Actions CI (.github/workflows/edison-ci.yml using Bun frozen-lockfile)',
        '- Real QR destination validation & /r/:token redirect telemetry',
        '- Advertiser profile, 10-state campaigns & permanent $0.00 / FREE CHARITY ADS lock (paymentCollectionActive: false)',
        '- Option A Studio, Option B External Upload/jsQR, and zero-media Commercial Text-Only Ad format',
        '- Playable 16:9 TV Preview, Pre-Submission Approval Gate & Alternating 4-Slot Break Scheduler (SimulationTvAdapter)',
        '- Direct-Paid Commercial Priority vs MockAdNetworkBackfillAdapter (DEC-OPEN-03) & Separated 6-Stream Financial Ledger (ADR-012)',
        '- Opportunity Submission, Non-Transitive 3-Tier Verification, Expiry, Complaints & Appeals',
        '- Admin Moderation Console & 7-Stage Funnel Analytics',
        '- Vitest + Supertest Automated Suite (bun run test — 21/21 QA invariants across Phases 2–7)',
        '',
        'OUTSTANDING CHECKS & POST-PROTOTYPE CORE REQUIREMENTS:',
        '- Physical smartphone camera scan verification logged by Project Owner on real mobile hardware.',
        '- Physical Smart TV OS compatibility test (Stage P6): STRICTLY DEFERRED UNTIL APP COMPLETION (Zero real TV hardware tested yet).',
        '- Track B Consent / Multi-Profile scope (15%) strictly BLOCKED awaiting Owner decision DEC-OPEN-01.',
        '- TASK-P3-001 (PostgreSQL Migration) is READY (docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md); JSON persistence retained without paid Cloud SQL until external DB execution.',
      ].join('\n'),
    };
  }

  if (command === 'NEXT') {
    return {
      title: 'EDISON — NEXT AUTHORISED ACTION',
      subtitle: 'Block 7.1 verified & awaiting commit; TASK-P3-001 READY',
      body: [
        'EDISON — NEXT GATE EVALUATION',
        `Generated: ${generatedAt}`,
        `Current Gate: ${liveSnapshot?.gateStatus ?? 'BLOCK 7.1 VERIFIED · AWAITING COMMIT (TRACK B BLOCKED ON DEC-OPEN-01 · STAGE P6 HARDWARE DEFERRED)'}`,
        `Progress Until Full App: ${pctBlock}`,
        '',
        'GATE STATUS & NEXT BLOCK:',
        'Phase 7 Block 7.1 (Advertiser Onboarding Gates, Campaign Pacing, Pro-Forma Invoice Blueprint & Support SLA Triage) is VERIFIED & AWAITING COMMIT. Zero real payments activated (paymentCollectionActive: false) and TASK-P3-001 PostgreSQL blueprint remains READY.',
        '',
        'AFTER COMMIT CONFIRMATION:',
        '- Next Software-First Milestone (Phase 8): Advertisement Creation & Broadcast Rendering Validation (keeping physical Stage P6 hardware test deferred until app completion).',
        '- DEC-OPEN-01 (Blocks Track B Only): Select Option A, Option B, or Option C to unlock Track B (15%).',
        '- DEC-OPEN-02: Confirm k=1 short-break alternating rule.',
        '- DEC-OPEN-03: Google Ad Manager CTV account / format confirmation (mock adapter active until resolved).',
      ].join('\n'),
    };
  }

  if (command === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT CHECKPOINT',
      subtitle: 'Block 7.1 verified and awaiting manual owner commit',
      body: [
        'EDISON — COMMIT CHECKPOINT (BLOCK 7.1)',
        `Generated: ${generatedAt}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        '',
        'STATUS: VERIFIED · AWAITING MANUAL OWNER COMMIT',
        'REQUIRED USER ACTION: Review the Block 7.1 changes and manually commit them before proceeding.',
      ].join('\n'),
    };
  }

  return {
    title: 'EDISON — PHASE 7 BLOCK 7.1 & FULL-APP PROGRESS REPORT',
    subtitle: 'Formal status report with live server telemetry and progress breakdown',
    body: [
      'EDISON — IMPLEMENTATION BLOCK COMPLETION REPORT',
      '',
      'Project: EDISON — International Smart TV Advertising & Opportunities Network',
      `Production Phase: ${liveSnapshot?.phase ?? 'Phase 7 — Advertiser and Campaign Operations (Software-First · Non-Transactional Billing)'}`,
      `Stage: ${liveSnapshot?.stage ?? 'Phases 1–6 Committed · Phase 7 Block 7.1 Advertiser Ops & Pacing Verified · TASK-P3-001 READY'}`,
      `Implementation Block: ${liveSnapshot?.block ?? 'Block 7.1 (Advertiser Onboarding Gates, Campaign Pacing, Pro-Forma Invoice Blueprint & Support SLA Triage)'}`,
      `Status: ${liveSnapshot?.gateStatus ?? 'BLOCK 7.1 VERIFIED · AWAITING COMMIT (TRACK B BLOCKED ON DEC-OPEN-01 · STAGE P6 HARDWARE DEFERRED)'}`,
      '',
      `PHASE 2 AI STUDIO SCOPE: ${pm?.aiStudioAssignmentPct ?? 85}% (100% Track A Committed; 15% Track B Blocked on DEC-OPEN-01)`,
      `OVERALL EDISON PROJECT PROGRESS: ${pm?.overallFullAppPct ?? 56.0}% of Full 15-Phase App (${pm?.remainingUntilFullAppPct ?? 44.0}% remaining) · ${pm?.softwareToStageP6Pct ?? 80.3}% of Software-to-Stage-P6 Milestone`,
      '',
      'LIVE STORE TELEMETRY:',
      countsLine,
      `Latest Audit: ${liveSnapshot?.latestAuditAction ?? 'N/A'} (${liveSnapshot?.latestAuditAt ?? 'N/A'})`,
      '',
      'REQUIRED USER ACTION:',
      'Review Block 7.1 changes and manually commit them to unlock Phase 8 Broadcast Ad Rendering Validation (or TASK-P3-001 DB execution).',
      '',
      'PRODUCTION GATE:',
      'LOCKED UNTIL COMMIT CONFIRMATION (TRACK B BLOCKED ON DEC-OPEN-01).',
    ].join('\n'),
  };
}
