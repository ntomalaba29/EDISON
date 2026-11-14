# EDISON — Technical Requirements

**Document Status**: Phase 1 Technical Baseline

---

## 1. Media & Television Viewing Standards

### 1.1 Supported Formats (Phase 2 Prototype -> Phase 8 Production)
- **Aspect Ratio**: Strict `16:9` landscape (`1.777:1`, tolerance `±1%`) for TV canvas and uploaded video/images. Non-16:9 uploads must trigger validation error or guided crop/letterbox warning before submission.
- **Resolution**:
  - Minimum acceptable: `1280 x 720` (720p HD).
  - Recommended baseline: `1920 x 1080` (1080p Full HD).
  - Future production target: `3840 x 2160` (4K UHD).
- **Image Formats**: PNG, JPEG, WebP (prototype max upload size e.g. `10 MB`; SVG allowed for crisp advertiser logos inside Option A Studio after SVG XSS sanitisation).
- **Video Formats**: MP4 (H.264 / AVC + AAC audio), WebM (VP9/Opus for web preview compatibility). Prototype size limit e.g. `50 MB`.
- **Duration**: Configurable per campaign (`5s` to `60s`; standard slots `15s`, `30s`).
- **Television Safe Zones**:
  - Action Safe: inner `93%` width/height (`3.5%` margin).
  - Title & QR Safe: inner `90%` width/height (`5%` margin) so overscan on older TVs never clips QR finder patterns or headline text.
- **Minimum Readability Standards**:
  - QR code rendered size on 1080p TV frame: minimum `220 x 220 px` (recommended `260–320 px`) with `>= 4`-module quiet zone and high contrast (`>= 7:1` foreground/background, no semi-transparent overlays over QR modules).
  - Primary TV headline: equivalent to `>= 42 px` on a `1920 x 1080` canvas; body/offer text `>= 28 px` for 3-metre living-room legibility.

---

## 2. QR & Redirect Technical Requirements

- **Encoding**: QR Code Model 2, Error Correction Level `M` (15%) or `Q` (25%) for living-room viewing angles and camera glare resilience.
- **Payload Length**: Keep encoded redirect URL compact (e.g. `https://<host>/r/<8-char-token>`) so QR module density stays low (Version 2–4, `25x25` to `33x33` modules) for rapid smartphone autofocus from 2–4 metres.
- **Redirect Latency Budget**: `< 150ms` HTTP `302` response from `/r/:token` after token lookup, validation, and non-blocking scan event recording.
- **Security Validation**: Strict allowlist of URL schemes (`https:`, `tel:`, `mailto:` if approved; `wa.me` normalised to `https://wa.me/<e164>`). Reject `javascript:`, `data:`, `file:`, raw IP literals, known malicious domains, and open-redirect query tampering.

---

## 3. Input Validation & Security Controls

- **SVG Sanitisation**: Strip `<script>`, event handlers (`onload`, `onerror`), external `<use>` / `<foreignObject>` from uploaded SVG logos.
- **MIME & Magic-Byte Verification**: Server-side inspection of uploaded files rather than trusting filename extensions alone.
- **CSRF / Auth / RBAC**: Strict role isolation (`advertiser`, `opportunity_submitter`, `admin_moderator`). Admin endpoints must reject non-admin callers.
- **Rate Limiting & Anti-Spam**: Throttle QR redirect scanning bursts from identical IP/User-Agent pairs to prevent analytics inflation while never blocking legitimate household scans.

---

## 4. Latency & Reliability Budgets (Target Smart TV Runtime)

- **Preload Lead Time**: Creative + QR asset cached locally before break transition (`>= 10s` before predicted break when predictive mode is active).
- **Watchdog Timer**: Independent hardware/OS-agnostic timer forcing return to live TV at `T_ad_duration + 2s` maximum if playback stalls or callbacks fail.
- **Graceful Degradation**: Any network timeout, media decode error, or confidence drop aborts the EDISON break and leaves ordinary TV untouched.
