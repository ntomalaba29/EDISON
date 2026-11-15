# EDISON — Project Master Specification

**Document Status**: Reconciled Authoritative Specification (`v2.2` — Incorporates `v2.1` Corrections + `v2.2` Mandatory Network-Wide Shared Ad Intelligence Capability; Distinguishes Approved Rules from `[UNRESOLVED OWNER DECISIONS]` & `[IMPLEMENTATION NOT STARTED]`)  
**Evidence Standard**: `[VERIFIED]`, `[VERIFIED FROM OFFICIAL GOOGLE DOCS]`, `[UNVERIFIED / UNRESOLVED]`, `[INACCESSIBLE / UNVERIFIED]`, `[DEFERRED]`

---

## 1. Executive Definition & Non-Negotiable Principles

EDISON is an international Smart TV advertising and verified opportunity network connecting television audiences with legitimate `CHARITY ADS` opportunities and `COMMERCIAL ADS` via scannable QR codes—without creating an intrusive mobile ad feed or disrupting ordinary television viewing.

1. **Television First (Fail-Safe, `ADR-005`)**: Ordinary TV must never break, stall, or miss programme resumption if EDISON fails. Uncertain or under-budgeted breaks are skipped.
2. **Direct-to-Destination Routing (`ADR-002`)**: Commercial QR scans route cleanly to the advertiser's destination via `HTTP 302`—never an intermediate EDISON mobile ad screen. *(How consent withdrawal / multi-profile opportunity views interact with `/r/:token` is captured in Unresolved Owner Decision `DEC-OPEN-01`.)*
3. **Zero Cost for Charity Opportunities & Job Listings**: Employers, individual hirers, educational bodies, community programmes, and viewers **never** pay to submit, verify, broadcast, scan, or apply for legitimate `CHARITY ADS` (including free employer job listings). Buying commercial ads is never required.
4. **Independence of Verification (`ADR-003`)**: Three verification tiers (`Identity`, `Organisation`, `Specific Opportunity`) are strictly non-transitive and completely independent of advertising payments.
5. **No Unlawful Broadcaster Modification (`ADR-001`)**: Never modify, cover, crop, intercept, or rebroadcast broadcaster streams, nor bypass DRM or HDCP.
6. **Network-Wide Shared Ad Intelligence (`ADR-016`, `v2.2` Core Requirement — `NOT STARTED`)**: Participating TVs collectively improve commercial-break detection (`LEARN ONCE. DISTRIBUTE EVERYWHERE. UPDATE CONTINUOUSLY.`) via a Central Shared Intelligence Service & Local Intelligence Cache with multi-TV corroboration, strict compatibility scoping, offline operation, rollback protection, and zero viewer PII.
7. **Software-First Testing + Single Final Physical Test (`ADR-014`)**: Development testing uses automated tests, browser automation, recorded media, and `SimulationTvAdapter`—with zero repeated physical TV tests during development and **strictly one planned final integrated physical test at app completion (`Stage P6`)**.
8. **Independent Public Legal Research (`ADR-015`, No Legal Counsel Dependency)**: Applicable country laws are researched independently from official public legislation/regulator sources without external lawyers as a development gate; technical controls never claim legal compliance (`ZERO LEGAL COMPLIANCE CLAIMED`).
9. **Locked Out-of-Scope Boundaries**: Commercial business discovery and automated email outreach remain **STRICTLY PAUSED AND LOCKED**. AURA remains **DEFERRED**.

---

## 2. Approved Advertising Categories & Priority Rules

### 2.1 Category 1 — `CHARITY ADS` (`$0.00 / FREE` Permanent Rule)
- Covers **free employer job listings** (formal & verified informal roles such as domestic help, drivers, trades, artisans), internships, apprenticeships, scholarships, school/university admissions, training, professional development, conferences, educational events, community development, grants, tenders, and approved public-benefit programmes.
- Strictly `$0.00 / FREE`; subject to submitter identity verification, independent 3-tier verification, closing-date expiry, complaints/appeals, and strict ban on upfront-fee job scams or guaranteed employment claims.

### 2.2 Category 2 — `COMMERCIAL ADS` (Direct-Paid Priority + Modular Network Backfill)
- Paid promotional spots from businesses, brands, shops, supermarkets, restaurants, manufacturers, service providers, and commercial events.
- **Three Supported Formats**:
  1. **Image & Banner Advertisements** (16:9 graphics/logos/promos)
  2. **Video Advertisements** (16:9 MP4/WebM)
  3. **Text-Only Advertisements** (`Advertiser Name`, `Headline`, written `Message`, optional contact/QR — ensuring SMBs never need video or graphic production)
