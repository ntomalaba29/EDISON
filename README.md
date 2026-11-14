# EDISON — International Smart TV Advertising & Opportunity Network

**[STATUS: PHASE 2 — AI STUDIO FUNCTIONAL PROTOTYPE · BLOCK 2.4 (TV PREVIEW & SIMULATOR)]**  
**[REPOSITORY PATH: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`]**

EDISON is an international television advertising and verified opportunity network designed to display QR-enabled advertisements on compatible Smart TVs during suitable commercial breaks, connecting television viewers directly to advertiser destinations and legitimate employment, education, training, grant, and tender opportunities via mobile QR scanning.

---

## 1. Core Experience

1. A viewer watches ordinary linear or broadcast television.
2. During a verified, suitable commercial break (on a permitted, compatible device or pilot architecture), EDISON displays an advertisement containing a scannable QR code.
3. The viewer scans the QR code with a mobile phone.
4. The phone opens the advertiser's or opportunity provider's intended destination directly (optionally through a secure EDISON tracking redirect—never an intermediate EDISON ad screen).
5. The television returns to the live television broadcast at the current live point, with a mandatory manual return control always available.

---

## 2. Two Content Pillars

- **Commercial Advertising**: Products, services, retail promotions, special offers, brand awareness, events, launches, online stores, and business announcements.
- **Employment & Legitimate Opportunities**: Permanent/temporary/part-time/contract jobs, internships, apprenticeships, scholarships, education, training, grants, tenders, workshops, and business opportunities—supporting both formal organisations and verified individual/informal employers under strict verification and anti-fraud rules.

---

## 3. Repository Documentation Map

Every document below is maintained as part of the permanent EDISON engineering record so any future engineer or VS Code Copilot session can operate without access to prior conversations:

| Document | Purpose |
| :--- | :--- |
| `PROJECT_MASTER_SPECIFICATION.md` | Master architectural and functional specification of EDISON |
| `BUSINESS_MODEL.md` | Revenue architecture, opportunity independence, billing boundaries |
| `PRODUCT_REQUIREMENTS.md` | End-to-end functional and non-functional requirements |
| `SYSTEM_ARCHITECTURE.md` | Logical, prototype, and target production architectures |
| `TECHNICAL_REQUIREMENTS.md` | Media specs, latency budgets, API contracts, security controls |
| `SMART_TV_COMPATIBILITY_RESEARCH.md` | Grounded analysis of Android TV, Tizen, webOS, TIF, DRM/HDCP |
| `COMMERCIAL_BREAK_DETECTION.md` | SCTE-35, HbbTV, ATSC 3.0, ACR, historical/ML prediction analysis |
| `ADVERTISING_AND_QR_SYSTEM.md` | QR destination validation, redirect security, physical scan standards |
| `ADVERTISEMENT_CREATION_STUDIO.md` | Option A (Guided Studio) & Option B (Upload + QR Inspection) |
| `TELEVISION_PREVIEW_EXPERIENCE.md` | 16:9 TV preview, opportunity layouts, break simulator, pre-submit gate |
| `OPPORTUNITY_MANAGEMENT.md` | 3-tier verification, moderation, evidence, complaints, appeals |
| `ADVERTISER_MANAGEMENT.md` | Registration, profiles, campaign lifecycle states, admin controls |
| `PRIVACY_SECURITY_AND_COMPLIANCE.md` | Withdrawable consent, data minimisation, audit trails, security |
| `COUNTRY_ACTIVATION_REGISTER.md` | Jurisdiction-by-jurisdiction legal & regulatory gating |
| `RISK_REGISTER.md` | Technical, legal, operational, and fraud risk matrix |
| `FAILURE_MODE_ANALYSIS.md` | 18+ failure modes and fail-safe TV-preservation design |
| `COMPLETE_DEVELOPMENT_ROADMAP.md` | Complete 15-phase roadmap from definition to international expansion |
| `AI_STUDIO_WORKING_BOUNDARY.md` | Strict scope boundary for the AI Studio prototype vs production |
| `VSCODE_HANDOVER_PLAN.md` | Structure and criteria for Phase 2 -> Phase 3 engineering handover |
| `PROGRESS_TRACKER.md` | Verified progress across AI Studio assignment & overall roadmap |
| `DECISIONS_LOG.md` | Immutable Architecture Decision Records (ADRs) |
| `TESTING_STRATEGY.md` | Automated, physical QR, security, and failure-mode test plan |
| `KNOWN_LIMITATIONS.md` | Honest register of current prototype and platform constraints |
| `coordination/EDISON_COMMAND_CENTER.md` | Shared AI Studio <-> VS Code Copilot manual coordination hub |
| `EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md` | Portable copy of all permanent EDISON rules, custom instructions & project path |
| `SESSION_CONTINUITY_LOG.md` | Cross-account session log of discussions, fixes & active checkpoints |

---

## 4. Current Project Boundary Notice

- **[VERIFIED]**: Phase 1 (25 docs), Block 2.1 (Auth/RBAC/Store/QR), and Block 2.2 (Profiles/Tickets/10-State Campaigns) are committed; Block 2.3 (Ad Creation Studio) + GitHub continuity files are verified and awaiting owner commit. No Smart TV hardware integration, real payment gateway, or production broadcast infrastructure is built or claimed.
- **[LIMITATION]**: The AI Studio runtime has no local `.git` repository or push credentials; saving changes to GitHub requires the Project Owner to commit/sync via AI Studio GitHub export or local git.
- **Governance Rule**: Development proceeds strictly sequentially through verified implementation blocks (`PLAN -> IMPLEMENT -> TEST -> REPORT -> USER REVIEW -> USER COMMIT -> USER CONFIRMATION -> NEXT BLOCK`). Use the **`Commit & Next`** header/footer shortcut to copy `"Committed to GitHub. Please proceed to the next block."` after committing.

---

## 5. Local Portal Preview (Phase 1 Reporting & Documentation Console)

The web application served on port `3000` in this workspace is the **Phase 1 Governance, Documentation & Reporting Console**. It provides live inspection of all 25 specification files, the 15-phase roadmap, Smart TV feasibility tables, the Command Centre, and the mandatory functional **Copy Report** interface. Phase 2 prototype application features (Studio, TV Simulator, Advertiser/Opportunity workflows) will be built in subsequent approved implementation blocks.
