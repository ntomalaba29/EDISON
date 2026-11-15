# EDISON — Television Preview Experience

**Document Status**: Updated Phase 1/2 Specification (Software-First Preview & Break Simulation Engine)

---

## 1. Core 16:9 Television Preview

The preview is a first-class verification engine, never a decorative static thumbnail.
- **Aspect & Framing**: Realistic `16:9` television frame (scaled cleanly to viewport with optional TV-safe-zone guide toggle and Fullscreen mode).
- **Fidelity**: Renders the exact actual campaign composition—actual uploaded logo, images, video playback, written Text-Only commercial layout, colors, text, QR code, QR placement, media dimensions, and exact configured duration.
- **Media Behaviour**:
  - Video ads play the actual uploaded video with audio/time sync.
  - Image/Studio & Text-Only ads display for the exact configured duration (`T_ad_duration`) with live countdown progress.
- **Interactive Controls**:
  - Play / Pause / Restart / Fullscreen
  - Live Duration Display (`elapsed / total`)
  - **Test QR Destination** button (verifies redirect target & shows resolved URL) + **Physically Scannable QR Code** rendered crisply inside the 16:9 frame
  - **Return to Editor** button
  - Layout selector (where switching templates/layouts is applicable)

---

## 2. Opportunity Preview Layouts

Category-appropriate TV layouts must clearly render:
- Opportunity Title & Category
- Employer or Provider Name + Verification Tier Label (`Identity Verified` / `Organisation Verified` / `Specific Opportunity Verified`)
- Position or Programme Name
- Location & Closing Date
- Key Eligibility Requirements
- Clear Application Instructions & Contact Information
- Physically Scannable QR Code + Honest Non-Guarantee Disclaimer ("Opportunity verification confirms legitimacy checks; EDISON does not guarantee employment, funding, or acceptance.")
- **Pending Consent Decision Notice (`DEC-OPEN-01`)**: Any named TV greeting (`"Malaba, this is for you!"`) vs pure neutral contextual copy depends on Owner resolution of `DEC-OPEN-01`; TV screens must never display qualifications, work history, or private contacts regardless of which option is approved.

---

## 3. Commercial-Break Simulator (`SimulationTvAdapter` — Software-First Testing Boundary)

A dedicated, isolated experience demonstrating the target end-to-end viewer journey during software development (replacing repeated physical TV testing prior to `Stage P6`):
1. Simulated live television channel stream / recorded test fixture (clearly labelled **`SIMULATION — NOT LIVE BROADCAST TUNER`**).
2. Simulated commercial-break trigger & countdown.
3. Smooth transition to the actual EDISON advertisement(s) + scannable QR code (`CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL` planned for target multi-slot simulator).
4. Simulated mobile-phone destination preview panel alongside real physical phone scannability.
5. Automatic return at end of ad OR immediate **Manual Return** back to the simulated TV channel at the live simulated timestamp (not paused at the entry point).
6. Controls: **Start**, **Pause**, **Skip**, **Manual Return**.
7. **Honesty Boundary**: Passing simulator checks proves software composition, UI readability, and scheduling math only; it never substitutes for the single final physical Smart TV integration check (`Stage P6`).

---

## 4. Final Campaign Approval Preview Gate

Before an advertiser can submit a campaign (and inside the Admin Review Queue before approval):
- Displays full playable 16:9 advertisement + live QR destination test.
- Runs pre-submit checklist:
  - Final appearance & TV readability check
  - Duration & media compatibility (Image/Banner, Video, Text-Only)
  - QR position & resolved destination verification
  - Content category classification (`CHARITY ADS` vs `COMMERCIAL ADS`)
  - Missing fields, warnings, and blocking validation errors
- **Hard Governance Rule**: Administrators must never approve a campaign based solely on a filename or thumbnail.