- **Inventory Priority Rule**:
  - **Priority 1 — Direct-Paid EDISON Commercial Campaigns**: Always evaluated and served first when approved, scheduled, matching geography/format, and within caps.
  - **Priority 2 — Modular Advertising-Network Backfill**: Eligible CTV ad-network inventory fills unused commercial slots (`Position 2` / `Position 4`) **only** when zero Direct-Paid campaigns match—never displacing Direct-Paid campaigns for higher estimated eCPM and never occupying Charity slots.
- **Google AdSense / GAM Research & Unresolved Uncertainty**:
  - `[VERIFIED FROM OFFICIAL GOOGLE DOCS]`: Standard web **Google AdSense** (`AdSense for Content`) and **AdSense for Video (AFV)** are designed for web/mobile video sites and are not valid native Smart TV app SDKs. Compliant Google CTV fill requires **Google Ad Manager (GAM)** + **Google IMA SDK** (`Android TV` native; `Tizen/webOS` HTML5/DAI).
  - **`[UNRESOLVED — GAM CTV ACCOUNT & FORMAT SUPPORT]`**: EDISON does not yet have an approved GAM CTV publisher account, and official CTV VAST player specifications indicate companion HTML/display banners are generally ignored and native text-only third-party network display units are largely unsupported on standard CTV video players. Whether third-party network backfill is limited strictly to VAST video or can fill static/text slots remains **`UNRESOLVED`**.

---

## 3. Mandatory Alternating Break Sequence

During every eligible break, EDISON schedules up to 4 advertisements in strict alternation:
`Slot 1: CHARITY -> Slot 2: COMMERCIAL -> Slot 3: CHARITY -> Slot 4: COMMERCIAL`

$$\text{Playable} \iff \text{AssetPreloaded} \land \left(T_{\text{break\_remaining}} \ge \sum T_{\text{ad}} + T_{\text{switch\_in}} + T_{\text{switch\_out}} + T_{\text{safety\_buffer}}\right)$$

Adapts cleanly (`4 -> 2 -> 1 -> 0`) without consecutive same-category stacking (`[OPEN SUB-DETAIL DEC-OPEN-02: Single-slot k=1 pointer vs pair-only scheduling]`).

---

## 4. Pending Multi-Profile, 7-Level Geo & Dual-Consent Conflict (`DEC-OPEN-01 — BLOCKED PENDING OWNER APPROVAL`)

Blueprint `v2.0` proposed household TV installations (`Country -> Province/Region -> Metro -> City/Town -> District -> Suburb -> Exact Installation Location`), multiple voluntary individual profiles per TV, named TV greetings (`"Malaba, this is for you!"`), and `ConsentEpoch` `HTTP 403` QR revocation. Because this conflicts with the Phase 1/2 **account-free / static `ADR-002` `HTTP 302` baseline**, competing Options A, B, and C are documented in `PRIVACY_SECURITY_AND_COMPLIANCE.md` as **`DEC-OPEN-01 [UNRESOLVED OWNER DECISION]`**.

**Do not implement household accounts, individual TV profiles, consent epochs, or `HTTP 403` QR enforcement until `DEC-OPEN-01` is resolved.**

---

## 5. Network-Wide Shared Ad Intelligence (`v2.2` Approved Core Requirement — `NOT STARTED`)

- **Principle**: `LEARN ONCE. DISTRIBUTE EVERYWHERE. UPDATE CONTINUOUSLY.`
- **Central Shared Intelligence Service**: Receives authenticated technical observations from participating TVs, validates schemas & channel identity, detects conflicts/spam, requires multi-TV corroboration before trust promotion (**never trusting a single TV automatically**), computes confidence scores, maintains versioned intelligence records, distributes signed compatible updates, and tracks freshness/reliability.
- **Local TV Intelligence & Cache**: Every compatible TV caches intelligence filtered strictly by `(country, broadcaster, channel, platform, broadcastConfig)`, runs offline autonomously, queues new observations until reconnect, applies validated updates silently without interrupting viewing, and rolls back cleanly if accuracy degrades or checksums fail.
- **Privacy Mandate**: Strictly non-PII technical broadcast/detection telemetry only—never household identities, profiles, precise coordinates, personal viewing histories, or private ad/opportunity interactions.
