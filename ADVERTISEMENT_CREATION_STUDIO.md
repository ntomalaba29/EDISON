# EDISON — Advertisement Creation Studio

**Document Status**: Phase 1 Specification

---

## 1. Purpose

Enable any business or opportunity provider—even with zero graphic-design experience—to produce television-legible, 16:9 QR-enabled advertisements (Option A), or upload externally produced image/video ads with strict validation and QR integrity verification (Option B).

---

## 2. Option A: Guided In-App Creation Studio

### 2.1 Non-Designer Workflow
1. **Select Purpose & Template**: Commercial Offer, Retail Promo, Product Launch, Brand Spotlight, Event, or Opportunity Layouts (Job Vacancy, Scholarship/Training, Grant/Tender). Never start users solely on an empty blank canvas.
2. **Configure Brand & Media Assets**: Upload Logo, Product Photo(s), and optional Background Image (with contrast scrim controls so text remains readable).
3. **Structured Content Fields**:
   - Heading / Main Title
   - Description / Supporting Copy
   - Promotional Text / Badge Text (clean typography)
   - Price / Offer / Salary / Funding Value
   - Contact Details (Phone, Email, Location)
   - Website Address
   - Call to Action (e.g., "Scan to Apply", "Scan to Shop")
   - QR Destination & QR Placement Corner (Bottom-Right, Bottom-Left, Dedicated Sidebar Panel)
4. **Visual Customisation & Layout Manipulation**:
   - Change background color/gradient/image, brand accent color, typography color.
   - Edit text inline, resize elements, reposition elements within TV safe zones, reorder layer stacking (`Bring Forward` / `Send Backward`).
   - Enforce contrast & TV-safe-zone warnings if text/QR gets placed too close to screen edges or below legible TV font sizes.

---

## 3. Option B: External Advertisement Upload & Inspection

### 3.1 Automated Validation Pipeline
- **Supported Media**: Images (PNG, JPG, WebP) and Video (MP4/WebM).
- **Checks**:
  - File type & magic-byte validation
  - File size cap check
  - Pixel resolution (`>= 1280x720`) & 16:9 aspect ratio check
  - Video duration bounds (`5s–60s`) & audio stream/compatibility check
  - Content restriction attestation & metadata check

### 3.2 QR Code Integrity Policy (Critical Safety Rule)
1. **Scan Uploaded Asset for Existing QR**: Run client/server QR detection on uploaded image or sampled video frames.
2. **Case 1 — No QR Code Found**: EDISON generates a verified QR code from the advertiser's configured destination and positions it in a TV-safe overlay zone (with advertiser confirmation in preview).
3. **Case 2 — Valid QR Code Found & Decoded**: Compare decoded QR payload against the advertiser's configured destination. If mismatched, warn advertiser and block submission until resolved.
4. **Case 3 — QR Detected or Suspected, Cannot Reliably Decode**: **Flag for mandatory Admin Review.**
5. **Hard Prohibition**: **Never** silently paste a new QR code over or replace an existing QR code with an unverified destination.
