# EDISON — Smart TV Compatibility Research

**Verification Standard**: Every technical claim below explicitly distinguishes:
1. **Technically Possible** | 2. **Officially Documented & Supported** | 3. **Permitted by Manufacturer / Platform** | 4. **Tested on Actual Hardware** | 5. **Suitable for Production**

**Notice**: All Smart TV findings are **`[PRELIMINARY RESEARCH — NOT YET TESTED ON ACTUAL HARDWARE]`**. No APIs or permissions have been fabricated. Consistent with `TESTING_STRATEGY.md`, hardware verification is deferred to **one single integrated physical test at the end after application completion (`Stage P6`)** — zero repeated physical TV testing is conducted during development.

---

## 1. Platform Capability & Restriction Analysis

### 1.1 Android TV & Google TV (TV Input Framework — TIF)
- **Framework**: `TvInputService`, `TvInputManager`, `TvContract`, `TvView` (`android.media.tv`).
- **Tuner & Live Channel Access**:
  - `TvInputService` allows an app to act as a virtual or physical TV input source (IPTV, HLS/DASH linear channels, or custom tuner hardware) and publish its own channels via `WRITE_EPG_DATA` + `BIND_TV_INPUT`.
  - **Critical Restriction**: `com.android.providers.tv.permission.READ_EPG_DATA` was deprecated in Android M (API 23) and is **strictly restricted to system/signature apps**. A third-party Play Store app **cannot** read the global EPG or monitor what channel another tuner/HDMI input is playing.
- **Overlay & Window Restrictions**:
  - Inside a `TvInputService.Session` *owned by EDISON*, `setOverlayViewEnabled(true)` and `onCreateOverlayView()` officially allow rendering UI overlays above that session's video surface.
  - **Critical Restriction**: Drawing overlays *on top of other apps or system TV tuners* via `SYSTEM_ALERT_WINDOW` (`TYPE_APPLICATION_OVERLAY`) is heavily restricted/blocked on modern Android TV builds and Google Play TV app policies.
- **App Lifecycle & Source Switching**:
  - Third-party apps cannot hijack `com.android.tv.TvActivity` or arbitrarily switch away from HDMI/broadcast tuners belonging to other system inputs without system-level privileges (`TV_INPUT` / OEM signature).
- **DRM & HDCP**:
  - `MediaDrm` enforces Widevine/HDCP levels (`maxHdcpLevel`, `hdcpLevel`). Protected streams use secure hardware surfaces that prohibit frame capture, scraping, or non-secure compositing.

### 1.2 Samsung Tizen Smart TV
- **Relevant APIs**: `tizen.tvwindow`, `tizen.systeminfo` (`VIDEOSOURCE`), `tizen.application` (`org.tizen.tv-viewer`).
- **Capabilities**: Within a foreground Tizen web app with `tv.window` + `tv.audio` privileges, live TV/HDMI can render inside the app's own window (`tizen.tvwindow.show`) or return via `tizen.application.launch("org.tizen.tv-viewer")`.
- **Critical Restrictions**: Background execution (`background-support="enable"`) is prohibited for UI web apps (2015+ models pause immediately on switching to native TV/HDMI/Home). Partner B2B contracts are required for deep tuner/ACR hooks.

### 1.3 LG webOS Smart TV
- **Relevant APIs**: Luna Service IPC (`luna://com.webos.service.applicationmanager`, `com.webos.service.eim`).
- **Critical Restrictions**: Consumer Content Store web apps cannot invoke restricted system Luna services without LG partner Access Control Groups (ACGs), and unfocused web apps are suspended on blur.

---

## 2. Empirical Audit of Named TV Remote-Control GitHub Candidates (`DEFERRED`)

Full table recorded in `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md`:

