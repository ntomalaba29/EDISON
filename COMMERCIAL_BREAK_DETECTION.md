# EDISON — Commercial-Break Detection & Prediction

**Document Status**: `[PRELIMINARY RESEARCH + v2.2 APPROVED CORE ARCHITECTURE REQUIREMENT]` — Theoretical, Standards-Based & External Repository Audit; requires Phase 4/5 software simulation & recorded-stream benchmarking (and one final integrated physical test at app completion `Stage P6`). Implementation of **Network-Wide Shared Ad Intelligence** (`v2.2`) is **`NOT STARTED`**.

---

## 1. Detection Signals Evaluated

| Method | Mechanism | Precision / Latency | Legal & Platform Constraints |
| :--- | :--- | :--- | :--- |
| **SCTE-35 In-Stream Cueing** | Digital Program Insertion markers (`splice_insert` / `time_signal`) in MPEG-TS PIDs or HLS `#EXT-X-DATERANGE` / DASH manifests carrying exact break start + duration. | Very High precision; near-zero detection latency when present. | Available in IP/OTT/ATSC 3.0/operator pipelines; often stripped or absent on consumer HDMI inputs from external STBs. |
| **HbbTV / ATSC 3.0 Signalling** | Broadcast-broadband hybrid metadata signalling interactive ad/companion opportunities to HTML5 TV apps. | High precision on supported European/global (HbbTV) or NextGen (ATSC 3.0) broadcasts. | Requires broadcaster participation and compatible TV tuner stack. |
| **Audio/Video Pattern Analysis (ACR / Watermarking)** | Fingerprinting or ATSC A/335 watermarking / black-frame & silence/loudness-shift classifiers on lawful accessible streams. | Moderate latency (1–4s classification window); higher false-positive risk on programme fades. | **Cannot** read frames inside HDCP-protected or DRM `MediaDrm` hardware surfaces without OEM/system privileges. |
| **Channel-Specific Historical Patterns** | Per-channel statistical profiles of typical break cadence (e.g., 14-min / 28-min intervals) and typical break length. | Predictive lead time allows asset preloading; cannot guarantee exact frame start alone. | Must be segmented strictly per channel and region; requires informed consent where device telemetry is involved. |
| **ML Break-Length Predictor** | Combines time-of-day, programme genre EPG (where lawfully available), historical break durations, and cue metadata to estimate `T_break_remaining`. | `[UNVERIFIED]` — Requires empirical recorded-dataset training in Phase 5. | Must output conservative lower-bound confidence intervals (p10/p5 duration), never mean duration. |
| **Viewer Feedback Loop** | Explicit "Ad ended / Return to TV" manual trigger or opt-in pilot feedback marking early programme return. | High signal for calibration; reactive rather than proactive. | Valuable for pilot calibration; cannot replace fail-safe timers. |

---

## 2. Empirical Audit of Named Break-Detection GitHub Candidates (`DEFERRED` — Not Cloned / Not Integrated)

Full details live in `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md`:

| Repository | Existence | Observed Functionality | Licence | Maintenance | EDISON Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`socrtwo/adhush`** | Verified Exists | Kotlin/Python local A/V commercial detector (OpenCV/FFmpeg: logo, loudness, black frame, silence, perceptual fingerprint) + mute/switch IR/CEC/LAN triggers. | **MIT Licence** | Modest / periodic updates | Useful study for local non-DRM A/V classifiers; cannot inspect HDCP/DRM surfaces on 3P Smart TV apps. |
| **`ggouzi/HLS-SCTE35-monitoring`** | Verified Exists | Python parser monitoring HLS playlists (`#EXT-X-DATERANGE`) for SCTE-35 cues. | **MIT Licence** | Static / Archived (~Oct 2023) | Useful MIT reference for Arch A OTT/HLS SCTE-35 monitoring only. |
| **`abdullaabdullazade/audio-ad-detection`** | Verified Exists | Go audio-fingerprinting & broadcast ad detection engine. | **`[LICENCE UNVERIFIED]`** | Public repo (cadence unverified) | Concepts only; **do NOT reuse code** without verified licence permission; cannot access DRM audio paths. |
| **`nicolasrondan/tv_commercial_break_detector`** | Exists (Partial) | Public Python TV commercial-break detection pipeline. | **`[UNVERIFIED]`** | **`[UNVERIFIED]`** | Deferred to Phase 5 source & licence verification. |
| **`scottn12/Sports-Broadcast-Commercial-Detector`** | **`[INACCESSIBLE / UNVERIFIED]`** | Zero public GitHub repo matched this exact URL/path. | `[UNVERIFIED]` | `[UNVERIFIED]` | Cannot be relied upon unless a valid public URL is supplied. |

