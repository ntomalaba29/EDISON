import readmeMd from '../../README.md?raw';
import masterSpecMd from '../../PROJECT_MASTER_SPECIFICATION.md?raw';
import businessModelMd from '../../BUSINESS_MODEL.md?raw';
import productReqMd from '../../PRODUCT_REQUIREMENTS.md?raw';
import systemArchMd from '../../SYSTEM_ARCHITECTURE.md?raw';
import technicalReqMd from '../../TECHNICAL_REQUIREMENTS.md?raw';
import smartTvMd from '../../SMART_TV_COMPATIBILITY_RESEARCH.md?raw';
import breakDetectionMd from '../../COMMERCIAL_BREAK_DETECTION.md?raw';
import adQrSystemMd from '../../ADVERTISING_AND_QR_SYSTEM.md?raw';
import adStudioMd from '../../ADVERTISEMENT_CREATION_STUDIO.md?raw';
import tvPreviewMd from '../../TELEVISION_PREVIEW_EXPERIENCE.md?raw';
import opportunityMgmtMd from '../../OPPORTUNITY_MANAGEMENT.md?raw';
import advertiserMgmtMd from '../../ADVERTISER_MANAGEMENT.md?raw';
import privacySecMd from '../../PRIVACY_SECURITY_AND_COMPLIANCE.md?raw';
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
import permanentInstructionsMd from '../../EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md?raw';
import sessionContinuityMd from '../../SESSION_CONTINUITY_LOG.md?raw';

export type DocCategory =
  | 'Core & Governance'
  | 'Architecture & Smart TV'
  | 'Product & Studios'
  | 'Compliance, Risk & QA'
  | 'Coordination';

export interface EdisonDocument {
  id: string;
  filename: string;
  title: string;
  category: DocCategory;
  content: string;
}