| Repository | Existence | Observed Functionality | Licence | Maintenance | EDISON Compatibility & Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`levhakobyan/OpenTV-Remote`** | Verified Exists | Kotlin/Compose (Android) & SwiftUI (iOS) capability-aware LAN remote UI. | **MIT Licence** | Actively maintained | Manual phone remote UI only; **does NOT** provide broadcast break detection or TV-side restoration. |
| **`maxhayim/webmote`** | Verified Exists | Java Android TV/Google TV app + PWA browser remote via PIN pairing & Accessibility/local HTTP. | **MIT Licence** | Actively maintained | Useful Phase 4 study of Android TV PIN pairing & Accessibility constraints; **does NOT** monitor live TV breaks. |
| **`mazen-salah/Smart-TV-Remote-Control`** | Verified Exists | Flutter universal remote targeting Samsung Tizen & LG webOS via UPnP/mDNS/SSDP + Wake-on-LAN. | **MIT Licence** | Actively maintained (`v0.4.1+`) | Useful LAN Tizen/webOS key-injection protocol study only; **cannot** guarantee source restoration or DRM state safety. |
| **`FlyingCow/remo`** | **`[INACCESSIBLE / UNVERIFIED]`** | Zero public TV-remote repository exists at `https://github.com/FlyingCow/remo`. | `[UNVERIFIED]` | `[UNVERIFIED]` | Removed from shortlist reliance until owner supplies a verified URL. |

---

## 3. Five-Level Verification Matrix

| Platform / Architecture | 1. Technically Possible | 2. Officially Documented | 3. Permitted by Platform (3P Store) | 4. Hardware Tested | 5. Production Suitable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **3P Store App doing silent background channel monitoring + forced takeover (Android TV / Tizen / webOS)** | Partially (with root/system sig) | **NO** (explicitly restricted) | **NO** (violates store & OS security) | Not Tested | **NO — REJECTED** |
| **Arch A: Permitted Linear / TIF / HbbTV App (EDISON operates as or inside a linear TV channel / HbbTV stream)** | YES | YES (`TvInputService`, HbbTV, `tizen.tvwindow`) | YES (within own channel/app session) | Not Tested (`Stage P6` Single Final Test) | Candidate (Phase 4/12) |
| **Arch B: OEM / Pay-TV Operator Partnership (pre-installed privileged service / Tizen/webOS partner / Operator STB)** | YES | Partner-gated SDKs | Requires formal OEM/Operator contract | Not Tested | Long-term Target (Phase 4/12+) |
| **Arch C: External HDMI Companion Hardware / STB (pass-through/CEC/prompted switch)** | YES (with HDCP compliance hurdles) | HDMI-CEC & HDCP specs exist | Hardware-dependent; **must never strip/bypass HDCP** | Not Tested | Candidate Pilot Option |
| **Opt-in Viewer Prompt Pilot (App/Channel notifies or viewer accepts break switch)** | YES | YES | YES (explicit user action) | Not Tested (`Stage P6` Single Final Test) | Recommended Initial Pilot |

---

## 4. Development & Verification Discipline

- During software development and Phases 2–5, all Smart TV playback and failure behavior is exercised exclusively via `SimulationTvAdapter`, Android TV/webOS emulators, and recorded media streams—**no repeated physical Smart TV testing during development**.
- **Single Final Hardware Integration Check (`Stage P6`)**: Executed once after the complete application is finished to validate physical playback, remote Return-to-TV, and phone QR scan end-to-end.

---

## 5. Platform Adapters & Local Intelligence Cache Role (`v2.2` Approved Requirement — `NOT STARTED`)

- **No Universal Compatibility Assumption**: Shared Ad Intelligence observations and updates must always carry explicit `(country, broadcaster, channel, platform, broadcastConfig)` compatibility scopes. A detection signal or switch-latency profile verified on Android TV TIF cannot be assumed valid on Samsung Tizen or LG webOS without platform-specific corroboration.
- **TV Platform Adapter Obligations**:
  - Report **platform & decoder compatibility metadata** (`osName`, `osVersion`, `adapterType`, observed `T_switch_in` / `T_switch_out`, decoder warmup latency, audio-focus quirks) strictly without PII.
  - Persist verified updates in the local **Local Intelligence Cache** with atomic swap, offline execution capability, background sync without viewing interruption, and immediate rollback to the prior cached version on false-positive spikes or checksum failure.
  - Respect hardware/DRM limits identically: shared A/V detection fingerprints never rely on bypassing HDCP or scraping secure `MediaDrm` surfaces.
