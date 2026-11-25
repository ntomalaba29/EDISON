import type { LiveReportSnapshot } from '../types/edison';

export type DocCategory =
  | 'Core & Governance'
  | 'Architecture & Smart TV'
  | 'Product & Studios'
  | 'Compliance, Risk & QA'
  | 'Coordination';

export interface GovernanceDocRecord {
  id: string;
  title: string;
  filename: string;
  category: DocCategory;
  content: string;
  bytes: number;
  updatedAt: string;
}

export type ReportCommandType =
  | 'PHASE_1_COMPLETION'
  | 'STATUS'
  | 'CHECK'
  | 'NEXT'
  | 'COMMIT';

export interface ChecklistItem {
  id: number;
  item: string;
  status: 'VERIFIED' | 'COMMITTED' | 'PENDING';
}

export interface RoadmapPhaseRow {
  phase: number;
  title: string;
  summary: string;
  milestoneGate: string;
  status: 'COMMITTED' | 'IN PROGRESS' | 'AWAITING COMMIT' | 'NOT STARTED';
}

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

export const PHASE1_CHECKLIST: ChecklistItem[] = [
  { id: 1, item: 'Master Product Specification (PROJECT_MASTER_SPECIFICATION.md)', status: 'COMMITTED' },
  { id: 2, item: 'Business Model & Free Vacancy Independence (BUSINESS_MODEL.md)', status: 'COMMITTED' },
  { id: 3, item: 'Product & Functional Requirements (PRODUCT_REQUIREMENTS.md)', status: 'COMMITTED' },
  { id: 4, item: 'Logical, Prototype & Target System Architecture (SYSTEM_ARCHITECTURE.md)', status: 'COMMITTED' },
  { id: 5, item: 'Technical & Media Validation Requirements (TECHNICAL_REQUIREMENTS.md)', status: 'COMMITTED' },
  { id: 6, item: 'Smart TV Platform Feasibility Research (SMART_TV_COMPATIBILITY_RESEARCH.md)', status: 'COMMITTED' },
  { id: 7, item: 'Commercial-Break Detection Research (COMMERCIAL_BREAK_DETECTION.md)', status: 'COMMITTED' },
  { id: 8, item: 'Advertising & QR Redirect Integrity Spec (ADVERTISING_AND_QR_SYSTEM.md)', status: 'COMMITTED' },
  { id: 9, item: 'Advertisement Creation Studio Spec — Option A & Option B (ADVERTISEMENT_CREATION_STUDIO.md)', status: 'COMMITTED' },
  { id: 10, item: '16:9 Television Preview & Simulator Spec (TELEVISION_PREVIEW_EXPERIENCE.md)', status: 'COMMITTED' },
  { id: 11, item: 'Opportunity & 3-Tier Verification Spec (OPPORTUNITY_MANAGEMENT.md)', status: 'COMMITTED' },
  { id: 12, item: 'Advertiser Lifecycle & Campaign Controls (ADVERTISER_MANAGEMENT.md)', status: 'COMMITTED' },
  { id: 13, item: 'Privacy, Consent Epoch & Security Compliance (PRIVACY_SECURITY_AND_COMPLIANCE.md)', status: 'COMMITTED' },
  { id: 14, item: 'Jurisdiction Compliance Register (JURISDICTION_COMPLIANCE_REGISTER.md)', status: 'COMMITTED' },
  { id: 15, item: 'Risk Register & 18-Mode Failure Mode Analysis (RISK_REGISTER.md / FAILURE_MODE_ANALYSIS.md)', status: 'COMMITTED' },
  { id: 16, item: 'Testing Strategy, Decisions Log & Known Limitations', status: 'COMMITTED' },
  { id: 17, item: 'AI Studio <-> VS Code Command Centre & Working Boundary', status: 'COMMITTED' },
];

