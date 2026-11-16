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
    title: 'AI Studio Functional Prototype (Track A + Track B Complete)',
    summary:
      'Track A (Blocks 2.1–2.7 + P2-V2.1–P2-V2.4, 85% AI Studio) + Track B (15% AI Studio: ZW-first 7-level geo households, multi-member PIN profiles, required/preferred/optional opportunity matching, safe TV personalisation, bundled consent withdrawal, and HTTP 403 epoch QR revocation under DEC-OPEN-01) Committed (100% AI Studio scope).',
    milestoneGate: 'Track A & Track B committed cleanly (100% Phase 2 AI Studio scope).',
    status: 'COMMITTED',
  },
  {
    phase: 3,
    title: 'Software-First Engineering & Architecture Hardening (Blocks P3-A, P3-B, P3-C + TASK-P3-001)',
    summary:
      'Blocks P3-A, P3-B & P3-C COMMITTED. TASK-P3-001 PostgreSQL 16+ blueprint is READY (JSON retained in AI Studio without paid Cloud SQL).',
    milestoneGate: 'Hardened codebase with repository portability, automated security/CI tests & PostgreSQL migration readiness.',
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
      'Block 7.1 COMMITTED (3.0%: 6-gate KYC readiness evaluation, automated campaign pacing, non-transactional SHA-256 Pro-Forma invoice blueprints with $0.00 Charity lock & SLA ticket triage; paymentCollectionActive: false).',
    milestoneGate: 'Explicit authorization required before enabling real payment collection or live advertiser outreach.',
    status: 'COMMITTED',
  },
  {
    phase: 8,
    title: 'Advertisement Creation & Production Rendering',
    summary:
      'Block 8.1 COMMITTED (3.0%: Software-first 1080p/4K broadcast render blueprints, 5% overscan title-safe margins, WCAG >=4.5:1 contrast, non-overwrite QR vision gate, ITU-R BS.1770-4 / EBU R128 -23 LUFS filter graph & Samsung Tizen WebM->H.264 MP4 rules; ffmpegBinaryExecuted: false).',
    milestoneGate: 'Broadcast-compliant media validation pipeline verified software-first (hardware TV decode checked at Stage P6).',
    status: 'COMMITTED',
  },
  {
    phase: 9,
    title: 'Opportunity Management & Verification',
    summary:
      'Block 9.1 COMMITTED (2.0%: Tier 1–3 SHA-256 AES-256-GCM blueprint evidence vault seals + PII redaction, automated expiry & 90-day re-verification quarantine, 4h/24h/48h complaint & appeal SLA tracking, and strict $0.00 zero-fee-influence enforcement; externalKycVendorConnected: false).',
    milestoneGate: '3-tier verification strictly decoupled from advertising spend.',
    status: 'COMMITTED',
  },
  {
    phase: 10,
    title: 'Privacy, Security & Legal Compliance',
    summary:
      'Block 10.1 VERIFIED & AWAITING COMMIT (4.0% Software-First: SHA-256 DSR export PIN-hash redaction, Right-to-Erasure cascade anonymisation + bundled HTTP 403 QR revocation, automated 2h-session/30d-QR retention cleanup, zero-PII analytics scanner & 6-country ADR-015 statutory register; externalPenTestCompleted: false, legalComplianceClaimed: false).',
    milestoneGate: 'External security audit & Phase 14 country-by-country statutory sign-off prior to live commercial launch.',
    status: 'AWAITING COMMIT',
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
    : '66.0% of Full 15-Phase App (34.0% remaining) · 81.8% of Software-to-Stage-P6 · 100% of Phase 2 AI Studio Scope (DEC-OPEN-01 Locked: 0% blocked)';

  if (command === 'STATUS') {
    return {
      title: 'EDISON — STATUS REPORT',
      subtitle: 'Live phase, stage, block, and honest progress percentages until full app',
      body: [
        'EDISON — PROJECT STATUS REPORT',
        `Generated: ${generatedAt}`,
        `Current Phase: ${liveSnapshot?.phase ?? 'Phase 10 — Privacy, Security & Statutory Compliance Readiness (Software-First)'}`,
        `Current Stage: ${liveSnapshot?.stage ?? 'Phases 1–9 Committed (Inc. Track B DEC-OPEN-01) · Phase 10 Block 10.1 Verified & Awaiting Commit · TASK-P3-001 READY'}`,
        `Current Block: ${liveSnapshot?.block ?? 'Block 10.1 (Household DSR Export/Erasure Cascade, Automated Retention Purge, Zero-PII Telemetry & Independent 6-Country Statutory Register)'}`,
        `Commit Gate: ${liveSnapshot?.gateStatus ?? 'BLOCK 10.1 VERIFIED — AWAITING OWNER COMMIT'}`,
        '',
        `PROGRESS UNTIL FULL APP: ${pctBlock}`,
        '',
        'PHASE 2 TO PHASE 10 PROGRESS:',
        '- Phase 1 + Blueprint v2.1 + v2.2 Shared Ad Intelligence Specs: COMMITTED (6.0% Full App)',
        '- Phase 2 Track A + Track B Complete (DEC-OPEN-01 Locked, 100% AI Studio): COMMITTED (14.0% / 14.0% Full App)',
        '- Phase 3 Software-First Hardening (Blocks P3-A, P3-B, P3-C): COMMITTED (9.0% / 12.0% Full App)',
        '- Phase 4 Software Exit Complete (Blocks 4.1–4.3): COMMITTED (9.0% / 12.0% Full App; OEM SDK & Stage P6 deferred)',
        '- Phase 5 Complete Software-First (Block 5.1 Fleet Intelligence + Block 5.2 p10/p5 ML Predictor): COMMITTED (12.0% / 12.0% Full App)',
        '- Phase 6 Block 6.1 (Advertising Delivery Infrastructure Software-First): COMMITTED (4.0% / 4.0% Full App)',
        '- Phase 7 Block 7.1 (Advertiser Operations Software-First): COMMITTED (3.0% / 3.0%; paymentCollectionActive=false)',
        '- Phase 8 Block 8.1 (Broadcast Render Validation, EBU R128 & QR Vision Gate): COMMITTED (3.0% / 3.0%; ffmpegBinaryExecuted=false)',
        '- Phase 9 Block 9.1 (Opportunity Verification Ops Hardening): COMMITTED (2.0% / 2.0%; externalKycVendorConnected=false)',
        '- Phase 10 Block 10.1 (Privacy, DSR Export/Erasure, Retention Purge & Country Statutory Register): VERIFIED · AWAITING COMMIT (4.0% / 4.0%; externalPenTestCompleted=false, legalComplianceClaimed=false)',
        '- TASK-P3-001 PostgreSQL 16+ Migration Requirements Blueprint: READY (JSON persistence retained in AI Studio without Cloud SQL)',
        '',
        'OVERALL EDISON PROJECT PROGRESS:',
        `- ${pm?.rubricSummary ?? 'Phase 1 Specs (6.0%) + Phase 2 Complete (14.0%) + Phase 3 Hardening Committed (9.0%) + Phase 4 Software Exit Committed (9.0%) + Phase 5 Complete Committed (12.0%) + Phase 6 Delivery Infra Committed (4.0%) + Phase 7 Advertiser Ops Committed (3.0%) + Phase 8 Broadcast Render Committed (3.0%) + Phase 9 Opportunity Ops Committed (2.0%) + Phase 10 Privacy & Statutory Readiness (4.0%) = 66.0% of 15-Phase Full Commercial App (81.8% to Stage P6; 34.0% remaining).'}`,
        '- Software-first invariant checks verified cleanly with zero real payments activated, zero external KYC vendor APIs connected, zero external penetration tests claimed, zero formal legal compliance claimed, and zero physical hardware tested (Stage P6 strictly deferred until app completion).',
        '',
        'LIVE STORE COUNTS:',
        countsLine,
        '',
        'NEXT AUTHORISED ACTION:',
        'Review and commit Phase 10 Block 10.1 changes, then confirm commit to unlock Phase 11 Reliability & Chaos Failure Testing (18+ failure modes).',
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
        `Active Block: ${liveSnapshot?.block ?? 'Block 10.1 (Household DSR Export/Erasure Cascade, Automated Retention Purge, Zero-PII Telemetry & Independent 6-Country Statutory Register)'}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        `QR Telemetry: Redirect Requests=${s?.redirectRequestsTotal ?? 0} | Redirects Issued=${s?.redirectIssuedTotal ?? 0} | Suspected Bots=${s?.suspectedBotRedirects ?? 0} | Verified Destination Opens=${s?.verifiedDestinationOpens ?? 0} | Verified Conversions=${s?.verifiedConversionsTotal ?? 0}`,
        `Physical Phone Scan Logs: ${s?.physicalQrPassedCount ?? 0} passed / ${s?.physicalQrTestsCount ?? 0} total`,
        '',
        'VERIFIED IMPLEMENTATIONS (PHASES 1–9 COMMITTED + PHASE 10 BLOCK 10.1):',
        '- Persistence portability via EdisonDataRepository interface (JSON store schemaVersion 8 retained; zero Cloud SQL cost)',
        '- Auth/RBAC (advertiser, opportunity_submitter, household_viewer, admin) with scrypt hashing, session rotation & 2h idle timeout',
        '- API Zod validation schemas, cookie/header CSRF + edisonFetch, sliding-window rate limiting, 504 timeout & opaque JSON error middleware',
        '- X-Request-Id correlation middleware, sanitised request telemetry & CSV formula-neutralized Admin Audit Export (/api/admin/audit-logs/export)',
        '- Hardened /uploads/* static serving (CSP default-src none; sandbox, CORP same-origin, canonical realpath symlink guard, SVG/polyglot blocking)',
        '- Software-First Android TV TIF, Samsung Tizen & LG webOS harnesses + 16-case fault suite + AURA Remote + 8 conformance vectors + 10-check Phase 4 software exit gate',
        '- Phase 5 Fleet Shared Ad Intelligence Service (11/11 Scenarios 25–35) & Per-Channel p10/p5 ML Break Predictor (10/10 recorded stream fixtures, 0% FPR)',
        '- Phase 6 Block 6.1 Advertising Delivery Infrastructure: SHA-256 preload manifests, coarse regional & Tizen/WebM codec gating, $0.00 Charity lock, daily frequency caps, edge CDN outage failover & idempotent ingestion (8/8 checks passed)',
        '- Phase 7 Block 7.1 Advertiser & Campaign Operations: 6-gate KYC readiness evaluation, automated campaign pacing, SHA-256 Pro-Forma invoice blueprints ($0.00 actual cash, $0.00 Charity isolation, paymentCollectionActive=false), SLA ticket breach triage & 8/8 ops suite passed',
        '- Phase 8 Block 8.1 Broadcast Rendering Validation: 1080p/4K target specs, 5%-95% TV overscan margins, WCAG >=4.5:1 contrast, non-overwrite QR vision gate, ITU-R BS.1770-4 / EBU R128 -23 LUFS filter graph, Samsung Tizen WebM->H.264 MP4 rule & 8/8 render checks (ffmpegBinaryExecuted=false)',
        '- Phase 9 Block 9.1 Opportunity Verification Ops Hardening: Tier 1–3 SHA-256 AES-256-GCM blueprint vault seals, strict Tier 2->3 non-transitivity, informal employer Tier 2 N/A accommodation, 90-day re-verification quarantine, 4h/24h/48h SLA breach tracking & 8/8 ops suite passed',
        '- Phase 10 Block 10.1 Privacy, Security & Statutory Compliance Readiness: SHA-256 DSR JSON export (PIN-hash redacted), Right-to-Erasure anonymisation + bundled HTTP 403 QR revocation, automated 2h-session/30d-QR retention sweep, zero-PII analytics scanner, camera/mic hard disable & 6-country ADR-015 statutory register (externalPenTestCompleted=false, legalComplianceClaimed=false)',
        '- Track B (DEC-OPEN-01 Locked: Scope B + Bundled Withdrawal): ZW-first 7-level geo households, PIN-isolated multi-member profiles, required/preferred/optional matching, safe TV personalisation, bundled withdrawal & HTTP 403 epoch QR revocation (7/7 checks)',
        '- Vitest + Supertest Automated Suite (bun run test — 25/25 automated QA invariants across Phases 2–10 & Track B)',
        '',
        'OUTSTANDING CHECKS & POST-PROTOTYPE CORE REQUIREMENTS:',
        '- Physical smartphone camera scan verification logged by Project Owner on real mobile hardware.',
        '- Physical Smart TV OS compatibility test (Stage P6): STRICTLY DEFERRED UNTIL APP COMPLETION (Zero real TV hardware tested yet).',
        '- TASK-P3-001 (PostgreSQL Migration) is READY (docs/migration/TASK_P3_001_POSTGRES_MIGRATION_REQUIREMENTS.md); JSON persistence retained without paid Cloud SQL until external DB execution.',
      ].join('\n'),
    };
  }

  if (command === 'NEXT') {
    return {
      title: 'EDISON — NEXT AUTHORISED ACTION',
      subtitle: 'Phase 10 Block 10.1 verified & awaiting commit; Phase 11 reliability testing follows commit',
      body: [
        'EDISON — NEXT GATE EVALUATION',
        `Generated: ${generatedAt}`,
        `Current Gate: ${liveSnapshot?.gateStatus ?? 'BLOCK 10.1 VERIFIED — AWAITING OWNER COMMIT'}`,
        `Progress Until Full App: ${pctBlock}`,
        '',
        'GATE STATUS & NEXT BLOCK:',
        'Phase 10 Block 10.1 (Privacy, Security & Statutory Compliance Readiness) is VERIFIED & AWAITING COMMIT. Phases 1–9 (including Track B DEC-OPEN-01) are committed, zero real payments are activated (paymentCollectionActive: false), externalPenTestCompleted and legalComplianceClaimed remain false, and TASK-P3-001 PostgreSQL blueprint remains READY.',
        '',
        'AFTER COMMIT CONFIRMATION:',
        '- Next Software-First Milestone (Phase 11 · Block 11.1): Comprehensive Reliability & Chaos Failure Testing across 18+ documented EDISON failure modes (network drops, decoder crash, CEC/HDCP faults, live TV return watchdog & consent withdrawal under load).',
        '- DEC-OPEN-02: Confirm k=1 short-break alternating rule.',
        '- DEC-OPEN-03: Google Ad Manager CTV account / format confirmation (mock adapter active until resolved).',
      ].join('\n'),
    };
  }

  if (command === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT CHECKPOINT',
      subtitle: 'Phase 10 Block 10.1 verified and awaiting manual owner commit',
      body: [
        'EDISON — COMMIT CHECKPOINT (PHASE 10 BLOCK 10.1)',
        `Generated: ${generatedAt}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        '',
        'STATUS: BLOCK 10.1 VERIFIED — AWAITING OWNER COMMIT',
        'REQUIRED USER ACTION: Review Phase 10 Block 10.1 changes and manually commit them before proceeding to Phase 11.',
      ].join('\n'),
    };
  }

  return {
    title: 'EDISON — PHASE 10 BLOCK 10.1 & FULL-APP PROGRESS REPORT',
    subtitle: 'Formal status report with live server telemetry and progress breakdown',
    body: [
      'EDISON — IMPLEMENTATION BLOCK COMPLETION REPORT',
      '',
      'Project: EDISON — International Smart TV Advertising & Opportunities Network',
      `Production Phase: ${liveSnapshot?.phase ?? 'Phase 10 — Privacy, Security & Statutory Compliance Readiness (Software-First)'}`,
      `Stage: ${liveSnapshot?.stage ?? 'Phases 1–9 Committed (Inc. Track B DEC-OPEN-01) · Phase 10 Block 10.1 Verified & Awaiting Commit · TASK-P3-001 READY'}`,
      `Implementation Block: ${liveSnapshot?.block ?? 'Block 10.1 (Household DSR Export/Erasure Cascade, Automated Retention Purge, Zero-PII Telemetry & Independent 6-Country Statutory Register)'}`,
      `Status: ${liveSnapshot?.gateStatus ?? 'BLOCK 10.1 VERIFIED — AWAITING OWNER COMMIT'}`,
      '',
      `PHASE 2 AI STUDIO SCOPE: ${pm?.aiStudioAssignmentPct ?? 100}% (Track A & Track B Committed; 0% Blocked)`,
      `OVERALL EDISON PROJECT PROGRESS: ${pm?.overallFullAppPct ?? 66.0}% of Full 15-Phase App (${pm?.remainingUntilFullAppPct ?? 34.0}% remaining) · ${pm?.softwareToStageP6Pct ?? 81.8}% of Software-to-Stage-P6 Milestone`,
      '',
      'LIVE STORE TELEMETRY:',
      countsLine,
      `Latest Audit: ${liveSnapshot?.latestAuditAction ?? 'N/A'} (${liveSnapshot?.latestAuditAt ?? 'N/A'})`,
      '',
      'REQUIRED USER ACTION:',
      'Review Phase 10 Block 10.1 changes and manually commit them to unlock Phase 11 Reliability & Chaos Failure Testing.',
      '',
      'PRODUCTION GATE:',
      'LOCKED UNTIL COMMIT CONFIRMATION.',
    ].join('\n'),
  };
}
