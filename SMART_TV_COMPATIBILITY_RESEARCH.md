# EDISON — Smart TV Compatibility Research

**Verification Standard**: Every technical claim below explicitly distinguishes:
1. **Technically Possible** | 2. **Officially Documented & Supported** | 3. **Permitted by Manufacturer / Platform** | 4. **Tested on Actual Hardware** | 5. **Suitable for Production**

**Notice**: All Smart TV findings in Phase 1 are **`[PRELIMINARY RESEARCH — NOT YET TESTED ON ACTUAL HARDWARE]`**. No APIs or permissions have been fabricated.

---

## 1. Platform Capability & Restriction Analysis

### 1.1 Android TV & Google TV (TV Input Framework — TIF)
- **Framework**: `TvInputService`, `TvInputManager`, `TvContract`, `TvView` (`android.media.tv`).
- **Tuner & Live Channel Access**:
  - `TvInputService` allows an app to act as a virtual or physical TV input source (IPTV, HLS/DASH linear channels, or custom tuner hardware) and publish its own channels via `WRITE_EPG_DATA` + `BIND_TV_INPUT`.
  - **Critical Restriction**: `com.android.providers.tv.permission.READ_EPG_DATA` was deprecated in Android M (API 23) and is **strictly restricted to system/signature apps**. A third-party Play Store app **cannot** read the global EPG or monitor what channel another tuner/HDMI input is playing.
- **Overlay & Window Restrictions**:
  - Inside a `TvInputService.Session` *owned by EDISON*, `setOverlayViewEnabled(true)` and `onCreateOverlayView()` officially allow rendering UI overlays above that session's video surface (adapting via `onOverlayViewSizeChanged()` for PiP).
  - **Critical Restriction**: Drawing overlays *on top of other apps or system TV tuners* via `SYSTEM_ALERT_WINDOW` (`TYPE_APPLICATION_OVERLAY`) is heavily restricted/blocked on modern Android TV builds and Google Play TV app policies.
- **App Lifecycle & Source Switching**:
  - Third-party apps cannot hijack `com.android.tv.TvActivity` or arbitrarily switch away from HDMI/broadcast tuners belonging to other system inputs without system-level privileges (`TV_INPUT` / OEM signature).
- **DRM & HDCP**:
  - `MediaDrm` enforces Widevine/HDCP levels (`maxHdcpLevel`, `hdcpLevel`). Protected streams use secure hardware surfaces that prohibit frame capture, scraping, or non-secure compositing.

### 1.2 Samsung Tizen Smart TV
- **Relevant APIs**: `tizen.tvwindow`, `tizen.systeminfo` (`VIDEOSOURCE`), `tizen.application` (`org.tizen.tv-viewer`).
- **Capabilities**:
  - With `<tizen:privilege name="http://tizen.org/privilege/tv.window"/>` and `tv.audio`, a foreground Tizen web app can display live TV/HDMI inside its own window (`tizen.tvwindow.show(..., 'BEHIND')`) and switch sources via `tizen.tvwindow.setSource()`, or close back to native TV via `tizen.application.launch("org.tizen.tv-viewer")`.
- **Critical Restrictions**:
  - **No Background Execution**: On Samsung Smart TVs (2015 onward), `<tizen:setting background-support="enable"/>` is **prohibited/disabled** for UI web apps. The moment the user switches to native TV, HDMI, or Home, the Tizen app is **paused**; JavaScript execution and timers halt.
  - **Certification & Partner Gates**: Public Samsung Apps TV certification prohibits hidden background loops or unauthorized interference with native broadcast playback. Deep tuner/ACR integration requires direct Samsung partner/B2B agreements.

### 1.3 LG webOS Smart TV
- **Relevant APIs**: Luna Service IPC (`luna://com.webos.service.applicationmanager`, `com.webos.service.eim`).
- **Capabilities**:
  - System services control input launching (`com.webos.app.hdmi1`, etc.). Commercial/hospitality displays (IDCAP/Signage) expose specialized external input tags (`ext://hdmi:1`), whereas consumer TVs separate web apps from native broadcast layers.
- **Critical Restrictions**:
  - **App Store Sandbox**: Standard LG Content Store web apps cannot invoke restricted system Luna services without Access Control Groups (ACGs) and LG partner signing.
  - **Suspension on Focus Loss**: Unfocused web apps are suspended/hibernated. Third-party consumer store apps **cannot** run persistent background daemons to monitor live TV or trigger automatic HDMI/source switches.

---

## 2. Five-Level Verification Matrix

| Platform / Architecture | 1. Technically Possible | 2. Officially Documented | 3. Permitted by Platform (3P Store) | 4. Hardware Tested | 5. Production Suitable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **3P Store App doing silent background channel monitoring + forced takeover (Android TV / Tizen / webOS)** | Partially (with root/system sig) | **NO** (explicitly restricted) | **NO** (violates store & OS security) | Not Tested | **NO — REJECTED** |
| **Arch A: Permitted Linear / TIF / HbbTV App (EDISON operates as or inside a linear TV channel / HbbTV stream)** | YES | YES (`TvInputService`, HbbTV, `tizen.tvwindow`) | YES (within own channel/app session) | Not Tested | Candidate (Phase 4/12) |
| **Arch B: OEM / Pay-TV Operator Partnership (pre-installed privileged service / Tizen/webOS partner / Operator STB)** | YES | Partner-gated SDKs | Requires formal OEM/Operator contract | Not Tested | Long-term Target (Phase 4/12+) |
| **Arch C: External HDMI Companion Hardware / STB (pass-through/CEC/prompted switch)** | YES (with HDCP compliance hurdles) | HDMI-CEC & HDCP specs exist | Hardware-dependent; **must never strip/bypass HDCP** | Not Tested | Candidate Pilot Option (Phase 4/12) |
| **Opt-in Viewer Prompt Pilot (App/Channel notifies or viewer accepts break switch)** | YES | YES | YES (explicit user action) | Not Tested | Recommended Initial Pilot |

---

## 3. Preliminary Architectural Conclusion

1. **Do not build Phase 4+ around an assumption that a standard Play Store / Content Store app can silently watch live HDMI/broadcast TV in the background and forcibly hijack the screen.** All three major Smart TV OSes (Android TV, Tizen, webOS) explicitly block background execution, cross-app EPG reading, or unprivileged system overlays.
2. **Viable Production Paths**:
   - **Path 1 (Arch A)**: Deliver EDISON inside a permitted linear streaming / Android TV TIF / HbbTV / ATSC 3.0 application environment where EDISON controls its own playback session legally.
   - **Path 2 (Arch B)**: OEM (Samsung/LG/Google TV OEM) or MVPD/Broadcaster/Operator partnerships granting privileged system permissions and native ACR/SCTE-35 hooks.
   - **Path 3 (Arch C)**: Dedicated EDISON-compatible external HDMI/STB hardware (strictly respecting HDCP 2.2/2.3 repeater rules and HDMI-CEC timing) or an initial opt-in viewer-prompted pilot.
3. **Next Research Step (Phase 4)**: Acquire physical test devices (Android TV box/TV, Samsung Tizen TV, LG webOS TV) to empirically measure source-switch latency, `tvwindow` / `TvInputService` behavior, and HDCP handshake stability.