export const ROADMAP_PHASES: RoadmapPhaseRow[] = [
  {
    phase: 1,
    title: 'Project Definition & Technical Research',
    summary: '25 governance/architecture documents, Smart TV feasibility matrix, risk/failure registers, and coordination framework.',
    milestoneGate: 'Owner review & GitHub commit of Phase 1 governance docs',
    status: 'COMMITTED',
  },
  {
    phase: 2,
    title: 'AI Studio Functional Prototype (Blocks 2.1–2.3, P2-FIX, Stages P2.4–P2.7)',
    summary: 'Auth/RBAC/QR core (2.1), Campaigns/Profiles (2.2), Ad Studio (2.3), Build Recovery (P2-FIX), Consent & TV Demo (P2.4), Opportunities (P2.5), Public Discovery (P2.6), Admin/Analytics/Security (P2.7).',
    milestoneGate: 'All Stages P2-FIX through P2.7 verified + automated regression suite passing + VS Code handover',
    status: 'IN PROGRESS',
  },
  {
    phase: 3,
    title: 'Production Engineering — Database & Media Infrastructure (Stage P3)',
    summary: 'PostgreSQL migrations, transactional locks, S3/GCS private media storage, server-side FFmpeg/ffprobe & QR vision, Redis rate limiting.',
    milestoneGate: 'Relational persistence, private media pipeline, and migration tests verified',
    status: 'NOT STARTED',
  },
  {
    phase: 4,
    title: 'Smart TV Feasibility & Adapter Engineering (Stage P5)',
    summary: 'Modular TvPlaybackAdapter targeting Android TV / Google TV first, capability detection, mock TV emulators, watchdog restoration, and LG webOS/Samsung Tizen adapters.',
    milestoneGate: 'Fault-injected emulator suite passing with guaranteed Return-to-TV restoration',
    status: 'NOT STARTED',
  },
  {
    phase: 5,
    title: 'Commercial-Break Detection & Safety Buffer (Stage P4)',
    summary: 'Isolated SCTE-35/HLS cueing + lawful A/V signal fusion + historical channel duration profiling with >=5s deterministic safety buffer.',
    milestoneGate: 'Benchmark precision/recall/latency validated on recorded & synthetic streams',
    status: 'NOT STARTED',
  },
  {
    phase: 6,
    title: 'Advertising Delivery Infrastructure',
    summary: 'Low-latency asset preloading, SHA-256 verification, edge QR redirect cluster, and persistent deduplicated funnel ingestion.',
    milestoneGate: 'Load & failure-injection benchmarks verified',
    status: 'NOT STARTED',
  },
  {
    phase: 7,
    title: 'Advertiser & Campaign Commercial Operations',
    summary: 'Production KYC onboarding, billing/invoicing for commercial ads ($0.00 permanent lock for employer vacancies), and SLA support tooling.',
    milestoneGate: 'Operational readiness and billing audit approved',
    status: 'NOT STARTED',
  },
  {
    phase: 8,
    title: 'Server-Side Broadcast Advertisement Rendering',
    summary: '1080p/4K MP4/HLS rendering from Option A compositions, broadcast loudness compliance, and server-side QR frame validation.',
    milestoneGate: 'Broadcast codec & QR readability checks automated',
    status: 'NOT STARTED',
  },
  {
    phase: 9,
    title: 'Opportunity Verification & Public Discovery Operations',
    summary: 'Scaled Tier 1/2/3 verification, informal employer pathways, curated institutional feeds, and appeals/complaints operations.',
    milestoneGate: 'Non-transitive verification & PII filtering audits passed',
    status: 'NOT STARTED',
  },
  {
    phase: 10,
    title: 'Privacy, Security & Statutory Compliance',
    summary: 'Jurisdiction-configured account-free household consent, consent-epoch enforcement, penetration testing, and statutory alignment.',
    milestoneGate: 'Security audit & country compliance gates signed off',
    status: 'NOT STARTED',
  },
  {
    phase: 11,
    title: 'Reliability & Chaos Testing',
    summary: 'Exhaustive fault injection across network drops, decoder crashes, CEC/HDCP failures, and watchdog TV restoration.',
    milestoneGate: 'Zero ordinary-TV degradation under failure scenarios',
    status: 'NOT STARTED',
  },
  {
    phase: 12,
    title: 'Final Integrated Physical Hardware Verification (Stage P6)',
    summary: 'Single integrated physical test on one supported Android TV/Google TV + smartphones after all software/emulator tests pass.',
    milestoneGate: 'Signed Final Physical Verification Report',
    status: 'NOT STARTED',
  },
  {
    phase: 13,
    title: 'Commercial Readiness Assessment',
    summary: 'End-to-end SLA, unit economics, security posture, and operational runbook approval.',
    milestoneGate: 'Executive commercial readiness sign-off',
    status: 'NOT STARTED',
  },
  {
    phase: 14,
    title: 'Worldwide Release Readiness',
    summary: 'One simultaneous product release; targeting geography does not control service availability.',
    milestoneGate: 'Global product readiness verified; legal and safety duties remain separately assessed',
    status: 'NOT STARTED',
  },
  {
    phase: 15,
    title: 'Ad-Targeting Geography & Localization',
    summary: 'Maintain campaign-targeting geography and localized product content independently of service availability.',
    milestoneGate: 'Verify targeting coverage and localization before claiming worldwide reach',
    status: 'NOT STARTED',
  },
];

