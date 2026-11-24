# EDISON — Product Requirements Document (PRD)

**Document Status**: Reconciled Authoritative PRD (`v2.3` — implementation status is prototype-only unless explicitly stated; current subphase/evidence authority is [`EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md`](EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md))

---

## 1. User Personas

1. **Paid Message Submitter**: Businesses, brands, shops, supermarkets, restaurants, manufacturers, service providers, event organizers, or individuals submitting lawful, policy-compliant paid messages (including promotions, events, and personal greetings) in supported Image/Banner, Video, or Text-Only formats with geographic targeting.
2. **Charity / Opportunity Provider**: Registered employers, informal/individual hirers (free employer job listings), schools, universities, scholarship bodies, training programmes, conference organisers, and community/public-benefit programmes posting free verified `CHARITY ADS`.
3. **Journalist / Publisher**: Registers for a planned monthly subscription and submits breaking news for a relevant upcoming commercial break; subscription price and editorial operating rules are TBD.
4. **EDISON Administrator / Moderator**: Audits commercial ads (all formats), performs non-transitive 3-tier Charity verification, handles complaints/suspensions/appeals, monitors Shared Intelligence reliability/rollbacks, and oversees country & network policies.
5. **Television Viewer / Household**: Watches ordinary television unaffected by EDISON failures; interacts directly via QR codes (`ADR-002`). The `DEC-OPEN-01` household model is implemented in Track B; production deployment and real-TV display remain incomplete.

---

## 2. Functional Requirements Matrix

