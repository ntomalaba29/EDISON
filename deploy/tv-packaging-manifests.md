# EDISON — Smart TV Platform Packaging Manifests & Partner Submission Matrix

**Hardware Verification Status**: `hardwareTested: false` · All OS packaging configurations below are software blueprints prepared for **Stage P6** and OEM Partner Submission (`ADR-001`, `ADR-005`, `ADR-017`). Never sideload unverified signal-hijacking hooks or claim store approval until physical OEM certification passes.

---

## 1. Android TV / Google TV (`TvInputService` / TIF `.apk` / `.aab`)

- **Application ID**: `org.edison.tv.companion`
- **Minimum SDK**: Android 11 (API 30) TV (`android.software.leanback` required)
- **Permitted Capabilities**:
  - `android.permission.INTERNET`
  - `android.permission.ACCESS_NETWORK_STATE`
  - `TvInputService` (`android.media.tv.TvInputService`) within **EDISON-owned linear/companion channel session**
- **Explicitly Prohibited / Excluded**:
  - Zero `READ_EPG_DATA` silent scraping outside permitted TIF APIs
  - Zero background `SYSTEM_ALERT_WINDOW` overlays across third-party apps
  - Zero HDCP/DRM frame capture
- **Fail-Safe Hardware Trigger**: `KeyEvent.KEYCODE_BACK`, `KEYCODE_HOME`, and `KEYCODE_TV` dispatch immediate `<500ms` abort to live tuner via `EdisonWatchdogTimer`.

---

## 2. Samsung Tizen Smart TV (`tizen-tv` `.wgt`)

- **Package ID**: `EDISONTv01`
- **Required Profile**: `tv-samsung-public` (Tizen 6.5+)
- **Declared Privileges**:
  - `http://tizen.org/privilege/internet`
  - `http://tizen.org/privilege/tv.window` (permitted PIP / companion surface)
  - `http://tizen.org/privilege/tv.inputdevice` (normal AURA key registration)
- **Strict Media Codec Constraint**:
  - `WebM/VP9` **EXCLUDED** on Samsung Tizen (`broadcastRenderEngine` transcodes WebM uploads to `H.264 High@L4.1 MP4` + `AAC-LC -23 LUFS` via `FfmpegMediaWorker`).
- **Explicitly Prohibited**: Background persistent web-app resident monitors violating Samsung Seller Office review guidelines.

---

## 3. LG webOS Smart TV (`.ipk`)

- **App ID**: `org.edison.webos.tv`
- **Target OS**: webOS TV 6.0+ / webOS 22–24
- **Declared Luna Services**:
  - `luna://com.webos.service.tv.display` (scoped session only)
  - `luna://com.webos.service.audio` (conventional AURA volume control)
- **Lifecycle Constraint**: Handle `webOSLaunch` and `webOSRelaunch`; save state cleanly and release tuner surface within `300ms` on blur/suspend (`ADR-005`).

---

## 4. External HDMI-CEC / Companion STB Option (`Arch C`)

- **CEC Logical Addresses**: Playback Device (`0x04` / `0x08`) ONLY — never masquerade as TV (`0x00`) or Audio System (`0x05`) unlawfully.
- **HDCP Gate**: Must query live HDCP 2.2/2.3 authentication status and immediately return/passthrough if HDCP state degrades (`ADR-005`).