export const SMART_TV_MATRIX: SmartTvMatrixRow[] = [
  {
    platform: 'Android TV / Google TV',
    architecturePath: 'Primary Target — App + Android TV Remote / TIF Permitted Adapter',
    keyConstraints: 'Unprivileged apps cannot intercept third-party HDMI/tuner streams or bypass DRM/HDCP; channel restoration depends on device/TIF path.',
    technicallyPossible: 'Yes (Permitted Paths)',
    officiallyDocumented: 'Yes (Android TV / TIF Docs)',
    platformPermitted: 'Conditional (Partner / Permitted APIs)',
    hardwareTested: 'NO — Queued for Stage P6',
    productionSuitable: 'TARGET #1 (Requires Stage P5 Adapter + P6 Test)',
  },
  {
    platform: 'Samsung Tizen TV',
    architecturePath: 'Secondary Modular Adapter — Tizen Web/Native App',
    keyConstraints: 'Strict background execution & source switching limits; partner privileges required for broadcast tuner integration.',
    technicallyPossible: 'Partial (App-Level)',
    officiallyDocumented: 'Yes (Samsung Tizen Docs)',
    platformPermitted: 'Partner-Gated for Tuner/Switching',
    hardwareTested: 'NO — Deferred Beyond First Target',
    productionSuitable: 'MODULAR ADAPTER CANDIDATE',
  },
  {
    platform: 'LG webOS TV',
    architecturePath: 'Secondary Modular Adapter — webOS LS2 / WebSocket Adapter',
    keyConstraints: 'LS2 system buses restricted to privileged/signed partner apps; standard apps cannot watch background broadcast feeds.',
    technicallyPossible: 'Partial (App-Level)',
    officiallyDocumented: 'Yes (webOS TV SDK)',
    platformPermitted: 'Partner-Gated for Tuner/Switching',
    hardwareTested: 'NO — Deferred Beyond First Target',
    productionSuitable: 'MODULAR ADAPTER CANDIDATE',
  },
  {
    platform: 'Unprivileged HDMI/Tuner Hijack',
    architecturePath: 'EXPLICITLY PROHIBITED',
    keyConstraints: 'Bypasses HDCP/DRM or forcibly hijacks user HDMI inputs without permitted APIs.',
    technicallyPossible: 'Restricted / Blocked by OS',
    officiallyDocumented: 'Not Supported for 3P Apps',
    platformPermitted: 'NO — Prohibited by Policy & Security',
    hardwareTested: 'N/A — Rejected',
    productionSuitable: 'NO — VIOLATES EDISON SAFETY BOUNDARY',
  },
];

