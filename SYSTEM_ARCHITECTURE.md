# EDISON — System Architecture

**Document Status**: Phase 1 Architecture Baseline (`[PROTOTYPE ARCHITECTURE]` vs `[TARGET PRODUCTION ARCHITECTURE]`)

---

## 1. Architectural Separation Principle

EDISON separates **Core Business & Media Services** from **TV Delivery Adapters**. No business workflow (ad creation, QR validation, opportunity moderation, analytics ingestion) may depend directly on a proprietary Smart TV OS API.

```
+-----------------------------------------------------------------------+
|                       EDISON WEB & ADMIN LAYER                        |
|  Advertiser Portal | Ad Studio (A/B) | 16:9 TV Preview | Admin Queue  |
|  Opportunity Submission & 3-Tier Verification | Break Simulator (Web) |
+-----------------------------------+-----------------------------------+
                                    | HTTPS / REST JSON
+-----------------------------------v-----------------------------------+
|                     EDISON APPLICATION BACKEND                        |
|  Auth & RBAC | Campaign Engine | Opportunity Engine | Audit Trail     |
|  QR Destination Validator & Tracking Redirect (/r/:token)             |
|  Media Validator & Transcode Orchestrator | Deduplicated Analytics    |
+-----------------------------------+-----------------------------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
+---------v---------+                               +---------v---------+
| PROTOTYPE STORAGE |                               | PRODUCTION TARGET |
| Express + Local   |                               | Postgres + Object |
| JSON/SQLite/State |                               | Storage + CDN     |
| (Phase 2)         |                               | (Phase 3 / 6)     |
+-------------------+                               +---------+---------+
                                                              |
                                            +-----------------v-----------------+
                                            |   TV DELIVERY ADAPTER INTERFACE   |
                                            +-----------------+-----------------+
                                                              |
                 +--------------------------+-----------------+-----------------+
                 |                          |                                   |
       +---------v----------+     +---------v----------+             +----------v---------+
       | Phase 2 Simulation |     | Architecture A/B   |             | Architecture C     |
       | SimulationTvAdapter|     | Android TIF / HbbTV|             | External HDMI/STB  |
       | (Browser Canvas)   |     | OEM Partnership    |             | Companion Device   |
       +--------------------+     +--------------------+             +--------------------+
```

---

## 2. Phase 2 Prototype Architecture (AI Studio Scope)

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4.
- **Backend**: Express (`server.ts`) serving both Vite dev middleware (`tsx server.ts`) and REST API routes (`/api/*`), plus secure QR redirect routes (`/r/:shortCode`).
- **Persistence (Prototype)**: Server-side structured JSON/SQLite store (`[PROTOTYPE PERSISTENCE]`) so uploaded media metadata, campaigns, opportunities, consent records, QR redirects, and measured QR scan events persist across browser reloads and can be tested from a physical phone on the network.
- **TV Layer**: `SimulationTvAdapter` strictly confined to the Commercial-Break Simulator view.

---

## 3. Target Production Architecture (Phase 3–15 Scope)

- **Relational Core**: PostgreSQL with strict schema migrations, row-level audit trails, encrypted PII/evidence vaults.
- **Media Pipeline**: Object storage (S3/GCS-compatible) + FFmpeg/transcoding workers producing broadcast-safe H.264/HEVC MP4 & HLS assets with normalised EBU R128 / ATSC A/85 audio loudness.
- **Edge & CDN**: Regional CDN pre-caching creative assets and QR SVGs for Smart TV preload (<500ms retrieval before break switch).
- **Analytics Pipeline**: Idempotent event ingestion keyed by `(campaign_id, device_session_id, break_id, event_type, timestamp_bucket)` with bot/replay filtering.
- **Smart TV Adapters**: Hardware-verified implementations for permitted architectures (see `SMART_TV_COMPATIBILITY_RESEARCH.md`).

---

## 4. Key Interface Contracts

### `TvPlaybackAdapter` (Abstract Contract)
- `getCapabilities()`: Returns `{ canMonitorChannel, canReadMetadata, canSwitchSource, canReturnToLive, switchInMs, switchOutMs, requiresViewerPrompt }`.
- `preloadAd(adManifest)`: Downloads creative + QR payload ahead of break.
- `evaluateSafeWindow(breakEstimateMs, adDurationMs)`: Enforces safe playback equation; returns `{ allowed: boolean, reason: string }`.
- `presentAd(adId, onManualReturn)`: Displays ad; guarantees manual return control and watchdog timeout back to live broadcast.
- `restoreLiveBroadcast()`: Returns display to live broadcast at live edge (never buffered pause point).