export const EDISON_DOCUMENTS: EdisonDocument[] = [
  {
    id: 'readme',
    filename: 'README.md',
    title: 'Project Overview & Repository Guide',
    category: 'Core & Governance',
    content: readmeMd,
  },
  {
    id: 'master-spec',
    filename: 'PROJECT_MASTER_SPECIFICATION.md',
    title: 'Project Master Specification',
    category: 'Core & Governance',
    content: masterSpecMd,
  },
  {
    id: 'business-model',
    filename: 'BUSINESS_MODEL.md',
    title: 'Business Model & Commercial Rules',
    category: 'Core & Governance',
    content: businessModelMd,
  },
  {
    id: 'product-req',
    filename: 'PRODUCT_REQUIREMENTS.md',
    title: 'Product Requirements Document',
    category: 'Core & Governance',
    content: productReqMd,
  },
  {
    id: 'roadmap',
    filename: 'COMPLETE_DEVELOPMENT_ROADMAP.md',
    title: 'Complete 15-Phase Development Roadmap',
    category: 'Core & Governance',
    content: roadmapMd,
  },
  {
    id: 'progress',
    filename: 'PROGRESS_TRACKER.md',
    title: 'Progress Tracker',
    category: 'Core & Governance',
    content: progressMd,
  },
  {
    id: 'decisions',
    filename: 'DECISIONS_LOG.md',
    title: 'Architecture & Product Decisions Log',
    category: 'Core & Governance',
    content: decisionsMd,
  },
  {
    id: 'system-arch',
    filename: 'SYSTEM_ARCHITECTURE.md',
    title: 'System Architecture',
    category: 'Architecture & Smart TV',
    content: systemArchMd,
  },
  {
    id: 'technical-req',
    filename: 'TECHNICAL_REQUIREMENTS.md',
    title: 'Technical Requirements',
    category: 'Architecture & Smart TV',
    content: technicalReqMd,
  },
  {
    id: 'smart-tv',
    filename: 'SMART_TV_COMPATIBILITY_RESEARCH.md',
    title: 'Smart TV Compatibility Research',
    category: 'Architecture & Smart TV',
    content: smartTvMd,
  },
  {
    id: 'break-detection',
    filename: 'COMMERCIAL_BREAK_DETECTION.md',
    title: 'Commercial-Break Detection Research',
    category: 'Architecture & Smart TV',
    content: breakDetectionMd,
  },
  {
    id: 'ad-qr-system',
    filename: 'ADVERTISING_AND_QR_SYSTEM.md',
    title: 'Advertising & QR Redirect System',
    category: 'Product & Studios',
    content: adQrSystemMd,
  },
  {
    id: 'ad-studio',
    filename: 'ADVERTISEMENT_CREATION_STUDIO.md',
    title: 'Advertisement Creation Studio (Option A & B)',
    category: 'Product & Studios',
    content: adStudioMd,
  },
  {
    id: 'tv-preview',
    filename: 'TELEVISION_PREVIEW_EXPERIENCE.md',
    title: '16:9 Television Preview Experience',
    category: 'Product & Studios',
    content: tvPreviewMd,
  },
  {
    id: 'opportunity-mgmt',
    filename: 'OPPORTUNITY_MANAGEMENT.md',
    title: 'Opportunity Management & 3-Tier Verification',
    category: 'Product & Studios',
    content: opportunityMgmtMd,
  },
  {
    id: 'advertiser-mgmt',
    filename: 'ADVERTISER_MANAGEMENT.md',
    title: 'Advertiser Profiles & Campaign Management',
    category: 'Product & Studios',
    content: advertiserMgmtMd,
  },
  {
    id: 'privacy-sec',
    filename: 'PRIVACY_SECURITY_AND_COMPLIANCE.md',
    title: 'Privacy, Security & Legal Compliance',
    category: 'Compliance, Risk & QA',
    content: privacySecMd,
  },
  {
    id: 'country-reg',
    filename: 'COUNTRY_ACTIVATION_REGISTER.md',
    title: 'Country Activation Register',
    category: 'Compliance, Risk & QA',
    content: countryRegMd,
  },
  {
    id: 'risk-reg',
    filename: 'RISK_REGISTER.md',
    title: 'Risk Register',
    category: 'Compliance, Risk & QA',
    content: riskRegMd,
  },
  {
    id: 'fmea',
    filename: 'FAILURE_MODE_ANALYSIS.md',
    title: 'Failure Mode & Effects Analysis (18 Modes)',
    category: 'Compliance, Risk & QA',
    content: fmeaMd,
  },
  {
    id: 'testing',
    filename: 'TESTING_STRATEGY.md',
    title: 'Testing Strategy & QA Gates',
    category: 'Compliance, Risk & QA',
    content: testingMd,
  },
  {
    id: 'limitations',
    filename: 'KNOWN_LIMITATIONS.md',
    title: 'Known Limitations & Prototype Boundaries',
    category: 'Compliance, Risk & QA',
    content: limitationsMd,
  },
  {
    id: 'ai-boundary',
    filename: 'AI_STUDIO_WORKING_BOUNDARY.md',
    title: 'AI Studio Working Boundary',
    category: 'Coordination',
    content: boundaryMd,
  },
  {
    id: 'vscode-handover',
    filename: 'VSCODE_HANDOVER_PLAN.md',
    title: 'VS Code Engineering Handover Plan',
    category: 'Coordination',
    content: handoverMd,
  },
  {
    id: 'command-center',
    filename: 'coordination/EDISON_COMMAND_CENTER.md',
    title: 'AI Studio & VS Code Command Centre',
    category: 'Coordination',
    content: commandCenterMd,
  },
  {
    id: 'permanent-instructions',
    filename: 'EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md',
    title: 'Permanent Governance & System Instructions',
    category: 'Coordination',
    content: permanentInstructionsMd,
  },
  {
    id: 'session-continuity',
    filename: 'SESSION_CONTINUITY_LOG.md',
    title: 'Session Continuity & Cross-Account Log',
    category: 'Coordination',
    content: sessionContinuityMd,
  },
];