export function generateFormalReport(
  command: ReportCommandType,
  snapshot: LiveReportSnapshot | null
): { title: string; subtitle: string; body: string } {
  const s = snapshot?.summary;
  const syncLine = snapshot
    ? `Live Store Snapshot: ${snapshot.generatedAt} (${s?.userCount ?? 0} users, ${s?.profileCount ?? 0} profiles, ${s?.campaignCount ?? 0} campaigns, ${s?.adCreativeCount ?? 0} creatives, ${s?.qrCount ?? 0} QR links, ${s?.auditLogCount ?? 0} audit entries)`
    : 'Live Store Snapshot: Connecting to /api/reports/live...';

  if (command === 'STATUS') {
    return {
      title: 'EDISON — STATUS Report',
      subtitle: 'Live phase, stage, and build verification summary',
      body: [
        'EDISON — PROJECT STATUS REPORT',
        `Current Phase: ${snapshot?.phase ?? 'Phase 2 — AI Studio Functional Prototype'}`,
        `Current Stage: ${snapshot?.stage ?? 'Stage P2-FIX — Build Recovery & Governance Console Restoration'}`,
        `Current Gate: ${snapshot?.gateStatus ?? 'BUILD RECOVERED · VERIFICATION IN PROGRESS'}`,
        syncLine,
        'Completed & Committed Baseline: Phase 1 (25 Docs), Block 2.1 (Auth/RBAC/QR), Block 2.2 (Profiles/Campaigns/Tickets).',
        'Active Recovery: Stage P2-FIX (Removed dead src/data/* dependency by serving the real 25 Markdown files safely via /api/docs).',
        'Next Sequential Stages: Stage P2.4 (Consent, Country Flags, 16:9 Preview & Break Simulator) -> P2.5 -> P2.6 -> P2.7 -> P3 -> P4 -> P5 -> P6.',
      ].join('\n'),
    };
  }

  if (command === 'CHECK') {
    return {
      title: 'EDISON — CHECK Report',
      subtitle: 'Implemented vs verified workspace audit',
      body: [
        'EDISON — IMPLEMENTATION CHECK REPORT',
        syncLine,
        'Verified Components:',
        '- [VERIFIED] Block 2.1: Express + Vite server, scrypt sessions, RBAC, atomic JSON persistence, QR validator, /r/:token redirect.',
        '- [VERIFIED] Block 2.2: Advertiser profiles, verification submission, support tickets, simulated billing estimate, 10-state campaigns.',
        '- [IMPLEMENTED / BUILD RESTORED] Block 2.3 + P2-FIX: Option A/B Ad Studio & live Markdown governance console via /api/docs.',
        '- [NOT STARTED] Stage P2.4+: Viewer Consent Epoch & HTTP 403 invalidation, Country Flags, 16:9 Full Preview, Commercial-Break Simulator, Opportunities, Public Discovery.',
      ].join('\n'),
    };
  }

  if (command === 'NEXT') {
    return {
      title: 'EDISON — NEXT Action',
      subtitle: 'Authorised sequential task queue',
      body: [
        'EDISON — NEXT AUTHORISED ACTION',
        '1. Confirm TypeScript, Vite production build, and live /api/docs endpoints pass verification.',
        '2. Reconcile documentation & clean stale template remnants (P2-FIX.5 – P2-FIX.7).',
        '3. On owner confirmation ("NEXT"), proceed into Stage P2.4.1 (Household Consent Data Model).',
      ].join('\n'),
    };
  }

  if (command === 'COMMIT') {
    return {
      title: 'EDISON — COMMIT Checkpoint',
      subtitle: 'Pre-commit verification summary for Project Owner',
      body: [
        'EDISON — COMMIT CHECKPOINT SUMMARY',
        syncLine,
        'Required Checks Before Owner Commit:',
        '- npm run lint (tsc --noEmit) passes with exit code 0',
        '- npm run build (vite build) passes with exit code 0',
        '- Governance DocsView, ResearchView, CommandCentreView, and RiskFmeaView load real Markdown specs from /api/docs',
        '- Prototype safety rules intact: no real payments, no business outreach, no fake Smart TV integration',
      ].join('\n'),
    };
  }

  return {
    title: 'EDISON — Implementation Report',
    subtitle: 'Live workspace & build recovery snapshot',
    body: [
      'EDISON — IMPLEMENTATION BLOCK REPORT',
      `Phase / Stage: ${snapshot?.phase ?? 'Phase 2'} / ${snapshot?.stage ?? 'Stage P2-FIX + Block 2.3'}`,
      `Gate Status: ${snapshot?.gateStatus ?? 'BUILD RECOVERED'}`,
      syncLine,
      `Latest Audit: ${snapshot?.latestAuditAction ?? 'None'} (${snapshot?.latestAuditAt ?? 'N/A'})`,
      'Governance Console: Restored using direct allowlisted Markdown serving (/api/docs) without duplicating 25 files into TypeScript.',
      'Production Readiness: NOT PRODUCTION-READY (AI Studio functional prototype only).',
    ].join('\n'),
  };
}