---

## 3. Evaluation Metrics & Software-First Calibration

1. **False Positive Rate (FPR)**: Triggering during live programme content (must approach `0%`).
2. **Missed Break Rate (FNR)**: Skipping an uncertain break (acceptable; never cut into programming).
3. **Detection Latency (`T_detect`)**, **Duration Estimation Error (`T_pred - T_actual`)**, and **Switching/Restoration Reliability**.
4. **Testing Rule**: Calibrated entirely in software against recorded broadcast/OTT test fixtures, SCTE-35 mock streams, and `SimulationTvAdapter` during Phase 5—respecting the **single final physical Smart TV test at app completion (`Stage P6`)**.

---

## 4. Fail-Safe Decision Rule

- **Conservative Skip Mandate**: If confidence in break start OR confidence that `T_break_remaining >= T_ad + T_switch_in + T_switch_out + T_safety_buffer` falls below threshold, EDISON **skips the slot**.
- **No Unlawful Capture**: EDISON must never attempt to scrape DRM-decrypted frames or bypass HDCP to feed an A/V classifier.

---

## 5. Network-Wide Shared Ad Intelligence (`v2.2` Approved Core Requirement — Implementation `NOT STARTED`)

**Core Principle**: **`LEARN ONCE. DISTRIBUTE EVERYWHERE. UPDATE CONTINUOUSLY.`**

EDISON televisions must collectively improve commercial-break detection and prediction without re-discovering the same channel, broadcaster, and transition behaviours independently on every TV. A discovery verified on one participating TV can improve all compatible TVs tuned to the same `(country, broadcaster, channel, platform, broadcastConfig)` tuple.

### 5.1 Shared Intelligence Workflow (`Local Intelligence` <-> `Central Shared Intelligence Service`)
1. **Local Observation Generation**: **Local Commercial-Break Intelligence** extracts strictly technical, lawful detection telemetry (break timing/duration, cue behaviour, programme<->ad transition signals, non-DRM A/V detection features, empirically observed accuracy/errors).
2. **Corroborated Central Aggregation**: Authenticated TVs upload observations to the **Central Shared Intelligence Service**, which validates schemas, detects anomalies/conflicts, requires multi-TV independent corroboration (**a single TV's observation MUST NEVER automatically become trusted network-wide intelligence**), computes confidence scores, and publishes immutable **versioned intelligence records**.
3. **Scoped Cache Synchronisation**: Each TV's **Local Intelligence Cache** automatically downloads only records matching its verified `(country, broadcaster, channel, platform, broadcastConfig)` compatibility key, applies signed updates silently in the background without interrupting viewing, runs offline seamlessly using cached rules, queues new local observations while disconnected, and rolls back immediately to the prior version if post-update false positives rise or checksums fail.

### 5.2 Shared Intelligence Categories (No Universal Compatibility Assumed)
1. Channel & broadcaster characteristics
2. Commercial-break timing & duration patterns (p10/p50 estimates, cadence)
3. Programme-to-advertisement & advertisement-to-programme transition signals
4. Audio & video detection fingerprints / feature signatures *(derived solely from lawful accessible signals—never bypassing DRM/HDCP)*
5. Detection confidence & empirical accuracy metrics
6. Platform & decoder compatibility metadata (OS build, player/tuner quirks, switching latencies)
7. Previously verified break patterns

### 5.3 Safeguards & Strict Privacy Isolation
- **Trust Safeguards**: Multi-TV corroboration threshold (`K >= N` distinct attested devices), Sybil/outlier quarantine, automated staleness TTL decay, channel-ID cross-verification, signed cache manifests (SHA-256 + asymmetric signature), and automated/manual version rollback.
- **Zero Viewer PII Shared**: Shared Intelligence payloads **never** collect, store, or distribute household identities, individual profiles, precise household locations, personal viewing histories, or private ad/opportunity interactions.
