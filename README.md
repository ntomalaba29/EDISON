# EDISON — International Smart TV Advertising & Opportunity Network

**[CURRENT STATUS: `75/97` EXECUTABLE SUBPHASES COMPLETE (77.3%) · PROTOTYPE 8/8 · TV CONTROL 3/5 · PHASE 5 35/37 · CURRENT TASK: 5.11b · BLOCKED ON MEDIA STORAGE PROVIDER APPROVAL · GITHUB ACTIONS BLOCKED BY ACCOUNT BILLING · NO PHYSICAL TV TEST]**
**[REPOSITORY PATH: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`]**

The atomic subphase ledger, test evidence, open blockers, and next task are in [`EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md`](EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md). It supersedes older weighted figures and historical checkpoint labels. The ledger is **75/97 (77.3%)**; Worker auth/session, D1-backed business routes, documentation assets, restart persistence, and provider-neutral media validation are verified locally. Worker media storage and FFmpeg remain explicitly disabled. **5.11b** is blocked on owner approval of a storage provider and costs; no remote deployment, Linux CI, real TV transport, or Stage P6 test is claimed.

EDISON is an international television advertising and verified opportunity network designed to display QR-enabled advertisements on compatible Smart TVs during suitable commercial breaks, connecting television viewers directly to advertiser destinations and legitimate employment, education, training, grant, and tender opportunities via mobile QR scanning—and improving break detection across the network through **Network-Wide Shared Ad Intelligence**.

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
- **Network-Wide Shared Ad Intelligence (`ADR-016`)**: A software simulation of scoped, corroborated break intelligence and local caching is implemented and tested. A durable, deployed fleet service and real participating TVs are not.
- **Normal Everyday TV Remote Control (`ADR-017` / `PRD-20`)**: AURA and platform command simulators are implemented and tested. Real TV transports, native permissions, and hardware compatibility are not verified; ordinary remote control remains separate from break switching.

---

## 3. Repository Documentation Map

Every document below is maintained as part of the permanent EDISON engineering record so any future engineer or VS Code Copilot session can operate without access to prior conversations:

| Document | Purpose |
| :--- | :--- |
| `PROJECT_MASTER_SPECIFICATION.md` | Master architectural and functional specification (`v2.2` incl. Shared Ad Intelligence) |
| `BUSINESS_MODEL.md` | Revenue architecture, `$0` Charity separation, direct priority & ledger separation |
| `PRODUCT_REQUIREMENTS.md` | End-to-end functional and non-functional requirements (`PRD-01`–`PRD-20`) |
| `SYSTEM_ARCHITECTURE.md` | Modular 12-domain architecture, `AURA` remote plane, Shared Intelligence topology & CTV boundary |
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
| `EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md` | **Current authority** for executable subphases, direct `completed/total` arithmetic, evidence, repository research, and next task |
| `docs/EDISON_PRODUCT_VISION_AND_BUILD_PLAN.md` | Owner-confirmed end-to-end product flow, current reality, and no-cost local build sequence |
| `docs/research/EDISON_REPOSITORY_SHORTLIST.md` | Link-only list of TV remote, commercial-break detector, and ad-playback repositories to study |
| `AI_STUDIO_WORKING_BOUNDARY.md` | Strict scope boundary for the AI Studio prototype vs production |
| `VSCODE_HANDOVER_PLAN.md` | Structure and criteria for Phase 2 -> Phase 3 engineering handover |
| `VSCODE_HANDOVER_PACKAGE.md` | Complete Phase 2 -> Phase 3 handover dossier for VS Code Copilot |
| `PROGRESS_TRACKER.md` | Historical weighted progress plus latest local verification; subphase counts are in the handoff plan |
| `DECISIONS_LOG.md` | Approved ADRs (`ADR-001`–`ADR-017`) separated strictly from Unresolved Owner Decisions (`DEC-OPEN-01`..`08`) |
| `TESTING_STRATEGY.md` | Software-first 35-scenario automated test plan (`25`–`35` Shared Intel) + single final `Stage P6` physical test |
| `KNOWN_LIMITATIONS.md` | Honest register of uncommitted changes, `DEC-OPEN-01` blocks, GAM format uncertainty & prototype limits |
| `coordination/EDISON_COMMAND_CENTER.md` | Shared AI Studio <-> VS Code Copilot manual coordination hub |
| `EDISON_PERMANENT_SYSTEM_INSTRUCTIONS.md` | Portable copy of all permanent EDISON rules, custom instructions & project path |
| `SESSION_CONTINUITY_LOG.md` | Cross-account session log of discussions, fixes & active checkpoints |
| `docs/research/EDISON_TV_REMOTE_AND_BREAK_DETECTION_REPOSITORIES.md` | Current remote-control and commercial-break repository research, owner-provided product flow, and proposed hybrid architecture |
| `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md` | Historical owner-supplied repository shortlist |

---

## 4. Current Project Boundary Notice

- **[CURRENT]**: Use the handoff plan for statuses and next action. The verified Windows baseline is recorded there; Actions has not produced a Linux job. The remote simulator and shared-intelligence prototype are not production TV/network integrations.
- **[BOUNDARIES]**: No physical TV test has been performed; no payment collection, external KYC, market activation, external penetration test, or legal-compliance claim is active. `DEC-OPEN-01` is resolved; `DEC-OPEN-02` through `DEC-OPEN-04` remain open/deferred.
- **[GIT]**: The current Windows workspace has local Git metadata. AI Studio may not; follow the current commit workflow in the handoff plan and repository UI rather than assuming either environment has credentials.

---

## 5. Local Portal Preview (Full Phase 2 Prototype & Governance Console)

The web application served on port `3000` in this workspace hosts the complete **Phase 2 Functional Prototype** (Auth/RBAC, Advertiser Profiles, 10-State Campaigns, Option A/B Ad Creation Studio, 16:9 TV Preview & Break Simulator, Opportunity 3-Tier QA, Admin Moderation & 7-Stage Analytics, Physical Mobile QR Scan Lab & VS Code Handover Package) alongside the **Governance, Research & Copy Report Console**.
