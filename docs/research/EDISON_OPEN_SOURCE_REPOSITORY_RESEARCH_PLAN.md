# EDISON — Deferred Open-Source Repository Research Plan

**Document Status**: Historical owner-supplied shortlist. The current remote-control and commercial-break repository review plus proposed EDISON hybrid is in [`EDISON_TV_REMOTE_AND_BREAK_DETECTION_REPOSITORIES.md`](EDISON_TV_REMOTE_AND_BREAK_DETECTION_REPOSITORIES.md). This historical record is not an implementation plan.
**Target Repository**: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`  
**Applicable Future Phases**: Phase 4 (Smart TV Feasibility and Integrations) & Phase 5 (Commercial-Break Detection and Prediction)  
**Recorded Date**: 2026-11-14 | **Empirical Verification Date**: 2026-11-15

> **HISTORICAL RESEARCH NOTICE**
>
> - This file records the earlier owner shortlist and remains useful for provenance.
> - Use the current research document linked above for the product flow and repository findings.
> - Repository inclusion does not authorize cloning or code reuse; inspect a pinned revision and its license/security/privacy before any reuse.

> **Current audit note (2026-11-18):** The owner clarified the intended architecture: a TV-side break detector timestamps channel breaks, EDISON shares validated observations across TVs, and an authorized EDISON playback path switches to EDISON ads and returns to the programme; the phone app also exposes remote controls including EDISON Ad and Back. See the current research document for a proposed hybrid and remaining platform/source questions.

---

## 1. Purpose

This document permanently records EDISON's deferred open-source repository research shortlist covering:

1. **TV remote-control communication and switching approaches** (Category A — 4 named GitHub URLs + 5 additional un-URL'd owner list titles).
2. **Advertising intelligence and commercial-break detection approaches** (Category B — 5 named GitHub URLs).

Section 2A & 2B below record **empirical public-search verification** of the 9 named GitHub repositories (existence, actual functionality, licence, maintenance activity, and compatibility/limitations with EDISON).

---

## 2. Empirical Verification Audit of Named Candidate Repositories (9 Named URLs)

### A. Commercial-Break Detection Candidates (5 Named Repositories)

| # | Repository | Existence Status | Actual Functionality (Observed) | Licence | Maintenance Activity | EDISON Compatibility & Limitations |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **`socrtwo/adhush`**<br>(`https://github.com/socrtwo/adhush`) | **VERIFIED — EXISTS** | Multi-signal local A/V commercial detector (Python/Kotlin using OpenCV & FFmpeg: channel logo/bug, loudness, black frames, silence, perceptual fingerprinting) triggering IR, HDMI-CEC, RS-232, or LAN TV mute/volume control. | **MIT Licence** (`VERIFIED`) | Active/modest (few stars, periodic updates by author `socrtwo` / Paul D. Pruitt). | Good architectural study for privacy-preserving local detection & mute triggers. **Limitation**: Cannot read DRM/HDCP-protected TV tuner frames on 3P store apps and does not manage multi-slot ad restoration inside a TV OS. |
| 2 | **`nicolasrondan/tv_commercial_break_detector`**<br>(`https://github.com/nicolasrondan/tv_commercial_break_detector`) | **EXISTS (PARTIALLY VERIFIED)** | Public Python TV commercial-break detection pipeline matching author Nicolás Rondán Zambra's academic/CV project. | **`[UNVERIFIED]`** *(No public licence file indexed cleanly in web search)* | **`[UNVERIFIED]`** *(Commit cadence requires direct clone/API inspection in Phase 5)* | Concept reference for offline/stream break-boundary classification. **Limitation**: Cannot assume reuse rights or production accuracy until source and licence are inspected directly in Phase 5. |
| 3 | **`scottn12/Sports-Broadcast-Commercial-Detector`**<br>(`https://github.com/scottn12/Sports-Broadcast-Commercial-Detector`) | **`[INACCESSIBLE / UNVERIFIED]`** | Zero public GitHub repository indexed at this exact owner/name (may be private, deleted, renamed, or typo). | **`[UNVERIFIED]`** | **`[UNVERIFIED]`** | **Cannot be relied upon.** Do not schedule or depend on this repository unless a valid public URL is supplied. |
| 4 | **`abdullaabdullazade/audio-ad-detection`**<br>(`https://github.com/abdullaabdullazade/audio-ad-detection`) | **VERIFIED — EXISTS** | Open-source **Go** audio fingerprinting & broadcast advertisement detection engine. | **`[LICENCE UNVERIFIED]`** *(No explicit OSS licence file verified in public search)* | Public Go repository (`Commit cadence requires direct Phase 5 check`). | Relevant to audio-signature matching (where lawful unencrypted audio is accessible). **Limitation**: **Do NOT reuse code** without verified licence permission; cannot inspect DRM-locked audio hardware paths. |
| 5 | **`ggouzi/HLS-SCTE35-monitoring`**<br>(`https://github.com/ggouzi/HLS-SCTE35-monitoring`) | **VERIFIED — EXISTS** | Python monitor parsing HLS `#EXT-X-DATERANGE` / SCTE-35 advertisement cue markers in streaming playlists. | **MIT Licence** (`VERIFIED`) | **Static / Archived** (last updated ~Oct 2023). | Clean MIT reference for HLS SCTE-35 ad-marker parsing (Arch A OTT/linear streams). **Limitation**: Passive HLS monitor only; cannot read consumer HDMI tuners or execute Smart TV input switching. |

