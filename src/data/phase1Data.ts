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
      'Track A (Blocks 2.1–2.7 + P2-V2.1–P2-V2.4, 85% AI Studio) + Track B (15% AI Studio: Zimbabwe-based reference geography for targeting, multi-member PIN profiles, required/preferred/optional opportunity matching, safe TV personalisation, bundled consent withdrawal, and HTTP 403 epoch QR revocation under DEC-OPEN-01) Committed (100% AI Studio scope).',
    milestoneGate: 'Track A & Track B committed cleanly (100% Phase 2 AI Studio scope).',
    status: 'COMMITTED',
  },
  {
    phase: 3,
    title: 'Engineering Hardening, PG16 Migrations, Real FFmpeg Worker & Playwright E2E (`P3-A..C` + `TASK-P3-001..004`)',
    summary:
      'Blocks P3-A, P3-B, P3-C + Workstream A Complete (11.5% / 12.0%): PG16 SQL migrations + ACID JSON backfill + PGlite/pg.Pool executor (TASK-P3-001), Playwright real Chromium browser E2E + CI (TASK-P3-003), real /usr/bin/ffmpeg worker (TASK-P3-004), structured PII-redacting logger & circuit breakers; remaining 0.5% reserved for remote cloud PG host provisioning.',
    milestoneGate: 'Hardened codebase with PostgreSQL 16+ schema/CLI, real FFmpeg worker, Playwright E2E CI & security audit report.',
    status: 'AWAITING COMMIT',
  },
  {
    phase: 4,
    title: 'TV Platform, EDISON TV App & Phone Remote Boundaries',
    summary:
      'Existing 4.1–4.2 platform simulators, pairing, offline queue, CEC guard, and OEM packaging blueprints; 4.3 real companion transport remains blocked. Phase 4.5 verifies the simulated TV app Ad/Back lifecycle separately from the phone remote; no hardware claim.',
    milestoneGate: 'The TV-app simulation and ordinary phone-remote path are behaviorally distinct; hardware compatibility remains gated to Stage P6.',
    status: 'IN PROGRESS',
  },
  {
    phase: 5,
    title: 'Timestamped Commercial-Break Events & Shared Intelligence',
    summary:
      '5.1–5.3 cue fixtures, scoped shared-intelligence simulation, and duration prediction remain verified. 5.4 adds signed timestamped channel-scoped events; 5.5–5.6 add encrypted local persistence and operator-controlled key rotation. 5.7 production operations remain deferred.',
    milestoneGate: 'Event freshness, source/channel binding, deduplication, replay rejection, conflict handling, and zero-PII sharing pass local tests before production deployment.',
    status: 'IN PROGRESS',
  },
  {
    phase: 6,
    title: 'Geographic Ad Targeting & News Break Distribution',
    summary:
      '6.1–6.2 preserve verified simulated delivery manifests, coarse eligibility, $0.00 Charity isolation, frequency caps, failover, and idempotent events. Added 6.5 for privacy-safe named geographic areas and 6.6 for journalist news at an eligible break; boundary and editorial/placement decisions remain open.',
    milestoneGate: 'Geographic matching protects exact household location; news placement requires owner-approved verification, opt-in, expiry, and inventory rules.',
    status: 'IN PROGRESS',
  },
  {
    phase: 7,
    title: 'Advertiser & Journalist/Publisher Operations',
    summary:
      'Existing advertiser readiness, campaign pacing, pro-forma, disputes, and SLA workflows remain non-transactional. Added 7.4 for journalist/publisher registration and monthly subscription state; terms and price are undecided and no payment collection is authorized.',
    milestoneGate: 'Publisher access semantics are owner-approved; real billing and outreach remain separately gated.',
    status: 'IN PROGRESS',
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
    title: 'Opportunity Verification & Editorial Review Operations',
    summary:
      'Existing opportunity verification, non-transitive tiers, expiry, complaints, and $0.00 fee independence remain. Added 9.4 for journalist evidence review, corrections/retractions, expiry, and editorial/sponsored labels; publication policy is not yet defined.',
    milestoneGate: 'News review is auditable and never treats subscription payment as proof or a moderation bypass.',
    status: 'IN PROGRESS',
  },
  {
    phase: 10,
    title: 'Privacy, Security & Statutory Register',
    summary:
      'Block 10.1 COMMITTED (4.0% Software-First: SHA-256 DSR export PIN-hash redaction, Right-to-Erasure cascade anonymisation + bundled HTTP 403 QR revocation, automated 2h-session/30d-QR retention cleanup, zero-PII analytics scanner & 6-country ADR-015 statutory register; externalPenTestCompleted: false).',
    milestoneGate: 'External security audit prior to live launch.',
    status: 'COMMITTED',
  },
  {
    phase: 11,
    title: 'Reliability & Failure Testing',
    summary:
      'Block 11.1 COMMITTED (4.0% Software-First: Deterministic chaos & fault injection across all 18 failure modes FM-01..FM-18, FM-09 dual-watchdog return-to-TV verification, Tizen codec exclusion, KYC/Tier 2->3/Charity $0 isolation, mid-break consent erasure & idempotent replay dedup; hardwareTested: false, stageP6Deferred: true).',
    milestoneGate: 'Zero unrecovered live TV interruptions across fault-injection suite.',
    status: 'COMMITTED',
  },
  {
    phase: 12,
    title: 'Controlled Hardware & Viewer Pilot',
    summary:
      'Block 12.1 COMMITTED (2.0% / 4.0% Software-First Pilot Readiness: Phase 4–11 pre-pilot software gates, Zero-PII & consent-epoch telemetry validator, closed cohort blueprints & 8-step Stage P6 physical TV + phone runbook; remaining 2.0% reserved until real hardware execution at Stage P6).',
    milestoneGate: 'Pilot telemetry and viewer experience criteria passed on real hardware (Stage P6 deferred until app completion).',
    status: 'COMMITTED',
  },
  {
    phase: 13,
    title: 'Readiness & Unit Economics',
    summary:
      'Block 13.1 COMMITTED (3.0% / 4.0% Software-First: 10-pillar board gate, 7-domain Production SLA matrix, unit-economics OPEX/CPM model keeping $0.00 Charity lock & fail-closed premature launch block; remaining 1.0% reserved for live post-Stage-P6 authorization).',
    milestoneGate: 'Board approval (after Stage P6, external pen-test, KYC & market compliance).',
    status: 'COMMITTED',
  },
  {
    phase: 14,
    title: 'Worldwide Release Readiness',
    summary:
      'A single simultaneous product release is intended; market-by-market activation has been retired. Existing jurisdiction and safety work remains a separate readiness responsibility. The release is not authorized or production-ready.',
    milestoneGate: 'Verify the complete global service, safety, privacy, security, and operational requirements before one release.',
    status: 'COMMITTED',
  },
  {
    phase: 15,
    title: 'Ad-Targeting Geography & Localization',
    summary:
      'Existing campaign geography and localization profiles support only representative market groups; they are not a complete worldwide boundary dataset or proof of global ad-delivery coverage. Geography is for campaign targeting, not release sequencing.',
    milestoneGate: 'Verify global targeting data coverage and production behavior before claiming worldwide targeting.',
    status: 'AWAITING COMMIT',
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
  { id: 14, item: 'Jurisdiction Compliance Register, Risk Register & 18 Failure Modes', status: 'VERIFIED · COMMITTED' },
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

const subphaseProgressLine =
  'EXECUTABLE SUBPHASE PROGRESS: 77 / 99 complete (77.8%) as of 2026-11-25.';

export function generateFormalReport(
  command: ReportCommandType,
  liveSnapshot: LiveReportSnapshot | null
): { title: string; subtitle: string; body: string } {
  const s = liveSnapshot?.summary;
  const generatedAt = liveSnapshot?.generatedAt ?? new Date().toISOString();
  const countsLine = s
    ? `Application store counts (may include demo/seed records): Users=${s.userCount} | Profiles=${s.profileCount} | Campaigns=${s.campaignCount} (Active=${s.activeCampaignCount}) | Ad creatives=${s.adCreativeCount} | Opportunities=${s.opportunityCount ?? 0} (Verified live=${s.verifiedLiveOpportunityCount ?? 0}) | QR links=${s.qrCount} | Simulated events=${s.simulatedEventsTotal ?? 0} | Redirects issued=${s.redirectIssuedTotal} | Physical phone scans=${s.physicalQrPassedCount ?? 0}/${s.physicalQrTestsCount ?? 0} | Audit records=${s.auditLogCount}`
    : 'Live store telemetry connecting...';

  const pm = liveSnapshot?.progressMetrics;
  const pctBlock = pm
    ? `${pm.executionSubphasesCompleted}/${pm.executionSubphasesTotal} executable subphases (${pm.executionSubphasePct}% complete, ${pm.remainingExecutionSubphasePct}% remaining); ${pm.aiStudioAssignmentPct}% of Phase 2 scope`
    : '77/99 executable subphases (77.8% complete, 22.2% remaining); 100% of Phase 2 scope';

  if (command === 'STATUS') {
    return {
      title: 'EDISON — STATUS REPORT',
      subtitle: 'Live phase, stage, block, and verified executable subphase progress',
      body: [
        'EDISON — PROJECT STATUS REPORT',
        `Generated: ${generatedAt}`,
        `Current Phase: ${liveSnapshot?.phase ?? 'Pre-production — 77 of 99 executable subphases complete'}`,
        `Current Stage: ${liveSnapshot?.stage ?? 'Cloudflare preview only; production infrastructure remains incomplete'}`,
        `Current Block: ${liveSnapshot?.block ?? 'Worldwide release model; policy drafts require owner and counsel review'}`,
        `Commit Gate: ${liveSnapshot?.gateStatus ?? 'NOT PRODUCTION-READY — release authorization and operational evidence are outstanding'}`,
        '',
        subphaseProgressLine,
        `EXECUTABLE SUBPHASE PROGRESS: ${pctBlock}`,
        '',
        'STATUS BOUNDARY:',
        `- Executable-subphase count: ${pctBlock}. This is task progress, not product completeness or launch readiness.`,
        '- The Cloudflare deployment is a limited preview; its compatibility endpoint reports the application API, media upload, and media processing unavailable.',
        '- R2 is inactive, production media processing and payment collection are not configured, and no physical TV compatibility results are claimed.',
        '- The product direction is a simultaneous release; geography is for ad targeting. Current geographic profiles do not establish worldwide targeting coverage.',
        '- Privacy, Cookie, and Terms documents are drafts pending owner fact-check and qualified legal review.',
        '',
        'OVERALL EDISON PROJECT PROGRESS:',
        `- ${pm?.rubricSummary ?? '77 of 99 executable subphases complete (77.8%); this is software task progress, not production or launch readiness.'}`,
        '- Payment collection, external KYC, external security review, production media processing, and physical hardware testing are not verified.',
        '',
        'LIVE STORE COUNTS:',
        countsLine,
        '',
        'NEXT AUTHORISED ACTION:',
        'Complete owner and qualified-counsel review of policy drafts, production infrastructure and integrations, and required physical-device verification before any simultaneous product release.',
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
        `Active Block: ${liveSnapshot?.block ?? 'Pre-production verification; production readiness is not established'}`,
        subphaseProgressLine,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        `QR Telemetry: Redirect Requests=${s?.redirectRequestsTotal ?? 0} | Redirects Issued=${s?.redirectIssuedTotal ?? 0} | Suspected Bots=${s?.suspectedBotRedirects ?? 0} | Verified Destination Opens=${s?.verifiedDestinationOpens ?? 0} | Verified Conversions=${s?.verifiedConversionsTotal ?? 0}`,
        `Physical Phone Scan Logs: ${s?.physicalQrPassedCount ?? 0} passed / ${s?.physicalQrTestsCount ?? 0} total`,
        '',
        'IMPLEMENTATION AND VERIFICATION BOUNDARY:',
        '- Repository tests cover software behavior; passing software tests do not demonstrate production operation, legal compliance, or physical-device support.',
        '- Local PostgreSQL/PGlite migrations and Node media-worker code are present; a production database host and Cloudflare-compatible media-processing service are not verified.',
        '- The Cloudflare Worker currently serves a limited preview and reports application API, uploads, and media processing unavailable.',
        '- Geographic targeting uses a limited catalogue. A global campaign can target a geography outside the listed profiles, but the catalogue is not comprehensive worldwide coverage.',
        '- Legacy country/region activation UI is removed and decision-write endpoints return HTTP 410. This does not authorize or certify a global release.',
        '- Policy documents remain drafts; owner facts, qualified legal review, applicable obligations, and effective dates are unresolved.',
        '',
        'OUTSTANDING PRODUCT AND OPERATIONAL WORK:',
        '- Production API, storage, media processing, backups, monitoring, and recovery verification.',
        '- Authorized TV transports and physical Android/Google TV, Tizen, and webOS device testing.',
        '- Owner fact-check, qualified legal review, external security review, commercial-provider decisions, and release authorization.',
      ].join('\n'),
    };
  }

  if (command === 'NEXT') {
    return {
      title: 'EDISON — NEXT AUTHORISED ACTION',
      subtitle: 'Pre-production work remains; one simultaneous release is not yet authorized',
      body: [
        'EDISON — NEXT GATE EVALUATION',
        `Generated: ${generatedAt}`,
        `Current Gate: ${liveSnapshot?.gateStatus ?? 'NOT PRODUCTION-READY — release authorization and operational evidence are outstanding'}`,
        subphaseProgressLine,
        `Executable Subphase Progress: ${pctBlock}`,
        '',
        'CURRENT STATUS:',
        'EDISON remains pre-production. The intended release is simultaneous rather than country- or region-staged; it is not currently authorized. Payment collection, physical hardware testing, external security review, production media processing, and complete worldwide ad-targeting coverage are not verified.',
        '',
        'NEXT ACCEPTANCE WORK:',
        '- Complete owner fact-check and qualified legal review of policy drafts; publish only after approval.',
        '- Select and implement production API, storage, media-processing, backup, monitoring, and recovery services.',
        '- Select authorized TV transports, complete physical-device tests, and obtain owner authorization before a simultaneous release.',
      ].join('\n'),
    };
  }

  if (command === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT CHECKPOINT',
      subtitle: '77/99 executable subphases complete; worktree changes await review',
      body: [
        'EDISON — COMMIT CHECKPOINT (77/99 EXECUTABLE SUBPHASES)',
        `Generated: ${generatedAt}`,
        subphaseProgressLine,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        '',
        'STATUS: PRE-PRODUCTION; SOFTWARE SUBPHASE COUNT DOES NOT REPRESENT COMMERCIAL OR LAUNCH READINESS.',
        'NEXT GATE: Review the current changes; production infrastructure, legal review, payment-provider setup, and physical hardware evidence remain outstanding.',
      ].join('\n'),
    };
  }

  return {
    title: 'EDISON — MASTER ENGINEERING COMPLETION & HANDOVER REPORT',
    subtitle: 'Formal status report with live server telemetry and progress breakdown',
    body: [
      'EDISON — IMPLEMENTATION & HANDOVER STATUS REPORT',
      '',
      'Project: EDISON — International Smart TV Advertising & Opportunities Network',
      `Production Phase: ${liveSnapshot?.phase ?? 'Pre-production — 77 of 99 executable subphases complete'}`,
      `Stage: ${liveSnapshot?.stage ?? 'Cloudflare preview only; production infrastructure remains incomplete'}`,
      `Implementation Block: ${liveSnapshot?.block ?? 'Policy drafts require owner and counsel review; production readiness remains outstanding'}`,
      `Status: ${liveSnapshot?.gateStatus ?? 'NOT PRODUCTION-READY — release authorization and operational evidence are outstanding'}`,
      '',
      `PHASE 2 AI STUDIO SCOPE: ${pm?.aiStudioAssignmentPct ?? 100}% (Track A & Track B Committed; 0% Blocked)`,
      `EXECUTABLE SUBPHASE PROGRESS: ${pctBlock}`,
      subphaseProgressLine,
      '',
      'LIVE STORE TELEMETRY:',
      countsLine,
      `Latest Audit: ${liveSnapshot?.latestAuditAction ?? 'N/A'} (${liveSnapshot?.latestAuditAt ?? 'N/A'})`,
      '',
      'NEXT OWNER DECISIONS:',
      'Complete the policy review and decide production hosting, media processing, payment-provider, ad-network, and hardware-testing requirements.',
      '',
      'RELEASE MODEL:',
      'One simultaneous product release is intended. Campaign geography is for ad targeting, not country or regional release waves.',
    ].join('\n'),
  };
}
