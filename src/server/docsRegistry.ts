import fs from 'node:fs';
import path from 'node:path';

export type DocCategory =
  | 'Core & Governance'
  | 'Architecture & Smart TV'
  | 'Product & Studios'
  | 'Compliance, Risk & QA'
  | 'Coordination';

export interface GovernanceDocMeta {
  id: string;
  title: string;
  filename: string;
  category: DocCategory;
}

export interface GovernanceDocRecord extends GovernanceDocMeta {
  content: string;
  bytes: number;
  updatedAt: string;
}

export const GOVERNANCE_DOCS_ALLOWLIST: GovernanceDocMeta[] = [
  { id: 'readme', title: 'Project Overview & Index', filename: 'README.md', category: 'Core & Governance' },
  {
    id: 'master-spec',
    title: 'Project Master Specification',
    filename: 'PROJECT_MASTER_SPECIFICATION.md',
    category: 'Core & Governance',
  },
  { id: 'business-model', title: 'Business Model', filename: 'BUSINESS_MODEL.md', category: 'Core & Governance' },
  {
    id: 'prd',
    title: 'Product Requirements',
    filename: 'PRODUCT_REQUIREMENTS.md',
    category: 'Core & Governance',
  },
  { id: 'roadmap', title: 'Complete Development Roadmap', filename: 'COMPLETE_DEVELOPMENT_ROADMAP.md', category: 'Core & Governance' },
  { id: 'progress-tracker', title: 'Progress Tracker', filename: 'PROGRESS_TRACKER.md', category: 'Core & Governance' },
  { id: 'decisions-log', title: 'Decisions Log (ADRs)', filename: 'DECISIONS_LOG.md', category: 'Core & Governance' },
  { id: 'known-limitations', title: 'Known Limitations', filename: 'KNOWN_LIMITATIONS.md', category: 'Core & Governance' },
  { id: 'architecture', title: 'System Architecture', filename: 'SYSTEM_ARCHITECTURE.md', category: 'Architecture & Smart TV' },
  { id: 'tech-req', title: 'Technical Requirements', filename: 'TECHNICAL_REQUIREMENTS.md', category: 'Architecture & Smart TV' },
  { id: 'smart-tv', title: 'Smart TV Compatibility Research', filename: 'SMART_TV_COMPATIBILITY_RESEARCH.md', category: 'Architecture & Smart TV' },
  { id: 'break-detection', title: 'Commercial-Break Detection', filename: 'COMMERCIAL_BREAK_DETECTION.md', category: 'Architecture & Smart TV' },
  { id: 'ad-qr', title: 'Advertising & QR System', filename: 'ADVERTISING_AND_QR_SYSTEM.md', category: 'Product & Studios' },
  { id: 'ad-studio', title: 'Advertisement Creation Studio', filename: 'ADVERTISEMENT_CREATION_STUDIO.md', category: 'Product & Studios' },
  { id: 'tv-preview', title: 'Television Preview Experience', filename: 'TELEVISION_PREVIEW_EXPERIENCE.md', category: 'Product & Studios' },
  { id: 'opportunity-mgmt', title: 'Opportunity Management', filename: 'OPPORTUNITY_MANAGEMENT.md', category: 'Product & Studios' },
  { id: 'advertiser-mgmt', title: 'Advertiser Management', filename: 'ADVERTISER_MANAGEMENT.md', category: 'Product & Studios' },
  { id: 'privacy-security', title: 'Privacy, Security & Compliance', filename: 'PRIVACY_SECURITY_AND_COMPLIANCE.md', category: 'Compliance, Risk & QA' },
  { id: 'jurisdiction-register', title: 'Jurisdiction Compliance Considerations', filename: 'JURISDICTION_COMPLIANCE_REGISTER.md', category: 'Compliance, Risk & QA' },
  { id: 'risk-reg', title: 'Risk Register', filename: 'RISK_REGISTER.md', category: 'Compliance, Risk & QA' },
  { id: 'fmea', title: 'Failure Mode Analysis (FMEA)', filename: 'FAILURE_MODE_ANALYSIS.md', category: 'Compliance, Risk & QA' },
  { id: 'testing-strategy', title: 'Testing Strategy', filename: 'TESTING_STRATEGY.md', category: 'Compliance, Risk & QA' },
  { id: 'working-boundary', title: 'AI Studio Working Boundary', filename: 'AI_STUDIO_WORKING_BOUNDARY.md', category: 'Coordination' },
  { id: 'handover', title: 'VS Code Handover Plan', filename: 'VSCODE_HANDOVER_PLAN.md', category: 'Coordination' },
  { id: 'command-center', title: 'EDISON Command Centre', filename: 'coordination/EDISON_COMMAND_CENTER.md', category: 'Coordination' },
];

const ALLOWLIST_BY_ID = new Map(GOVERNANCE_DOCS_ALLOWLIST.map((entry) => [entry.id, entry]));

export function getGovernanceDocMetadata(id: string): GovernanceDocMeta | null {
  return ALLOWLIST_BY_ID.get(id) ?? null;
}

export function listGovernanceDocMetadata(): GovernanceDocMeta[] {
  return GOVERNANCE_DOCS_ALLOWLIST.map((entry) => ({ ...entry }));
}

function readAllowedDoc(meta: GovernanceDocMeta): GovernanceDocRecord {
  const rootDir = path.resolve(process.cwd());
  const resolvedPath = path.resolve(rootDir, meta.filename);
  if (resolvedPath !== path.join(rootDir, meta.filename) && !resolvedPath.startsWith(rootDir + path.sep)) {
    throw new Error('FORBIDDEN: Invalid governance document path.');
  }
  const stat = fs.statSync(resolvedPath);
  const content = fs.readFileSync(resolvedPath, 'utf8');
  return {
    ...meta,
    content,
    bytes: stat.size,
    updatedAt: stat.mtime.toISOString(),
  };
}

export function listGovernanceDocs(): GovernanceDocRecord[] {
  return GOVERNANCE_DOCS_ALLOWLIST.map((meta) => readAllowedDoc(meta));
}

export function getGovernanceDocById(id: string): GovernanceDocRecord | null {
  const meta = ALLOWLIST_BY_ID.get(id);
  if (!meta) return null;
  return readAllowedDoc(meta);
}
