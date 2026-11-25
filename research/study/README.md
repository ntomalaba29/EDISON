# EDISON Open-Source Research — Cloned Repositories

**Status:** Research phase — repositories cloned for architectural study and adoption evaluation
**Cloned:** 2026-11-25
**Study folder:** `research/study/`

---

## 1. Clone Summary

| # | Repository | Clone Path | Primary Language | Stars | License |
|---|-----------|-----------|------------------|-------|---------|
| 1 | [socrtwo/adhush](https://github.com/socrtwo/adhush) | `research/study/adhush` | Kotlin / Python / JS / Shell | 2 | **MIT** |
| 2 | [ggouzi/HLS-SCTE35-monitoring](https://github.com/ggouzi/HLS-SCTE35-monitoring) | `research/study/hls-scte35-monitoring` | Python | 164 | **MIT** |
| 3 | [levhakobyan/OpenTV-Remote](https://github.com/levhakobyan/OpenTV-Remote) | `research/study/open-tv-remote` | Kotlin / Swift | 224 | **MIT** |
| 4 | [maxhayim/webmote](https://github.com/maxhayim/webmote) | `research/study/webmote` | Java / Kotlin / JS | N/A | **MIT** |
| 5 | [mazen-salah/Smart-TV-Remote-Control](https://github.com/mazen-salah/Smart-TV-Remote-Control) | `research/study/smart-tv-remote-control` | Dart / Flutter | 1 | **MIT** |
| 6 | [tronikos/androidtvremote2](https://github.com/tronikos/androidtvremote2) | `research/study/androidtvremote2` | Python | 253 | **Apache-2.0** |

**All clones pinned to latest default branch HEAD at time of cloning.**

---

## 2. Commercial-Break Detection — `socrtwo/adhush` (Primary Clone)

### What it is
Multi-signal commercial-break detection and automatic TV muting. Not just muting — the architecture is the valuable part.

### Key architecture (adopt-worthy)

| Area | Value to EDISON |
|---|---|
| **Detector → Control separation** | ADR-0003: detectors vote, controllers act. No detector touches a controller directly; fusion via confidence-vote system. **Adopt**: EDISON's existing `src/server/*Engine.ts` pattern already mirrors this. |
| **Eighteen detectors** | logo_absence, black_frame, silence, loudness, crest_factor, scene_cut, fingerprint, aspect_change, rating_bug, ad_units, cutscene, stereo_width, watermark, clock, jingle, stinger, schedule, scte35, crowd, caption_gap. |
| **Fusion strategy** | No single default-weight detector acts alone; two agreeing detectors can act. A few high-signal detectors (learned jingle, captured cutscene, splice cue, fingerprint, shared report) may act alone. **Adopt**: EDISON already uses confidence + corroborating signals. |
| **State machine** | Dwell + hysteresis, learned break ceiling, positive programme evidence (bug back, closing sting, rating box, title card, cue) ends hold early. **Adopt**: EDISON's existing breakScheduler/state logic should mirror this. |
| **Privacy boundaries** | EDISON policy **explicitly excludes camera/microphone/protected-screen capture** and **disallows automatic volume hijacking**. AdHush's optional cloud features and camera/mic paths must **NOT** be adopted. |

### Android detection methods (AdHush)
1. Quiet gaps (mic — **skip**, privacy)
2. Loudness jumps (mic — **skip**)
3. Remembered breaks (audio fingerprints — **adopt** if audio source authorized)
4. Channel bug / news ticker (camera — **skip**)
5. Spoken words (mic/captions — **skip** unless captions via permitted source)
6. On-screen captions (camera — **skip**)
7. Ask Claude (cloud — **skip**)
8. Local AI (on-device — **adopt** pattern for on-device inference)
9. Break clock (minute of hour + duration — **adopt**)
10. Break jingle (learned stinger — **adopt** pattern)

**Adoptable patterns for EDISON:** detector vote model, confidence + fusion, break clock, jingle learning, SCTE-35 cue handling, crowd/shared-feed opt-in (hashed channel IDs).

**Non-adoptable:** camera, microphone, protected screen, automatic volume ducking, cloud AI in any default path.

---

## 3. HLS / SCTE-35 — `ggouzi/HLS-SCTE35-monitoring` (Secondary Clone)

### What it is
Passive HLS playlist monitor parsing `EXT-X-CUE-OUT`, `EXT-X-DATERANGE`, `EXT-OATCLS-SCTE35`.

### Value to EDISON
- Clean MIT SCTE-35 cue parser.
- Good reference for authorized playlist monitoring.
- **Limitation:** passive monitor only; no tuner control/ad-mute. EDISON adds its own playback path.

---

## 4. TV Remote Controls — Cloned

### 4a. `levhakobyan/OpenTV-Remote` — (⭐224 stars, MIT)
Capability-aware LAN smart-TV remote, Kotlin/Swift. Best-in-class architecture.

**Adoptable patterns:**
- Per-TV capability negotiation/probing.
- Pairing + trust boundaries per brand.
- Bluetooth HID fallback (`BluetoothHidReports.kt`).
- `AndroidTvProvider`, `WebOsProvider`, `SamsungProvider` — provider abstraction pattern.
- `ImeSessionFence`, `HoldRepeater` — input override semantics.

**Note:** Phone-only remote today; not autonomous break switching. EDISON keeps **EDison Ad/Back in TV app**.

### 4b. `maxhayim/webmote` — Android TV/GTV remote (MIT, Java/Kotlin)
- Android TV + Google TV remote service + browser PWA.
- PIN pairing, Accessibility-based local control, NS D + key injection.
- `Nsd`, `Server`, `RemoteService`, `Auth`, `PinCard` classes.

**Adoptable:** Accessibility-based local key injection; PIN-based pairing; TV service model.

### 4c. `mazen-salah/Smart-TV-Remote-Control` — Flutter universal (MIT, Dart)
- SSDP/UPnP + Bonjour/mDNS discovery, Wake-on-LAN.
- Samsung Tizen WebSocket v2, LG webOS WebSocket/SSAP.
- Pairing approved on TV.

**Adoptable:** Local discovery, per-brand transports, reconnect handling, capability-specific UI.

### 4d. `tronikos/androidtvremote2` — Android TV Remote Protocol v2 (Apache-2.0, Python)
- Paired encrypted local connection to Android TV Remote Service (NOT ADB, NOT TIF).
- Protocol implementation reference.

**Adoptable:** Protocol v2 semantics for Android TV.

---

## 5. Next Step

Continue cloning the broader set of TV-remote candidates identified in prior research:
- [ ] `adobe` / others for general TV remote patterns.
- [ ] Android Accessibility TV key injection reference.
- [ ] DVB / HbbTV integration specifics.

---

## 6. License / Reuse Policy Reminder

Before adopting any code into `src/`:

1. Pin a revision.
2. Inspect license (all cloned here: MIT ×5, Apache-2.0 ×1).
3. Resolve LGPL for `samsung-tv-ws-api` before reuse.
4. Never copy camera/mic/protected-screen capture.
5. Never adopt automatic volume hijacking.
6. Never adopt third-party cloud ad-tech API paths.
