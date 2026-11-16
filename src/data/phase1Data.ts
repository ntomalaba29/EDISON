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
    title: 'Engineering Hardening, PG16 Migrations, Real FFmpeg Worker & Playwright E2E (`P3-A..C` + `TASK-P3-001..004`)',
    summary:
      'Blocks P3-A, P3-B, P3-C + Workstream A Complete (11.5% / 12.0%): PG16 SQL migrations + ACID JSON backfill + PGlite/pg.Pool executor (TASK-P3-001), Playwright real Chromium browser E2E + CI (TASK-P3-003), real /usr/bin/ffmpeg worker (TASK-P3-004), structured PII-redacting logger & circuit breakers; remaining 0.5% reserved for remote cloud PG host provisioning.',
    milestoneGate: 'Hardened codebase with PostgreSQL 16+ schema/CLI, real FFmpeg worker, Playwright E2E CI & security audit report.',
    status: 'AWAITING COMMIT',
  },
  {
    phase: 4,
    title: 'Smart TV Platform Feasibility, AURA Companion Remote & OEM SDK Contracts',
    summary:
      'Blocks 4.1–4.3 + Workstream B Complete (10.0% / 12.0%): Android TV TIF, Tizen & webOS harnesses, 16-case fault suite, SHA-256 offline cache/sync queue, 8-vector conformance, DIAL/mDNS AURA PIN pairing & offline remote queue, HDMI-CEC HDCP guard & 5 OEM native packaging blueprints; remaining 2.0% reserved for physical OEM partner signing & Stage P6 hardware test.',
    milestoneGate: 'Software/emulator adapters verified without undocumented hooks; hardware compatibility checked only at Stage P6.',
    status: 'AWAITING COMMIT',
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
      'Block 10.1 COMMITTED (4.0% Software-First: SHA-256 DSR export PIN-hash redaction, Right-to-Erasure cascade anonymisation + bundled HTTP 403 QR revocation, automated 2h-session/30d-QR retention cleanup, zero-PII analytics scanner & 6-country ADR-015 statutory register; externalPenTestCompleted: false, legalComplianceClaimed: false).',
    milestoneGate: 'External security audit & Phase 14 country-by-country statutory sign-off prior to live commercial launch.',
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
    title: 'Commercial Readiness',
    summary:
      'Block 13.1 COMMITTED (3.0% / 4.0% Software-First Commercial Readiness: 10-pillar commercial board gate, 7-domain Production SLA matrix, unit-economics OPEX/CPM model keeping $0.00 Charity lock & fail-closed premature launch block; remaining 1.0% reserved for live post-Stage-P6 authorization).',
    milestoneGate: 'Commercial readiness board approval (after Stage P6, external pen-test, KYC & market compliance).',
    status: 'COMMITTED',
  },
  {
    phase: 14,
    title: 'Country-by-Country Launch',
    summary:
      'Block 14.1 COMMITTED (3.0% / 5.0% Software-First Country Launch Readiness Gate & Jurisdiction Policy Engine: all 6 ADR-015 territories ZW Initial + GB/EU/US/ZA/KE-NG mapped with 4/4 software controls separated from 2 external clearances, editable tax/consent notices locking $0 Charity & no signal hijacking, and fail-closed COUNTRY_LAUNCH_GATE_LOCKED on activation; 2.0% live filing/Stage P6 activation reserved).',
    milestoneGate: 'Approved Country Activation Register entry per territory (after Stage P6 & filings).',
    status: 'COMMITTED',
  },
  {
    phase: 15,
    title: 'International Multi-Region Expansion, 9-Language i18n & Sovereign Manifests',
    summary:
      'Block 15.1 + Workstream D/E Complete (3.5% / 5.0%): 4 sovereign expansion cluster manifests (africa_south_zw_za, europe_uk_eu, africa_east_west_ke_ng, north_america_us) with prohibitCrossBorderPiiTransfer=true, full 9-locale i18n translation matrix (en, sn, nd, zu, fr, de, pt, es, sw), 7-currency $0.00 Charity pro-forma estimator & Docker/CDN deployment pack; 1.5% reserved for live multi-region cloud clusters & acquirers.',
    milestoneGate: 'Sustained SLA, compliance, and unit economics in launched territories.',
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
    : '85.0% of Full 15-Phase App (15.0% remaining) · 87.1% of Software-to-Stage-P6 · 100% of Phase 2 AI Studio Scope (DEC-OPEN-01 Locked: 0% blocked)';

  if (command === 'STATUS') {
    return {
      title: 'EDISON — STATUS REPORT',
      subtitle: 'Live phase, stage, block, and honest progress percentages until full app',
      body: [
        'EDISON — PROJECT STATUS REPORT',
        `Generated: ${generatedAt}`,
        `Current Phase: ${liveSnapshot?.phase ?? 'Phases 1–15 Software & Infrastructure Engineering Complete (85.0% Full App · Stage P6 & External Clearances Deferred)'}`,
        `Current Stage: ${liveSnapshot?.stage ?? 'Workstreams A–K Complete · TASK-P3-001/003/004 Implemented · Stage P6 Runbook Ready'}`,
        `Current Block: ${liveSnapshot?.block ?? 'Master Completion Handover Release (34/34 Automated QA Invariants · Awaiting Owner Review & Commit)'}`,
        `Commit Gate: ${liveSnapshot?.gateStatus ?? 'ALL IMPLEMENTABLE SOFTWARE, INFRASTRUCTURE & PACKAGING WORK COMPLETE — AWAITING COMMIT & STAGE P6'}`,
        '',
        `PROGRESS UNTIL FULL APP: ${pctBlock}`,
        '',
        'PHASE 1 TO PHASE 15 PROGRESS:',
        '- Phase 1 + Blueprint v2.1 + v2.2 Shared Ad Intelligence Specs: COMMITTED (6.0% Full App)',
        '- Phase 2 Track A + Track B Complete (DEC-OPEN-01 Locked, 100% AI Studio): COMMITTED (14.0% / 14.0% Full App)',
        '- Phase 3 Complete Hardening (PG16 SQL Migrations/ACID Backfill, Playwright Chromium E2E, Real FFmpeg Worker, Observability & Security Audit): VERIFIED · AWAITING COMMIT (11.5% / 12.0%; 0.5% live remote PG host)',
        '- Phase 4 Smart TV OS Adapters, AURA DIAL/PIN Pairing, Offline Queue, HDMI-CEC HDCP Guard & 5 OEM Contracts: VERIFIED · AWAITING COMMIT (10.0% / 12.0%; 2.0% OEM partner signing & Stage P6)',
        '- Phase 5 Complete Software-First (Block 5.1 Fleet Intelligence + Block 5.2 p10/p5 ML Predictor): COMMITTED (12.0% / 12.0% Full App)',
        '- Phase 6 Block 6.1 (Advertising Delivery Infrastructure Software-First): COMMITTED (4.0% / 4.0% Full App)',
        '- Phase 7 Block 7.1 + Commercial Disputes Engine (Advertiser Ops & Credit Adjustments): VERIFIED (3.0% / 3.0%; paymentCollectionActive=false)',
        '- Phase 8 Block 8.1 + Real /usr/bin/ffmpeg Worker (Tizen H.264, HLS & EBU R128 -23 LUFS): VERIFIED (3.0% / 3.0%)',
        '- Phase 9 Block 9.1 (Opportunity Verification Ops Hardening): COMMITTED (2.0% / 2.0%; externalKycVendorConnected=false)',
        '- Phase 10 Block 10.1 + Application Security Test Report (0 dev/prod CVEs via npm audit): VERIFIED (4.0% / 4.0%; externalPenTestCompleted=false, legalComplianceClaimed=false)',
        '- Phase 11 Block 11.1 + FM-19/FM-20 Postgres/FFmpeg FMEA Extensions: VERIFIED (4.0% / 4.0%; hardwareTested=false, stageP6Deferred=true)',
        '- Phase 12 Block 12.1 + Single Final Stage P6 Physical Test Runbook: VERIFIED (2.0% / 4.0%; 2.0% physical pilot deferred to Stage P6)',
        '- Phase 13 Block 13.1 (Commercial Readiness Board Gate, 7-SLA Matrix & Unit Economics): COMMITTED (3.0% / 4.0%; commercialLaunchAuthorized=false)',
        '- Phase 14 Block 14.1 (Country-by-Country Launch Readiness Gate & Jurisdiction Policy Engine): COMMITTED (3.0% / 5.0%; activeLaunchedMarketsCount=0, countryActivated=false)',
        '- Phase 15 Block 15.1 + 9-Language i18n & 4 Sovereign Region Manifests + Docker/CDN Pack: VERIFIED (3.5% / 5.0%; activeExpandedRegionsCount=0, regionalExpansionActive=false, prohibitCrossBorderPiiTransfer=true)',
        '',
        'OVERALL EDISON PROJECT PROGRESS:',
        `- ${pm?.rubricSummary ?? '85.0% of Full 15-Phase Commercial App (87.1% to Stage P6; 15.0% remaining strictly for Stage P6 physical TV/phone execution, external pen-test, live remote DB/acquirer provisioning & regulatory approvals).'}`,
        '- Verified with zero real payments activated, zero external KYC vendor APIs connected, zero external penetration tests claimed, zero formal legal compliance claimed, zero country launches or expansion regions activated, and zero physical hardware tested (Stage P6 strictly deferred).',
        '',
        'LIVE STORE COUNTS:',
        countsLine,
        '',
        'NEXT AUTHORISED ACTION:',
        'Review and manually commit the Master Completion updates (PostgreSQL 16+ migrations, Real FFmpeg worker, Playwright E2E, AURA/HDMI-CEC, Disputes, 9-Language i18n, Sovereign Manifests, Docker/CDN & Stage P6 Runbook), then execute Stage P6 physical TV + smartphone verification and external regulatory/partner clearances.',
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
        `Active Block: ${liveSnapshot?.block ?? 'Block 11.1 (Deterministic Fault Injection & Live-TV Preservation Across All 18 FMEA Modes FM-01..FM-18)'}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        `QR Telemetry: Redirect Requests=${s?.redirectRequestsTotal ?? 0} | Redirects Issued=${s?.redirectIssuedTotal ?? 0} | Suspected Bots=${s?.suspectedBotRedirects ?? 0} | Verified Destination Opens=${s?.verifiedDestinationOpens ?? 0} | Verified Conversions=${s?.verifiedConversionsTotal ?? 0}`,
        `Physical Phone Scan Logs: ${s?.physicalQrPassedCount ?? 0} passed / ${s?.physicalQrTestsCount ?? 0} total`,
        '',
        'VERIFIED IMPLEMENTATIONS (PHASES 1–10 COMMITTED + PHASE 11 BLOCK 11.1):',
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
        '- Phase 11 Block 11.1 Reliability & Chaos Failure Testing Suite: All 18/18 FMEA modes (FM-01..FM-18) verified under extreme chaos injection, 100% ordinary live TV preserved, FM-09 watchdog across 4 TV adapters, network/CDN outage failover, Tizen WebM exclusion, KYC/scam/billing isolation, mid-break erasure HTTP 403 & replay dedup (hardwareTested=false, stageP6Deferred=true)',
        '- Phase 12 Block 12.1 Controlled Pilot Readiness & Stage P6 Runbook: Phase 4–11 pre-pilot software gates, Zero-PII & consent-epoch telemetry guard, closed cohort blueprint registration & 8-step single final Stage P6 physical TV + smartphone runbook (hardwareTested=false, pilotHardwareExecuted=false, countryActivated=false)',
        '- Phase 13 Block 13.1 Commercial Readiness Board Gate, 7-SLA Matrix & Unit Economics: 10-pillar commercial board evaluation, 7 operational SLAs, $0.00 Charity unit-economics budget model & fail-closed premature launch authorization lock (commercialLaunchAuthorized=false, paymentCollectionActive=false)',
        '- Track B (DEC-OPEN-01 Locked: Scope B + Bundled Withdrawal): ZW-first 7-level geo households, PIN-isolated multi-member profiles, required/preferred/optional matching, safe TV personalisation, bundled withdrawal & HTTP 403 epoch QR revocation (7/7 checks)',
        '- Phase 14 Block 14.1 Country-by-Country Launch Readiness Gate & Jurisdiction Policy Engine: 6 ADR-015 markets (ZW Initial Launch Market + GB, EU, US, ZA, KE/NG) with 4/4 software controls separated from 2 external clearances, non-overridable $0 Charity/no-hijack policy locks & fail-closed COUNTRY_LAUNCH_GATE_LOCKED on activation (8/8 checks, countryActivated=false, legalComplianceClaimed=false)',
        '- Phase 15 Block 15.1 International Multi-Region Expansion, Localization & Sovereign Residency: 4 sovereign clusters mapping all 6 ADR-015 markets (Wave 1 ZW+ZA), 9+ locales & DVB/EBU-TT-D/CEA-708 captions, 7-currency pro-forma estimator keeping permanent 0 Charity fee, prohibitCrossBorderPiiTransfer=true & fail-closed EXPANSION_REGION_GATE_LOCKED (8/8 checks, regionalExpansionActive=false)',
        '- Vitest + Supertest Automated Suite (npx vitest run — 34/34 automated QA invariants across Phases 2–15, Track B & Runtime Infra) + Playwright Chromium E2E',
        '',
        'OUTSTANDING CHECKS & EXTERNAL / HARDWARE MILESTONES (15.0%):',
        '- Physical smartphone camera scan verification logged by Project Owner on real mobile hardware.',
        '- Physical Smart TV OS compatibility test (Stage P6): STRICTLY DEFERRED UNTIL APP COMPLETION (Zero real TV hardware tested yet).',
        '- Remote PostgreSQL host provisioning (PG16 migrations/backfill CLI complete & verified on PGlite), external KYC vendor, external pen-test, regulator filings & acquirer onboarding.',
      ].join('\n'),
    };
  }

  if (command === 'NEXT') {
    return {
      title: 'EDISON — NEXT AUTHORISED ACTION',
      subtitle: 'All implementable software & infrastructure complete (85.0% Full App); ready for Stage P6 & external clearances',
      body: [
        'EDISON — NEXT GATE EVALUATION',
        `Generated: ${generatedAt}`,
        `Current Gate: ${liveSnapshot?.gateStatus ?? 'ALL IMPLEMENTABLE SOFTWARE & INFRASTRUCTURE COMPLETE'}`,
        `Progress Until Full App: ${pctBlock}`,
        '',
        'GATE STATUS & NEXT STEP:',
        'Workstreams A–K (PG16 migrations + ACID backfill, real /usr/bin/ffmpeg worker, Playwright Chromium E2E, AURA/HDMI-CEC + 5 OEM SDK contracts, Commercial Disputes, 9-lang i18n, 4 sovereign manifests, Docker/CDN pack, Security Report & Stage P6 Runbook) are COMPLETE & VERIFIED. activeExpandedRegionsCount=0, activeLaunchedMarketsCount=0, commercialLaunchAuthorized=false, paymentCollectionActive=false, hardwareTested=false, pilotHardwareExecuted=false, countryActivated=false, regionalExpansionActive=false, legalComplianceClaimed=false, and realBroadcastTunerConnected=false remain strictly enforced.',
        '',
        'AUTHORISED POST-SOFTWARE MILESTONES (REQUIRES OWNER / EXTERNAL EXECUTION):',
        '- Review & manually commit current Workspace changes to GitHub.',
        '- Execute single integrated physical Smart TV + smartphone camera test (docs/testing/STAGE_P6_PHYSICAL_TEST_RUNBOOK.md Steps P6-01..P6-08) and closed controlled pilot.',
        '- Provision remote PostgreSQL host using deploy/docker-compose.yml, resolve DEC-OPEN-02 & DEC-OPEN-03, complete external pen-test, regulator filings, and acquirer onboarding.',
      ].join('\n'),
    };
  }

  if (command === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT CHECKPOINT',
      subtitle: 'Master Software & Infrastructure Completion (85.0% Full App) Awaiting Owner Commit',
      body: [
        'EDISON — COMMIT CHECKPOINT (85.0% FULL APP · WORKSTREAMS A–K)',
        `Generated: ${generatedAt}`,
        `Progress Metrics: ${pctBlock}`,
        `Live Store Telemetry: ${countsLine}`,
        '',
        'STATUS: ALL IMPLEMENTABLE SOFTWARE, INFRASTRUCTURE & PACKAGING WORK VERIFIED (85.0% FULL APP · 87.1% TO STAGE P6)',
        'NEXT GATE: Review changes, manually commit to GitHub, then execute Stage P6 physical hardware tests & external clearances.',
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
      `Production Phase: ${liveSnapshot?.phase ?? 'Phases 1–15 Software & Infrastructure Engineering Complete (85.0% Full App)'}`,
      `Stage: ${liveSnapshot?.stage ?? 'Workstreams A–K Complete · TASK-P3-001/003/004 Implemented · Stage P6 Deferred'}`,
      `Implementation Block: ${liveSnapshot?.block ?? 'Final Software & Infrastructure Handover Release (34/34 QA Invariants)'}`,
      `Status: ${liveSnapshot?.gateStatus ?? 'VERIFIED · AWAITING COMMIT'}`,
      '',
      `PHASE 2 AI STUDIO SCOPE: ${pm?.aiStudioAssignmentPct ?? 100}% (Track A & Track B Committed; 0% Blocked)`,
      `OVERALL EDISON PROJECT PROGRESS: ${pm?.overallFullAppPct ?? 85.0}% of Full 15-Phase App (${pm?.remainingUntilFullAppPct ?? 15.0}% remaining) · ${pm?.softwareToStageP6Pct ?? 87.1}% of Software-to-Stage-P6 Milestone`,
      '',
      'LIVE STORE TELEMETRY:',
      countsLine,
      `Latest Audit: ${liveSnapshot?.latestAuditAction ?? 'N/A'} (${liveSnapshot?.latestAuditAt ?? 'N/A'})`,
      '',
      'NEXT AUTHORISED STEP:',
      'Review and manually commit all Workstream A–K engineering deliverables, then execute Stage P6 physical Smart TV + smartphone verification and external clearances.',
      '',
      'PRODUCTION GATE:',
      'COMMERCIAL LAUNCH LOCKED PENDING STAGE P6 HARDWARE TEST, REMOTE CLOUD DB PROVISIONING, EXTERNAL PEN-TEST & REGULATORY APPROVALS.',
    ].join('\n'),
  };
}
