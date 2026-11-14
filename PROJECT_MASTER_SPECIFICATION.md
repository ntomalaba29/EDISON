# EDISON — Project Master Specification

**Document Status**: Phase 1 Baseline Specification (`v1.0-phase1`)  
**Evidence Standard**: `[VERIFIED]`, `[PRELIMINARY RESEARCH]`, `[ASSUMPTION]`, `[UNRESOLVED QUESTION]`

---

## 1. Executive Definition

EDISON is an international Smart TV advertising and verified opportunity network. Its purpose is to bridge linear television viewing with immediate, frictionless mobile action via scannable QR codes—without turning the viewer's mobile phone into an intrusive secondary ad network and without disrupting ordinary television viewing.

### Non-Negotiable Product Principles
1. **Television First (Fail-Safe)**: Ordinary television viewing must never be degraded, hijacked, or left stuck on an ad screen if EDISON fails. When uncertain, EDISON skips the ad opportunity.
2. **Direct-to-Destination QR Routing**: Scanning an EDISON QR code takes the viewer directly to the advertiser's or opportunity provider's intended destination (optionally through a fast, validated EDISON tracking redirect). No intermediate EDISON ad pages.
3. **Zero Viewer Cost for Opportunities**: Viewers must never be charged to scan QR codes or access employment, scholarship, training, grant, or tender opportunities.
4. **Independence of Opportunity Verification**: Paid advertising fees must **never** influence whether an employment or opportunity listing is classified as verified or genuine.
5. **No Unlawful Broadcaster Modification**: EDISON must never modify, cover, crop, intercept, or rebroadcast broadcaster content or broadcaster advertisements, nor circumvent DRM or HDCP.
6. **Honest Measurement & Consent**: TV uptime is not proof of human attention; a QR scan is not proof of a purchase or job application. Viewer consent must be informed, specific, and withdrawable.

---

## 2. System Scope & Dual Content Architecture

### 2.1 Commercial Advertising Pillar
Supports legitimate businesses and organisations running campaigns for:
- Products, services, retail promotions, special offers
- Brand awareness, events, product launches, online stores, business announcements

### 2.2 Employment & Legitimate Opportunities Pillar
Supports formal organisations and individual/informal employers publishing:
- Employment (permanent, temporary, part-time, contract)
- Internships, apprenticeships, scholarships, education opportunities, training programmes
- Grants, tenders, business opportunities, workshops, and seminars

Mandatory 3-tier verification model:
1. **Identity Verified**: Submitter identity (individual or authorised representative) checked.
2. **Organisation Verified**: Legal/operational existence of the organisation checked (where applicable; informal employers are not automatically excluded).
3. **Specific Opportunity Verified**: Evidence confirms the specific vacancy, scholarship, grant, or tender actually exists and is currently open.

---

## 3. High-Level Architectural Domains

1. **Creator & Advertiser Web Portal** (Phase 2 Prototype -> Phase 7/8 Production)
   - Advertiser onboarding, campaign management, Option A Ad Studio, Option B Upload & QR Inspector, 16:9 TV Preview, Commercial-Break Simulator, Analytics.
2. **Opportunity & Moderation Platform** (Phase 2 Prototype -> Phase 9 Production)
   - Dedicated submission workflow, evidence capture, 3-tier verification queue, expiry automation, viewer complaint/investigation/appeal system.
3. **QR Redirect & Verification Engine** (Phase 2 Prototype -> Phase 6 Production)
   - Cryptographically signed or tokenised short-links, strict URL/scheme validation (`https:`, `tel:`, `wa.me`), anti-phishing checks, deduplicated scan telemetry.
4. **Measurement & Analytics Pipeline** (Phase 2 Prototype -> Phase 6 Production)
   - Strictly separates 7 funnel stages (Requested -> Delivered -> Played -> Technically Viewable -> QR Scanned -> Destination Opened -> Independently Verified Conversion) and clearly separates `[SIMULATED]` from `[REAL MEASURED]` data.
5. **Smart TV Client & Break-Detection Adapter Layer** (Phase 4/5 Research -> Phase 12 Pilot)
   - Platform-specific adapters (Android TV TIF / OEM Partnerships / External HDMI/STB / HbbTV-ATSC 3.0) behind a strict capability and safety-buffer gate.

---

## 4. Safe Playback Condition (Smart TV Target Formula)

Before EDISON switches or displays any advertisement during a detected or predicted break, the runtime must evaluate:

$$\text{Playable} \iff T_{\text{break\_remaining}} \ge T_{\text{ad\_duration}} + T_{\text{switch\_in}} + T_{\text{switch\_out}} + T_{\text{safety\_buffer}}$$

- **`T_break_remaining`**: Conservatively estimated remaining commercial break duration.
- **`T_ad_duration`**: Exact duration of the preloaded advertisement (e.g., 15s, 30s).
- **`T_switch_in`**: Measured or worst-case latency to transition TV display to EDISON.
- **`T_switch_out`**: Measured or worst-case latency to return TV display to live broadcast.
- **`T_safety_buffer`**: Mandatory margin (e.g., $\ge 5\text{s}$ initial conservative baseline `[ASSUMPTION]`) so viewers never miss the resumption of their TV programme.

If `Playable` is `false` or confidence is below threshold, EDISON **must skip** the break.

---

## 5. Unresolved Strategic & Legal Questions

- `[UNRESOLVED QUESTION]`: Which target markets will be prioritized for Phase 12 controlled pilot and Phase 14 first commercial launch?
- `[UNRESOLVED QUESTION]`: Will initial hardware rollout rely on (a) an Android TV operator/TIF channel partnership, (b) OEM partnership (Samsung/LG), or (c) an external HDMI/STB companion device? (See `SMART_TV_COMPATIBILITY_RESEARCH.md`.)
- `[UNRESOLVED QUESTION]`: In jurisdictions such as the EU/UK (GDPR/ePrivacy), is conditioning access to free employment opportunities on advertising consent lawful, or must non-personalised contextual opportunity delivery remain available without ad-tracking consent? (See `PRIVACY_SECURITY_AND_COMPLIANCE.md`.)
