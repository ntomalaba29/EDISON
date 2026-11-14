import readmeMd from '../../README.md?raw';
import masterSpecMd from '../../PROJECT_MASTER_SPECIFICATION.md?raw';
import businessModelMd from '../../BUSINESS_MODEL.md?raw';
import prdMd from '../../PRODUCT_REQUIREMENTS.md?raw';
import systemArchMd from '../../SYSTEM_ARCHITECTURE.md?raw';
import techReqMd from '../../TECHNICAL_REQUIREMENTS.md?raw';
import smartTvMd from '../../SMART_TV_COMPATIBILITY_RESEARCH.md?raw';
import breakDetectMd from '../../COMMERCIAL_BREAK_DETECTION.md?raw';
import adQrMd from '../../ADVERTISING_AND_QR_SYSTEM.md?raw';
import adStudioMd from '../../ADVERTISEMENT_CREATION_STUDIO.md?raw';
import tvPreviewMd from '../../TELEVISION_PREVIEW_EXPERIENCE.md?raw';
import opportunityMd from '../../OPPORTUNITY_MANAGEMENT.md?raw';
import advertiserMd from '../../ADVERTISER_MANAGEMENT.md?raw';
import privacyMd from '../../PRIVACY_SECURITY_AND_COMPLIANCE.md?raw';
import countryRegMd from '../../COUNTRY_ACTIVATION_REGISTER.md?raw';
import riskRegMd from '../../RISK_REGISTER.md?raw';
import fmeaMd from '../../FAILURE_MODE_ANALYSIS.md?raw';
import roadmapMd from '../../COMPLETE_DEVELOPMENT_ROADMAP.md?raw';
import boundaryMd from '../../AI_STUDIO_WORKING_BOUNDARY.md?raw';
import handoverMd from '../../VSCODE_HANDOVER_PLAN.md?raw';
import progressMd from '../../PROGRESS_TRACKER.md?raw';
import decisionsMd from '../../DECISIONS_LOG.md?raw';
import testingMd from '../../TESTING_STRATEGY.md?raw';
import limitationsMd from '../../KNOWN_LIMITATIONS.md?raw';
import commandCenterMd from '../../coordination/EDISON_COMMAND_CENTER.md?raw';

export type DocCategory =
  | 'Core & Governance'
  | 'Architecture & Smart TV'
  | 'Product & Studios'
  | 'Compliance, Risk & QA'
  | 'Coordination';

export interface EdisonDoc {
  id: string;
  filename: string;
  title: string;
  category: DocCategory;
  summary: string;
  content: string;
}

