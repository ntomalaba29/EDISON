# EDISON — AURA Mobile Companion App Packaging & QR Destination Configuration

**Architecture Boundary (`ADR-017`)**: The mobile phone acts strictly as:
1. A **destination-access device** when scanning TV QR codes (`/r/:token` opens advertiser/opportunity destination in mobile browser—never an intermediate ad screen).
2. An **optional AURA Normal Everyday TV Remote & Household Profile Switcher** paired over local Wi-Fi (`DIAL/mDNS`) with explicit 6-digit PIN / QR consent.

---

## 1. Bundle Identifiers & Deep Links

- **iOS Bundle ID**: `org.edison.aura.mobile` (Minimum iOS 15.0)
- **Android Package**: `org.edison.aura.mobile` (Minimum SDK 26 / Android 8.0)
- **Associated Domains / App Links**:
  - Universal Links: `https://edison-qr.example/r/*` -> Opens destination cleanly if AURA handles scan, or OS native camera opens standard HTTPS `/r/:token` directly without requiring AURA installation.

---

## 2. Declared Permissions (Zero Surreptitious Tracking)

- **Android (`AndroidManifest.xml`)**:
  - `android.permission.INTERNET`
  - `android.permission.ACCESS_WIFI_STATE` / `CHANGE_WIFI_MULTICAST_STATE` (mDNS/DIAL discovery)
  - `android.permission.CAMERA` (ONLY invoked interactively when user taps "Scan Pairing QR")
- **iOS (`Info.plist`)**:
  - `NSLocalNetworkUsageDescription`: *"Discover your household Smart TV on the local Wi-Fi network for AURA remote control."*
  - `NSBonjourServices`: `["_edison-aura._tcp", "_dial._tcp"]`
  - `NSCameraUsageDescription`: *"Scan Smart TV pairing QR codes."*
- **Hard Privacy Exclusion**: Zero background microphone permission, zero contact-list permission, zero cross-app advertising ID (`IDFA`/`AAID`) harvesting.