---

### B. TV Remote-Control Candidates (4 Named URLs + 5 Unsupplied-URL Titles)

| # | Repository | Existence Status | Actual Functionality (Observed) | Licence | Maintenance Activity | EDISON Compatibility & Limitations |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **`levhakobyan/OpenTV-Remote`**<br>(`https://github.com/levhakobyan/OpenTV-Remote`) | **VERIFIED — EXISTS** | Capability-aware LAN smart-TV remote UI written in Kotlin/Jetpack Compose (Android) & SwiftUI (iOS). | **MIT Licence** (`VERIFIED`) | **Actively maintained** (`VERIFIED`). | Useful reference for mobile LAN TV pairing & capability probing. **Limitation**: Manual phone-to-TV remote UI only; not an autonomous broadcast break switcher or programme-state restorer. |
| 2 | **`maxhayim/webmote`**<br>(`https://github.com/maxhayim/webmote`) | **VERIFIED — EXISTS** | Java Android TV / Google TV service + browser PWA remote using PIN pairing, Android Accessibility/local HTTP control. | **MIT Licence** (`VERIFIED`) | **Actively maintained** (recent commits for Bluetooth, Home Assistant & UI). | Helpful Phase 4 study of Android TV local PIN pairing & Accessibility/key-injection constraints. **Limitation**: Requires explicit user PIN/Accessibility grant; does not detect live broadcast commercial breaks. |
| 3 | **`FlyingCow/remo`**<br>(`https://github.com/FlyingCow/remo`) | **`[INACCESSIBLE / UNVERIFIED]`** | Zero public Smart TV remote-control repo found at `https://github.com/FlyingCow/remo` (`FlyingCow` publishes Rust libraries; unrelated `remo` repos exist under other owners). | **`[UNVERIFIED]`** | **`[UNVERIFIED]`** | **Removed from reliance / marked `INACCESSIBLE / UNVERIFIED`** until owner provides the exact verified URL (previously labelled "Primary Shortlist" without verification). |
| 4 | **`mazen-salah/Smart-TV-Remote-Control`**<br>(`https://github.com/mazen-salah/Smart-TV-Remote-Control`) | **VERIFIED — EXISTS** | Flutter universal TV remote targeting **Samsung Tizen & LG webOS** over LAN using UPnP/mDNS/SSDP discovery & Wake-on-LAN. | **MIT Licence** (`VERIFIED`) | **Actively maintained** (`v0.4.1+`). | Practical LAN discovery & Tizen/webOS WebSocket pairing protocol reference for Phase 4. **Limitation**: Sends remote keystrokes over LAN only; cannot verify DRM programme state or prevent user remote clashes cleanly on its own. |
| 5–9 | **Legvan TV Remote (`Legvan/tv-remote`)**, **AltRemote**, **Open TV Remote (multi-brand)**, **LG WebOS Remote Control**, **PK Remote** | *Deferred / 4 Missing URLs* | Listed from initial owner shortlist for potential Phase 4 review (`Legvan/tv-remote` + 4 titles without supplied URLs). | `[UNVERIFIED]` | `[UNVERIFIED]` | Remain `DEFERRED`; not relied upon unless verified in Phase 4. |

---

## 3. Future Research Requirements (When Phase 4 / Phase 5 Opens)

1. Read actual source code directly (never rely on READMEs alone).
2. Confirm exact open-source licence compatibility (`MIT`, `Apache-2.0`, copyleft checks) — reject `[LICENCE UNVERIFIED]` or `[INACCESSIBLE / UNVERIFIED]` repos unless resolved.
3. Audit security risks (LAN pairing tokens, unencrypted TV WebSockets, privilege escalation).
4. Evaluate compatibility with EDISON timing budgets (`T_switch_in + T_ad + T_switch_out + safety_buffer <= T_break_remaining`).
5. **Physical Testing Boundary**: Evaluating or adapting any concept remains software-first (`SimulationTvAdapter` + recorded streams) until the **single final physical Smart TV integration test at app completion (`Stage P6`)**.

---

## 4. EDISON's Intended Control Context & Deferred Notes

```text
Track break on TV -> timestamp and share channel-scoped observation
  -> EDISON Ad action -> play EDISON ad -> Back/complete -> restore programme
```

- **Owner clarification (2026-11-18)**: A TV-side system detects and timestamps commercial breaks; EDISON shares validated observations for the same channel across participating TVs. The EDISON TV app has its own Ad and Back controls and playback path; the phone app is a conventional TV remote plus EDISON's other features and profile/opportunity functionality. Paid ads include broad lawful content and geographic targeting. The journalist/breaking-news monthly subscription concept is owner-approved; price and editorial rules remain undecided.
- **Architecture boundary**: Detector access, outbound remote transport, TV playback/switching, cross-device synchronization, and programme restoration are separate capabilities. A remote-control repo alone does not provide break detection, tuner access, or restoration guarantees. Preserve viewer override, channel scope, privacy, and fail-safe behavior.
- **Historical status note**: Earlier target-platform and Aura statements above this section predate the current product clarification and should not be read as current authorization or current implementation status. Use [`EDISON_TV_REMOTE_AND_BREAK_DETECTION_REPOSITORIES.md`](EDISON_TV_REMOTE_AND_BREAK_DETECTION_REPOSITORIES.md) for the current review and open questions; the implemented AURA code remains simulator-only.
