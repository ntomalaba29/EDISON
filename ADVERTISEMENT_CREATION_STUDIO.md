# EDISON — Advertisement Creation Studio & Formats

**Document Status**: Updated Authoritative Specification (`v2.0` — Adds 3 Commercial Formats including Text-Only Commercial Ads & Personalised Charity TV Layouts; preserves Option A & Option B QR Integrity Rules)

---

## 1. Purpose

Enable every business (`COMMERCIAL ADS`) and opportunity provider (`CHARITY ADS`) to submit television-ready creative without barriers. Businesses must **never** be forced to hire designers or produce videos when a simple written commercial advertisement suffices.

---

## 2. Three Supported Commercial Advertisement Formats (`COMMERCIAL ADS`)

Every direct commercial campaign selects one of three supported creative formats (all subject to moderation and approval prior to delivery):

### Format 1 — Image & Banner Advertisements (Option A Guided Studio or Option B Image Upload)
- Static 16:9 banners and product/brand images, advertiser logo, headline, description, promotional pricing, optional contact details, optional QR code and verified destination link.

### Format 2 — Video Advertisements (Option B Video Upload + Server Validation/Transcoding Pipeline)
- Uploaded MP4 (H.264/AAC) or WebM video files meeting resolution (`>= 1280x720`), `16:9` aspect ratio, and duration limits; preloaded before break playback (`P3`/`P5`), optional headlines, descriptions, and destination QR/link.

### Format 3 — Text-Only Commercial Advertisements (`[SPECIFIED / NOT YET IMPLEMENTED]`)
- Lightweight written commercial spot requiring zero image or video assets:
  - **Required**: Advertiser Name, Headline, Written Promotional Message.
  - **Optional**: Contact Information, QR Code or verified Destination Link.
  - Rendered inside a clean, high-contrast, TV-safe 16:9 typographic template respecting `>= 42 px` headlines and `>= 28 px` body scale at 1080p equivalent.

---

## 3. Option A: Guided In-App Creation Studio (Preserved)

1. **Templates**: Commercial Offer, Retail Promo, Product Launch, Brand Spotlight, Event, plus Charity Opportunity Layouts (Job Vacancy Formal/Informal, Scholarship/Admissions, Apprenticeship/Training, Conference/Community).
2. **Assets & Fields**: Logo/product/background uploads with contrast scrim, heading, description, badge, price/salary/funding, contacts, website, CTA, QR code & safe placement (`bottom_right`, `bottom_left`, `sidebar_right`).
3. **Typography & Safe-Zone Checks**: Contrast warnings (`>= 7:1` around QR) and 90% TV title-safe boundary warnings.

---

## 4. Option B: External Advertisement Upload & QR Integrity Policy (Preserved)

- **Media Checks**: Magic-byte validation (`PNG`, `JPEG`, `WebP`, `MP4`, `WebM`; SVG/HTML XSS blocked on uploads), file-size cap, `16:9` validation, duration (`5s–60s`) & audio stream checks.
- **QR Code Non-Overwrite Rule**:
  1. Scan uploaded image/frames for existing QR.
  2. **None Found**: Generate & overlay verified EDISON QR (with user confirmation).
  3. **Decoded Match**: Allow submission linked to verified token.
  4. **Decoded Mismatch**: Warn & **block** submission until resolved.
  5. **Suspected / Unreadable**: **Flag for mandatory Admin Review.**
  6. **Hard Prohibition**: **Never** silently replace an existing QR code.