| ID | Domain | Requirement Summary | Code & Governance Status |
| :--- | :--- | :--- | :--- |
| `PRD-01` | Ad Studio (Option A) | Guided 16:9 creation studio with templates, assets, safe zones, contrast checks & QR placement. | Implemented (Block 2.3) |
| `PRD-02` | Ad Upload (Option B) | Image/video upload validation, magic-byte security, jsQR verification, non-overwrite QR rule. | Implemented and locally tested; FFmpeg worker exists, production pipeline is tracked separately |
| `PRD-03` | 16:9 TV Preview | Realistic 16:9 playback (video & timed images), QR scan check, controls, pre-submit gate. | Software preview/simulator implemented; no physical-TV verification |
| `PRD-04` | Break Simulator | Labelled simulator demonstrating live TV -> break -> EDISON ad -> phone scan -> TV return. | Alternating scheduler/simulator implemented and locally tested; not a live tuner |
| `PRD-05` | Pre-Submit Gate | Playable preview validation & blocking errors before submission or admin approval. | Implemented (Block 2.4/2.6) |
| `PRD-06` | Advertiser Portal | Auth/RBAC, profiles, 10-state campaigns, cloning, scheduling, tickets, simulated estimate. | Implemented (Block 2.1–2.2; `$0` Charity lock unblocked post-commit) |
| `PRD-07` | Opportunity System | Opportunity intake, non-transitive 3-tier verification, expiry, complaints & appeals. | Implemented (Block 2.5; `$0` free employer job lock unblocked post-commit) |
| `PRD-08` | QR Code System | Validated QR routing (`/r/:token` `302`), anti-phishing checks, direct-to-destination handoff (`ADR-002`). | Implemented; Track B epoch-`403` withdrawal behavior is also implemented |
| `PRD-09` | Analytics | Multi-stage funnel distinguishing measured events, anti-bot/dedup. | Implemented (7 stages in Block 2.6; 10 events + 7-stream revenue separation unblocked) |
| `PRD-10` | Consent Architecture | Household vs Individual Personalisation Consent & post-withdrawal QR behavior. | **`DEC-OPEN-01` RESOLVED; prototype tested; production legal/privacy review remains separate** |
| `PRD-11` | Smart TV Client | Permitted TV playback adapter (Android TV first; modular webOS/Tizen), watchdog, manual Return-to-TV. | Software harness/simulator implemented; native transports and physical compatibility remain unverified until the single final `Stage P6` test |
| `PRD-12` | Governance & Copy | Live reports, Copy Report / Commit & Next shortcuts, Command Centre coordination. | Implemented (Active) |
| `PRD-13` | Two Ad Categories & 3 Commercial Formats | Strictly two categories (`CHARITY ADS` `$0` free; `COMMERCIAL ADS` paid) supporting Image/Banner, Video, and simple written Text-Only paid messages. Paid content can include promotions, events, and personal greetings; campaign targeting can use selected geographic areas. All paid content remains subject to applicable law, content policy, moderation, and privacy controls. | **Implemented & Tested; production ad delivery and full geo-targeting remain separate** |
| `PRD-14` | Alternating 4-Slot Break Scheduler | Mandatory `CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL` alternation (max 4 ads); adapts to break duration (`4 / 2 / 1 / 0`); never back-to-back same category; never interrupts live TV. | **SIMULATOR IMPLEMENTED & TESTED; `DEC-OPEN-02` remains unresolved; no live TV switching** |
| `PRD-15` | Direct Priority & Modular Ad Network | Priority 1: Direct-Paid EDISON ads; Priority 2: Eligible CTV Ad-Network fill behind `AdNetworkAdapter` (`GAM CTV Account & Non-Video Format Support UNRESOLVED DEC-OPEN-03`). | **Priority policy/mock adapter implemented; live GAM/SSP provider blocked on `DEC-OPEN-03`** |
| `PRD-16` | Multi-Profile Household & Matching | Multiple optional individual profiles under one TV; Required/Preferred/Optional matcher. | **Track B implemented; no production household service** |
| `PRD-17` | Personalised TV Messages & Safe Mobile Card | Optional named TV greetings & isolated mobile Opportunity Card (`Save`/`Dismiss`). | **Track B implemented; real TV display remains unverified** |
| `PRD-18` | 7-Level Household Geo Storage | Private `Country -> ... -> Exact Installation Location` storage (never exposed to advertisers). | **Track B implemented; privacy protections remain mandatory** |
| `PRD-19` | **Network-Wide Shared Ad Intelligence** | **Mandatory Core Capability (`v2.2`)**: Participating TVs share corroborated, scoped (`country/broadcaster/channel/platform/config`), privacy-stripped break-detection observations via a Central Shared Intelligence Service and maintain a versioned **Local Intelligence Cache** supporting background sync, offline fallback, minimum-corroboration trust gating, anti-poisoning validation, and automatic/manual rollback without interrupting viewing (`LEARN ONCE. DISTRIBUTE EVERYWHERE. UPDATE CONTINUOUSLY.`). | **SOFTWARE SIMULATION IMPLEMENTED & TESTED; production fleet deployment, durable storage, and real-device participation NOT COMPLETE** |
| `PRD-20` | **Normal Everyday TV Remote Control** | **First-Class Core Capability**: Dispatches conventional everyday remote commands (power, volume up/down, mute, channel up/down, source/input select, D-pad/OK navigation, back, home) via **`AURA → EDISON Control Engine → platform adapters → TV`**, strictly separated from intelligent commercial-break switching and programme restoration. Zero physical hardware compatibility claimed prior to testing. | **SIMULATOR IMPLEMENTED & TESTED; real TV transports NOT IMPLEMENTED; hardware unverified until single `Stage P6` test** |
| `PRD-21` | **Journalist / Publisher Breaking News** | Journalists/publishers register for a planned monthly subscription and submit breaking news targeted to a relevant area. After the applicable publication checks, an eligible item is intended for the next relevant commercial break. Label editorial versus sponsored content and provide expiry, correction, and retraction handling. Subscription price is TBD; payment must not itself prove a claim or bypass publication checks. | **OWNER-APPROVED PRODUCT SCOPE; NOT IMPLEMENTED; verification, moderation, inventory priority, subscription terms, and pricing require detailed design** |

### PRD-21 implementation decisions still required

The owner approved the journalist/publisher feature concept on 2026-11-18. Before implementation, define publisher identity/affiliation review, evidence/source requirements, rapid moderation, corrections/retractions, expiry, household opt-in, geographic relevance, how news competes with paid/charity inventory, and whether a subscription buys publishing access/tools or any separately labelled sponsored placement. No price or slot guarantee has been decided.
