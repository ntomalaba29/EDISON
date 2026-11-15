# EDISON — International Smart TV Advertising & Opportunity Network

**[STATUS: PHASE 2 BLOCKS 2.1–2.7 VERIFIED · `P2-FIX.6`, `v2.1` & `v2.2` DOCS UNCOMMITTED · `TASK-P3-001` PAUSED IN `DRAFT`]**  
**[REPOSITORY PATH: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`]**

EDISON is an international television advertising and verified opportunity network designed to display QR-enabled advertisements on compatible Smart TVs during suitable commercial breaks, connecting television viewers directly to advertiser destinations and legitimate employment, education, training, grant, and tender opportunities via mobile QR scanning—and improving break detection across the network through **Network-Wide Shared Ad Intelligence (`v2.2`, implementation `NOT STARTED`)**.

---

## 1. Core Experience

1. A viewer watches ordinary linear or broadcast television.
2. During a verified, suitable commercial break (on a permitted, compatible device or pilot architecture), EDISON displays an advertisement containing a scannable QR code.
3. The viewer scans the QR code with a mobile phone.
4. The phone opens the advertiser's or opportunity provider's intended destination directly (optionally through a verified EDISON tracking redirect—never an intermediate EDISON ad screen).
5. The television returns to the live television broadcast at the current live point, with a mandatory manual return control always available.

---

## 2. Two Primary Categories (`CHARITY ADS` & `COMMERCIAL ADS`) & Shared Intelligence

- **`CHARITY ADS` (`$0.00 / FREE` Permanent Rate Card)**: Formal and verified informal employment/free employer job listings, internships, apprenticeships, scholarships, school/university admissions, education, training, conferences, educational events, community development, grants, tenders, and approved public-benefit programmes—always free to submit, verify, broadcast, scan, and apply under strict anti-fraud and 3-tier non-transitive verification rules.
- **`COMMERCIAL ADS` (Direct-Paid Priority + Modular CTV Network Backfill)**: Commercial promotions, shops, supermarkets, restaurants, brands, manufacturers, and service providers across **Image/Banner**, **Video**, and **Text-Only Commercial Ads**, alternating `CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL` in eligible breaks.
- **Network-Wide Shared Ad Intelligence (`v2.2` Approved Core Requirement — `NOT STARTED`)**: Participating TVs share corroborated, scoped (`country/broadcaster/channel/platform/config`), privacy-stripped commercial-break detection telemetry through a **Central Shared Intelligence Service** and offline-capable **Local Intelligence Cache** with versioned rollback protection (`LEARN ONCE. DISTRIBUTE EVERYWHERE. UPDATE CONTINUOUSLY.`).

---

## 3. Repository Documentation Map

Every document below is maintained as part of the permanent EDISON engineering record so any future engineer or VS Code Copilot session can operate without access to prior conversations:

| Document | Purpose |
| :--- | :--- |
| `PROJECT_MASTER_SPECIFICATION.md` | Master architectural and functional specification (`v2.2` incl. Shared Ad Intelligence) |
| `BUSINESS_MODEL.md` | Revenue architecture, `$0` Charity separation, direct priority & ledger separation |
| `PRODUCT_REQUIREMENTS.md` | End-to-end functional and non-functional requirements (`PRD-01`–`PRD-19`) |
| `SYSTEM_ARCHITECTURE.md` | Modular 11-domain architecture, Shared Intelligence topology & CTV adapter boundary |
| `TECHNICAL_REQUIREMENTS.md` | Media & Text-Only specs, Shared Intelligence schema/corroboration/rollback & CTV limits |
| `SMART_TV_COMPATIBILITY_RESEARCH.md` | Grounded analysis of Android TV, Tizen, webOS, Local Cache adapters & remote repo audit |
| `COMMERCIAL_BREAK_DETECTION.md` | SCTE-35, HbbTV, ATSC 3.0, ACR, break-detection repo audit & Shared Ad Intelligence loop |
| `ADVERTISING_AND_QR_SYSTEM.md` | QR destination validation, redirect security, `ADR-002` baseline & `DEC-OPEN-01` proposals |
| `ADVERTISEMENT_CREATION_STUDIO.md` | Option A (Guided Studio), Option B (Upload + QR Inspection) & Text-Only Commercial format |
| `TELEVISION_PREVIEW_EXPERIENCE.md` | 16:9 TV preview, opportunity layouts, software break simulator & pre-submit gate |
| `OPPORTUNITY_MANAGEMENT.md` | 3-tier verification, moderation, evidence, complaints, appeals |
| `ADVERTISER_MANAGEMENT.md` | Registration, profiles, campaign lifecycle states, admin controls |
| `PRIVACY_SECURITY_AND_COMPLIANCE.md` | Consent conflict resolution (`DEC-OPEN-01`), data minimisation, audit trails, security |
| `COUNTRY_ACTIVATION_REGISTER.md` | Independent public statutory research (`No Legal Counsel Dependency`), technical controls & open uncertainty |
| `RISK_REGISTER.md` | Technical, legal, operational, and fraud risk matrix |
| `FAILURE_MODE_ANALYSIS.md` | 18+ failure modes and fail-safe TV-preservation design |
| `COMPLETE_DEVELOPMENT_ROADMAP.md` | Complete 15-phase roadmap including Shared Intelligence, software-first testing & single `Stage P6` check |
| `AI_STUDIO_WORKING_BOUNDARY.md` | Strict scope boundary for the AI Studio prototype vs production |
| `VSCODE_HANDOVER_PLAN.md` | Structure and criteria for Phase 2 -> Phase 3 engineering handover |
| `VSCODE_HANDOVER_PACKAGE.md` | Complete Phase 2 -> Phase 3 handover dossier for VS Code Copilot |
| `PROGRESS_TRACKER.md` | Verified progress across implemented code, uncommitted `v2.1`/`v2.2` docs & open blockers |
| `DECISIONS_LOG.md` | Approved ADRs (`ADR-001`–`ADR-016`) separated strictly from Unresolved Owner Decisions (`DEC-OPEN-01`..`04`) |
| `TESTING_STRATEGY.md` | Software-first 35-scenario automated test plan (`25`–`35` Shared Intel) + single final `Stage P6` physical test |
| `KNOWN_LIMITATIONS.md` | Honest register of uncommitted changes, `DEC-OPEN-01` blocks, GAM format uncertainty & prototype limits |
| `coordination/EDISON_COMMAND_CENTER.md` | Shared AI Studio <-> VS Code Copilot manual coordination hub |
| `EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md` | Portable copy of all permanent EDISON rules, custom instructions & project path |
| `SESSION_CONTINUITY_LOG.md` | Cross-account session log of discussions, fixes & active checkpoints |
| `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md` | Deferred empirical audit of all 9 named GitHub research candidates (`Status: DEFERRED`) |

---

## 4. Current Project Boundary Notice

- **[VERIFIED]**: Phase 1 governance baseline & Phase 2 Blocks 2.1–2.7 code (`server.ts`, `store.ts` v6, `AdStudioView`, `TvPreviewView`, `OpportunityView`, `AdminAnalyticsView`, `QaHandoverView`) compile and pass static/runtime health checks cleanly. **`P2-FIX.6`** (`package.json`, `.env.example`), reconciled **`v2.1`** specifications, and the **`v2.2` Network-Wide Shared Ad Intelligence Addendum** (`ADR-016` / `PRD-19`, **implementation `NOT STARTED`**) are **uncommitted locally** for one combined owner commit. **`TASK-P3-001` is paused in `DRAFT`**. Zero physical TV testing during development (`Stage P6` single final test only), zero real payments (`paymentCollectionActive: false`), commercial outreach strictly locked, AURA deferred, and zero legal compliance claimed.
- **[LIMITATION]**: The AI Studio runtime has no local `.git` repository or push credentials; saving changes to GitHub requires the Project Owner to review and commit via AI Studio GitHub export or local git.
- **Governance Rule**: Development proceeds strictly sequentially through verified checkpoints. Unresolved Owner Decisions (`DEC-OPEN-01` consent/profile architecture) remain blocked from implementation until explicitly resolved by the Project Owner.

---

## 5. Local Portal Preview (Full Phase 2 Prototype & Governance Console)

The web application served on port `3000` in this workspace hosts the complete **Phase 2 Functional Prototype** (Auth/RBAC, Advertiser Profiles, 10-State Campaigns, Option A/B Ad Creation Studio, 16:9 TV Preview & Break Simulator, Opportunity 3-Tier QA, Admin Moderation & 7-Stage Analytics, Physical Mobile QR Scan Lab & VS Code Handover Package) alongside the **Governance, Research & Copy Report Console**.
