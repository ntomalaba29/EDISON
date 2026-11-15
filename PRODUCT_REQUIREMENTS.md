# EDISON — Product Requirements Document (PRD)

**Document Status**: Reconciled Authoritative PRD (`v2.2` — Incorporates `v2.1` Pre-Commit Corrections + `v2.2` Approved Network-Wide Shared Ad Intelligence Core Requirement; Consent/Profile Items Tagged `[BLOCKED PENDING DEC-OPEN-01]`)

---

## 1. User Personas

1. **Commercial Advertiser**: Businesses, brands, shops, supermarkets, restaurants, manufacturers, and service providers running paid Image/Banner, Video, or Text-Only advertisements.
2. **Charity / Opportunity Provider**: Registered employers, informal/individual hirers (free employer job listings), schools, universities, scholarship bodies, training programmes, conference organisers, and community/public-benefit programmes posting free verified `CHARITY ADS`.
3. **EDISON Administrator / Moderator**: Audits commercial ads (all formats), performs non-transitive 3-tier Charity verification, handles complaints/suspensions/appeals, monitors Shared Intelligence reliability/rollbacks, and oversees country & network policies.
4. **Television Viewer / Household *(Model Pending `DEC-OPEN-01`)* **: Watches ordinary television unaffected by EDISON failures; interacts directly via QR codes (`ADR-002`). Multi-profile household persona capabilities (`PRD-16`–`PRD-18`) remain **pending owner choice under `DEC-OPEN-01`**.

---

## 2. Functional Requirements Matrix

| ID | Domain | Requirement Summary | Code & Governance Status |
| :--- | :--- | :--- | :--- |
| `PRD-01` | Ad Studio (Option A) | Guided 16:9 creation studio with templates, assets, safe zones, contrast checks & QR placement. | Implemented (Block 2.3) |
| `PRD-02` | Ad Upload (Option B) | Image/video upload validation, magic-byte security, jsQR verification, non-overwrite QR rule. | Implemented (Block 2.3; server `ffprobe`/cleanup queued `P3`) |
| `PRD-03` | 16:9 TV Preview | Realistic 16:9 playback (video & timed images), QR scan check, controls, pre-submit gate. | Implemented (Block 2.4 UI; Text-Only commercial preview queued) |
| `PRD-04` | Break Simulator | Labelled simulator demonstrating live TV -> break -> EDISON ad -> phone scan -> TV return. | Implemented (Single-slot sim in Block 2.4; 4-slot alternating sim queued) |
| `PRD-05` | Pre-Submit Gate | Playable preview validation & blocking errors before submission or admin approval. | Implemented (Block 2.4/2.6) |
| `PRD-06` | Advertiser Portal | Auth/RBAC, profiles, 10-state campaigns, cloning, scheduling, tickets, simulated estimate. | Implemented (Block 2.1–2.2; `$0` Charity lock unblocked post-commit) |
| `PRD-07` | Opportunity System | Opportunity intake, non-transitive 3-tier verification, expiry, complaints & appeals. | Implemented (Block 2.5; `$0` free employer job lock unblocked post-commit) |
| `PRD-08` | QR Code System | Validated QR routing (`/r/:token` `302`), anti-phishing checks, direct-to-destination handoff (`ADR-002`). | Implemented (Block 2.1/2.7; epoch-`403` extension **`BLOCKED DEC-OPEN-01`**) |
| `PRD-09` | Analytics | Multi-stage funnel distinguishing `[SIMULATED]` vs `[REAL MEASURED]`, anti-bot/dedup. | Implemented (7 stages in Block 2.6; 10 events + 7-stream revenue separation unblocked) |
| `PRD-10` | Consent Architecture | Household vs Individual Personalisation Consent & post-withdrawal QR behavior. | **`UNRESOLVED OWNER DECISION DEC-OPEN-01` — DO NOT BUILD UNTIL RESOLVED** |
| `PRD-11` | Smart TV Client | Permitted TV playback adapter (Android TV first; modular webOS/Tizen), watchdog, manual Return-to-TV. | Preliminary Research / Architecture Only (**Single Final `Stage P6` HW Test Only**) |
| `PRD-12` | Governance & Copy | Live reports, Copy Report / Commit & Next shortcuts, Command Centre coordination. | Implemented (Active) |
| `PRD-13` | Two Ad Categories & 3 Commercial Formats | Strictly two categories (`CHARITY ADS` `$0` free; `COMMERCIAL ADS` paid) supporting Image/Banner, Video, AND simple written Text-Only Commercial Ads. | **APPROVED CORE REQ (`UNBLOCKED`) / CODE NOT STARTED** |
| `PRD-14` | Alternating 4-Slot Break Scheduler | Mandatory `CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL` alternation (max 4 ads); adapts to break duration (`4 / 2 / 1 / 0`); never back-to-back same category; never interrupts live TV. | **APPROVED CORE REQ (`UNBLOCKED` core / `DEC-OPEN-02` k=1 detail) / CODE NOT STARTED** |
| `PRD-15` | Direct Priority & Modular Ad Network | Priority 1: Direct-Paid EDISON ads; Priority 2: Eligible CTV Ad-Network fill behind `AdNetworkAdapter` (`GAM CTV Account & Non-Video Format Support UNRESOLVED DEC-OPEN-03`). | **APPROVED POLICY (`DEC-OPEN-03` External Uncertainty) / CODE NOT STARTED** |
| `PRD-16` | Multi-Profile Household & Matching | Multiple optional individual profiles under one TV; Required/Preferred/Optional matcher. | **`BLOCKED — AWAITING DEC-OPEN-01` / NOT STARTED** |
| `PRD-17` | Personalised TV Messages & Safe Mobile Card | Optional named TV greetings & isolated mobile Opportunity Card (`Save`/`Dismiss`). | **`BLOCKED — AWAITING DEC-OPEN-01` / NOT STARTED** |
| `PRD-18` | 7-Level Household Geo Storage | Private `Country -> ... -> Exact Installation Location` storage (never exposed to advertisers). | **`BLOCKED — AWAITING DEC-OPEN-01` / NOT STARTED** (Regional campaign targeting unblocked) |
| `PRD-19` | **Network-Wide Shared Ad Intelligence** | **Mandatory Core Capability (`v2.2`)**: Participating TVs share corroborated, scoped (`country/broadcaster/channel/platform/config`), privacy-stripped break-detection observations via a Central Shared Intelligence Service and maintain a versioned **Local Intelligence Cache** supporting background sync, offline fallback, minimum-corroboration trust gating, anti-poisoning validation, and automatic/manual rollback without interrupting viewing (`LEARN ONCE. DISTRIBUTE EVERYWHERE. UPDATE CONTINUOUSLY.`). | **APPROVED CORE REQUIREMENT (`ADR-016`) / PROTOTYPE SIMULATION PREVIEW ONLY (PHASE 5 SERVICE `NOT STARTED`)** |
| `PRD-20` | **Normal Everyday TV Remote Control** | **First-Class Core Capability**: Dispatches conventional everyday remote commands (power, volume up/down, mute, channel up/down, source/input select, D-pad/OK navigation, back, home) via **`AURA → EDISON Control Engine → platform adapters → TV`**, strictly separated from intelligent commercial-break switching and programme restoration. Zero physical hardware compatibility claimed prior to testing. | **APPROVED CORE REQUIREMENT (`ADR-017`) / IMPLEMENTATION `NOT STARTED`** *(Phase 4 adapters; single `Stage P6` HW test)* |
