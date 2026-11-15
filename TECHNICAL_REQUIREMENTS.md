# EDISON — Technical Requirements

**Document Status**: Reconciled Technical Baseline (`v2.2` — Adds Technical & Security Requirements for Mandatory Network-Wide Shared Ad Intelligence Alongside `v2.1` Commercial, Alternating & CTV Standards)

---

## 1. Media & Commercial Format Technical Standards (`UNBLOCKED`)

### 1.1 Three Commercial Formats (`COMMERCIAL ADS`)
1. **Image / Banner Ads**: PNG, JPEG, WebP; strict `16:9` (`1.777:1 ±1%`), minimum `1280 x 720` (1080p recommended). Magic-byte validated on `/api/media/upload`.
2. **Video Ads**: MP4 (H.264/AVC + AAC) and WebM (VP9/Opus); `16:9`, `5s–60s`, normalized loudness (EBU R128 / ATSC A/85 in `P3` FFmpeg pipeline), **preloaded** ahead of break playback.
3. **Text-Only Commercial Ads (`[SPECIFIED / UNBLOCKED TO IMPLEMENT]`)**:
   - Structured JSON payload: `{ advertiserName (required), headline (required), messageBody (required), contactInfo?, qrToken? / destinationUrl? }`.
   - Zero image or video file required; rendered cleanly in a deterministic 16:9 high-contrast typographic canvas (`>= 42 px` headline, `>= 28 px` body at 1080p scale) inside 90% title-safe margins.

### 1.2 Television Safe Zones & QR Legibility
- **Action Safe**: Inner `93%` (`3.5%` margin).
- **Title & QR Safe**: Inner `90%` (`5%` margin) so overscan never clips headlines or QR quiet zones.
- **QR Standards**: Model 2, ECC Level `M`/`Q`, minimum `220 x 220 px` at 1080p (`260–320 px` recommended), `>= 4`-module quiet zone, contrast `>= 7:1`.

---

## 2. Alternating Sequence & Adaptive Break-Budget Timing

Up to 4 spots per break in mandatory order `Slot 1: CHARITY -> Slot 2: COMMERCIAL -> Slot 3: CHARITY -> Slot 4: COMMERCIAL`:

$$\sum_{i=1}^{k} T_{\text{ad}_i} + T_{\text{switch\_in}} + T_{\text{switch\_out}} + T_{\text{preload\_margin}} + T_{\text{safety\_buffer}} \le T_{\text{break\_remaining}}$$

- Scheduler evaluates $k \in \{4, 2, 1, 0\}$ using conservative `T_break_remaining`, verified preloaded assets, and configured `T_safety_buffer >= 5s`.
- Two consecutive ads from the same category are rejected by invariant (`DEC-OPEN-02` tracks whether $k=1$ advances a cross-break pointer or skips singletons).
- Any playback stall or watchdog expiry (`T_ad_duration + 2s` ceiling) immediately restores ordinary live TV (`SimulationTvAdapter` in software tests; `Stage P6` single final test on physical TV).

---

## 3. Network-Wide Shared Ad Intelligence Technical Requirements (`v2.2` Approved — `NOT STARTED`)

### 3.1 Scoped Intelligence Schema & Categories
Every record ingested or distributed MUST bind to an explicit compatibility tuple `{ countryCode, broadcasterId, channelId, platform, broadcastConfig }` (no universal compatibility assumed) and cover:
1. Channel & broadcaster characteristics
2. Break cadence, timing & conservative duration bounds (`p10`/`p50`)
3. Programme <-> advertisement transition cues & margins
4. Lawful non-DRM audio/video detection signatures / fingerprints
5. Confidence scores (`0.00–1.00`), empirical false-positive/miss rates, and freshness TTL
6. Platform & decoder compatibility metadata (`osVersion`, `adapterType`, hardware switch/decoder warmup latencies)
7. Previously verified break pattern revisions (`intelVersion`, `supersedesVersion`, `rollbackToVersion`)

### 3.2 Trust, Validation, Anti-Poisoning & Rollback Controls
- **No Single-TV Auto-Promotion**: An individual device observation enters `candidate_unverified` state and requires independent multi-TV corroboration (`N >= K` distinct attested device identities + statistical consensus) before reaching `network_approved`.
- **Attack & Anomaly Mitigation**: Reject schema violations, out-of-range durations, misidentified channels, replay attacks, and anomalous submission bursts; quarantine conflicting device cohorts automatically.
- **Atomic Cache Update & Rollback**: `Local Intelligence Cache` validates SHA-256 checksums and asymmetric signatures before swapping versions in the background without touching active playback, retains `previousGoodVersion`, operates offline cleanly, queues offline observations for reconnect sync, and triggers immediate automatic rollback if post-update false-positive rates spike or checksums fail.

### 3.3 Strict Privacy & Device-Auth Boundaries
- Device observation ingestion and update fetches use attested device TLS credentials and per-device rate limits.
- Payloads **must never contain** household IDs, individual profile attributes, exact household coordinates/addresses, personal viewing histories, or private ad/opportunity scan interactions.

---

## 4. Advertising-Network Technical Constraints (`[VERIFIED FROM DOCS + UNRESOLVED GAM FORMATS]`)

- **Standard AdSense Prohibited in Native TV Apps**: Web AdSense (`adsbygoogle.js`) and AFV are unsuitable/ineligible for native Smart TV surfaces.
- **Google Ad Manager + IMA SDK Requirements**: Native Android IMA SDK (`Android TV`); HTML5/DAI VAST pipelines (`Tizen/webOS`), strict HTTPS, accurate CTV `plcmt` signals, CMP/TCF consent flags where required, and `< 800ms` timeout budgets behind `AdNetworkAdapter`.
- **`[UNRESOLVED — DEC-OPEN-03]`**: Live GAM CTV publisher account approval is unverified, and CTV VAST video players typically ignore HTML companion banners and lack native text-only third-party network units—so Banner/Text third-party network fill remains `[UNRESOLVED]`.

---

## 5. Lifecycle Event, Financial & Geo Schemas

- **10 Lifecycle Analytics Events** (`[SPECIFIED]`): `ad_requested`, `ad_selected`, `ad_delivered`, `ad_started`, `ad_played`, `ad_completed`, `ad_viewable`, `qr_request`, `destination_opened`, `verified_conversion`.
- **Financial Attribution Separation**: `charity_free`, `direct_commercial_paid`, `ad_network_estimated`, `ad_network_confirmed`, `actual_payment_received`, `refund_adjustment`.
- **7-Level Private Household Geo Schema (`[PENDING DEC-OPEN-01]`)**: `countryCode`, `provinceOrRegion`, `metropolitanArea?`, `cityOrTown`, `district?`, `suburbOrResidentialArea?`, `exactInstallationLocation`.