export const EDISON_DOCUMENTS: EdisonDoc[] = [
  {
    id: 'readme',
    filename: 'README.md',
    title: 'Repository Overview',
    category: 'Core & Governance',
    summary: 'Project mission, dual content pillars, documentation index, and governance rules.',
    content: readmeMd,
  },
  {
    id: 'master-spec',
    filename: 'PROJECT_MASTER_SPECIFICATION.md',
    title: 'Project Master Specification',
    category: 'Core & Governance',
    summary: 'Non-negotiable principles, safe playback equation, and unresolved strategic questions.',
    content: masterSpecMd,
  },
  {
    id: 'business-model',
    filename: 'BUSINESS_MODEL.md',
    title: 'Business Model',
    category: 'Core & Governance',
    summary: 'Value proposition, revenue hypotheses, verification independence, prototype billing limits.',
    content: businessModelMd,
  },
  {
    id: 'prd',
    filename: 'PRODUCT_REQUIREMENTS.md',
    title: 'Product Requirements (PRD)',
    category: 'Product & Studios',
    summary: 'Personas and PRD-01 through PRD-12 functional requirements matrix.',
    content: prdMd,
  },
  {
    id: 'roadmap',
    filename: 'COMPLETE_DEVELOPMENT_ROADMAP.md',
    title: 'Complete Development Roadmap',
    category: 'Core & Governance',
    summary: 'Sequential 15-phase roadmap from Phase 1 research through Phase 15 expansion.',
    content: roadmapMd,
  },
  {
    id: 'boundary',
    filename: 'AI_STUDIO_WORKING_BOUNDARY.md',
    title: 'AI Studio Working Boundary',
    category: 'Core & Governance',
    summary: 'Exact split between AI Studio prototype scope and deferred Smart TV / production scope.',
    content: boundaryMd,
  },
  {
    id: 'system-arch',
    filename: 'SYSTEM_ARCHITECTURE.md',
    title: 'System Architecture',
    category: 'Architecture & Smart TV',
    summary: 'Prototype vs target production topology and TvPlaybackAdapter interface contract.',
    content: systemArchMd,
  },
  {
    id: 'tech-req',
    filename: 'TECHNICAL_REQUIREMENTS.md',
    title: 'Technical Requirements',
    category: 'Architecture & Smart TV',
    summary: '16:9 TV safe zones, QR density/latency budgets, SVG/upload security controls.',
    content: techReqMd,
  },
  {
    id: 'smart-tv',
    filename: 'SMART_TV_COMPATIBILITY_RESEARCH.md',
    title: 'Smart TV Compatibility Research',
    category: 'Architecture & Smart TV',
    summary: 'Grounded analysis of Android TV TIF, Samsung Tizen, LG webOS, DRM/HDCP & 5-level matrix.',
    content: smartTvMd,
  },
  {
    id: 'break-detection',
    filename: 'COMMERCIAL_BREAK_DETECTION.md',
    title: 'Commercial-Break Detection',
    category: 'Architecture & Smart TV',
    summary: 'SCTE-35, HbbTV, ATSC 3.0, ACR/watermarking, historical patterns & fail-safe rules.',
    content: breakDetectMd,
  },
  {
    id: 'qr-system',
    filename: 'ADVERTISING_AND_QR_SYSTEM.md',
    title: 'Advertising & QR System',
    category: 'Product & Studios',
    summary: 'Supported QR destination types, URL validation, 302 redirect security, physical scan standards.',
    content: adQrMd,
  },
  {
    id: 'ad-studio',
    filename: 'ADVERTISEMENT_CREATION_STUDIO.md',
    title: 'Advertisement Creation Studio',
    category: 'Product & Studios',
    summary: 'Option A guided non-designer builder and Option B upload validation & QR inspection.',
    content: adStudioMd,
  },
  {
    id: 'tv-preview',
    filename: 'TELEVISION_PREVIEW_EXPERIENCE.md',
    title: 'Television Preview Experience',
    category: 'Product & Studios',
    summary: '16:9 playable preview, opportunity layouts, break simulator, pre-submit gate.',
    content: tvPreviewMd,
  },
  {
    id: 'opportunity-mgmt',
    filename: 'OPPORTUNITY_MANAGEMENT.md',
    title: 'Opportunity Management',
    category: 'Product & Studios',
    summary: '3-tier verification model, informal employers, expiry, complaints, appeals.',
    content: opportunityMd,
  },
  {
    id: 'advertiser-mgmt',
    filename: 'ADVERTISER_MANAGEMENT.md',
    title: 'Advertiser Management',
    category: 'Product & Studios',
    summary: 'Onboarding, profiles, 10-state campaign lifecycle, admin moderation controls.',
    content: advertiserMd,
  },
  {
    id: 'privacy',
    filename: 'PRIVACY_SECURITY_AND_COMPLIANCE.md',
    title: 'Privacy, Security & Compliance',
    category: 'Compliance, Risk & QA',
    summary: 'Withdrawable consent, opportunity-vs-ad legal question, data minimisation, audit trails.',
    content: privacyMd,
  },
  {
    id: 'country-reg',
    filename: 'COUNTRY_ACTIVATION_REGISTER.md',
    title: 'Country Activation Register',
    category: 'Compliance, Risk & QA',
    summary: '9-pillar statutory & legal readiness matrix across target international markets.',
    content: countryRegMd,
  },
  {
    id: 'risk-reg',
    filename: 'RISK_REGISTER.md',
    title: 'Risk Register',
    category: 'Compliance, Risk & QA',
    summary: 'Platform, broadcast, trust & safety, QR security, privacy, and hardware risks.',
    content: riskRegMd,
  },
  {
    id: 'fmea',
    filename: 'FAILURE_MODE_ANALYSIS.md',
    title: 'Failure Mode Analysis (FMEA)',
    category: 'Compliance, Risk & QA',
    summary: '18 failure modes and fail-safe mechanisms guaranteeing ordinary TV usability.',
    content: fmeaMd,
  },
  {
    id: 'testing-strategy',
    filename: 'TESTING_STRATEGY.md',
    title: 'Testing Strategy',
    category: 'Compliance, Risk & QA',
    summary: '4-tier verification plan from static checks to physical QR scan & hardware fault injection.',
    content: testingMd,
  },
  {
    id: 'known-limitations',
    filename: 'KNOWN_LIMITATIONS.md',
    title: 'Known Limitations',
    category: 'Compliance, Risk & QA',
    summary: 'Honest ledger of unverified areas, local-only repo status, and deferred scope.',
    content: limitationsMd,
  },
  {
    id: 'progress',
    filename: 'PROGRESS_TRACKER.md',
    title: 'Progress Tracker',
    category: 'Core & Governance',
    summary: 'Verified progress across Assignment 1 and the 15-phase EDISON roadmap.',
    content: progressMd,
  },
  {
    id: 'decisions',
    filename: 'DECISIONS_LOG.md',
    title: 'Decisions Log (ADRs)',
    category: 'Core & Governance',
    summary: 'Architecture Decision Records ADR-001 through ADR-007.',
    content: decisionsMd,
  },
  {
    id: 'handover',
    filename: 'VSCODE_HANDOVER_PLAN.md',
    title: 'VS Code Handover Plan',
    category: 'Coordination',
    summary: 'Exit criteria and Phase 3 task queue structure for VS Code Copilot handover.',
    content: handoverMd,
  },
  {
    id: 'command-center',
    filename: 'coordination/EDISON_COMMAND_CENTER.md',
    title: 'EDISON Command Centre',
    category: 'Coordination',
    summary: 'Shared AI Studio <-> VS Code Copilot manual coordination and task history file.',
    content: commandCenterMd,
  },
];
