# EDISON — Commercial-Break Detection & Prediction

**Document Status**: `[PRELIMINARY RESEARCH]` — Theoretical and standards-based analysis; requires Phase 4/5 hardware & live-feed validation.

---

## 1. Detection Signals Evaluated

| Method | Mechanism | Precision / Latency | Legal & Platform Constraints |
| :--- | :--- | :--- | :--- |
| **SCTE-35 In-Stream Cueing** | Digital Program Insertion markers (`splice_insert` / `time_signal`) in MPEG-TS PIDs or HLS `#EXT-X-DATERANGE` / DASH manifests carrying exact break start + duration. | Very High precision; near-zero detection latency when present. | Available in IP/OTT/ATSC 3.0/operator pipelines; often stripped or absent on consumer HDMI inputs from external STBs. |
| **HbbTV / ATSC 3.0 Signalling** | Broadcast-broadband hybrid metadata signalling interactive ad/companion opportunities to HTML5 TV apps. | High precision on supported European/global (HbbTV) or NextGen (ATSC 3.0) broadcasts. | Requires broadcaster participation and compatible TV tuner stack. |
| **Audio/Video Pattern Analysis (ACR / Watermarking)** | Fingerprinting or ATSC A/335 watermarking / black-frame & silence/loudness-shift classifiers on lawful accessible streams. | Moderate latency (1–4s classification window); higher false-positive risk on programme fades. | **Cannot** read frames inside HDCP-protected or DRM `MediaDrm` hardware surfaces without OEM/system privileges. |
| **Channel-Specific Historical Patterns** | Per-channel statistical profiles of typical break cadence (e.g., 14-min / 28-min intervals) and typical break length. | Predictive lead time allows asset preloading; cannot guarantee exact frame start alone. | Must be segmented strictly per channel and region; requires informed viewer consent if telemetry is collected. |
| **ML Break-Length Predictor** | Combines time-of-day, programme genre EPG (where lawfully available), historical break durations, and cue metadata to estimate `T_break_remaining`. | `[UNVERIFIED]` — Requires empirical training dataset in Phase 5. | Must output conservative lower-bound confidence intervals (p10/p5 duration), never mean duration. |
| **Viewer Feedback Loop** | Explicit "Ad ended / Return to TV" manual trigger or opt-in pilot feedback marking early programme return. | High signal for calibration; reactive rather than proactive. | Valuable for Phase 12 pilot calibration; cannot replace fail-safe timers. |

---

## 2. Evaluation Metrics Required in Phase 5

Every detection/prediction algorithm must be benchmarked against:
1. **False Positive Rate (FPR)**: Triggering an EDISON break during actual programme content (critical defect — must approach `0%`).
2. **Missed Break Rate (FNR)**: Skipping a valid break (acceptable when uncertain; preferable to a false positive).
3. **Detection Latency (`T_detect`)**: Elapsed ms from actual break start to confirmed signal.
4. **Duration Estimation Error**: `T_predicted_remaining - T_actual_remaining`. Overestimation causes viewers to miss programme resumption.
5. **Channel-Specific Reliability**: Variance across news, live sports (unpredictable breaks), movies, and episodic dramas.
6. **Switching & Restoration Reliability**: Percentage of cycles returning cleanly to live broadcast within budget without HDCP lockup.

---

## 3. Fail-Safe Decision Rule

- **Conservative Skip Mandate**: If confidence in break start OR confidence that `T_break_remaining >= T_ad + T_switch_in + T_switch_out + T_safety_buffer` falls below threshold, EDISON **skips the slot**.
- **No Unlawful Capture**: EDISON must never attempt to scrape DRM-decrypted frames or bypass HDCP to feed an A/V classifier.
