# EDISON — Known Limitations

**Honesty Standard**: Separates committed Phases 1–8 + verified Phase 9 `Block 9.1` software engineering (`opportunityOpsEngine`, `BroadcastRenderEngine`), software-first simulation engines (`SharedIntelFleetService`, `TvPlatformAdapter` harnesses, `LocalOfflineIntelCacheEngine`, `broadcastMetadataParser`, `breakDurationPredictor`, `AdvertisingDeliveryInfrastructure`, `advertiserOps`, `trackBHouseholdConsent`), unresolved external decisions (`DEC-OPEN-02`, `DEC-OPEN-03`), and physical testing restrictions. Overall completion stands at **62.0% of the full 15-phase international commercial app** (**`38.0%` remaining**), **81.8% of the software-to-`Stage-P6` milestone**, and **100.0% of the Phase 2 AI Studio scope** (`Track B` under `DEC-OPEN-01` and `Block 8.1` committed; `Phase 9 Block 9.1` verified & awaiting commit; `TASK-P3-001` `READY` with JSON retained).

1. **`[PHASE 8 & PHASE 9 SOFTWARE-FIRST BLUEPRINTS — NO FFMPEG BINARY OR EXTERNAL KYC VENDOR CONNECTED]`**:
   - **Phase 8 (`BroadcastRenderEngine`, Committed)**: Validates 16:9 overscan safe margins (5%–95%), WCAG contrast (`>= 4.5:1`), minimum 12% QR box dimensions, fail-closed non-overwrite QR vision checks, EBU R128 `-23 LUFS` filter graphs, and platform codec targets (`ffmpegBinaryExecuted: false`). Native FFmpeg binary transcoding and CDN workers remain external.
   - **Phase 9 (`opportunityOpsEngine.ts`, Awaiting Commit)**: Enforces SHA-256 AES-256-GCM blueprint evidence vault seals across Tiers 1–3, PII redaction, strict Tier 2->3 non-transitivity, 90-day re-verification quarantine, 4h/24h/48h SLA breach tracking, and `$0.00` Charity zero-fee-influence rules, with `externalKycVendorConnected: false` (no external government ID/KYC vendor API called in prototype/software-first mode).
   - `.git` metadata is absent inside `/app/applet`; commits are applied manually by the Project Owner.

2. **`[DEC-OPEN-01 LOCKED — HOUSEHOLD PRIVACY & BUNDLED CONSENT SCOPE]`**:
   - Locked under **Scope B (Full EDISON Model) + Bundled Consent Withdrawal**: Track B implements Zimbabwe (`ZW`) initial launch geo hierarchy + international configs (`countryActivated: false`), PIN-isolated household profiles, opportunity matching, safe TV greetings, bundled commercial/charity withdrawal, and `HTTP 403` epoch QR revocation.
   - All consent checks and QR revocations are verified in application code/tests against the JSON store (`schemaVersion: 8`), not yet against a live PostgreSQL instance (`TASK-P3-001` remains `READY`).

3. **`[NORMAL TV REMOTE, SMART TV ADAPTERS & SHARED AD INTELLIGENCE STATUS]`**:
   - **Normal Everyday TV Remote Control (`ADR-017` / `PRD-20`) & Phase 4 Adapters (`Blocks 4.1–4.3`)**: Software exit suite (`10/10` checks, `16/16` fault cases, `8/8` conformance vectors) committed cleanly—**zero physical TV hardware compatibility claimed or tested prior to `Stage P6` (`hardwareTested: false`)**.
   - **Network-Wide Shared Ad Intelligence & Break Predictor (`Blocks 5.1–5.2`)**: Ed25519 attested fleet service (`11/11` Scenarios `25`–`35`) and per-channel `p10`/`p5` ML predictor (`10/10` fixtures, `0%` FPR) committed as **software-first engines only** against recorded fixtures/simulations—real broadcaster field calibration awaits `Stage P6` and Phase 12 pilots.

4. **`[GOOGLE AD MANAGER CTV FORMAT & ACCOUNT ELIGIBILITY — UNRESOLVED DEC-OPEN-03 & DEC-OPEN-02]`**:
   - **`DEC-OPEN-03`**: Standard AdSense/AFV are ineligible for native CTV apps; GAM + IMA SDK is the official path, **but** EDISON holds zero GAM CTV account today (`MockAdNetworkBackfillAdapter` active), and whether GAM CTV supports third-party static banner or text-only backfill remains **`UNRESOLVED`**.
   - **`DEC-OPEN-02`**: Final confirmation of `k=1` short-break alternating rule remains open for Phase 12 calibration review.

5. **`[INACCESSIBLE / UNVERIFIED DEFERRED GITHUB CANDIDATES]`**:
   - Among the 9 named research candidates (`DEFERRED` to Phase 4/5 reference studies; zero cloning/integration): `scottn12/Sports-Broadcast-Commercial-Detector` and `FlyingCow/remo` could not be verified publicly (`INACCESSIBLE / UNVERIFIED`); `abdullaabdullazade/audio-ad-detection` has `LICENCE UNVERIFIED`; `nicolasrondan/tv_commercial_break_detector` has partial public verification with unverified licence/history.

6. **`[PHYSICAL HARDWARE, BROWSER E2E, BILLING & LEGAL RESEARCH BOUNDARIES]`**:
   - **Zero physical Smart TV hardware tests** have been executed—**repeated physical testing is prohibited during development**, deferred strictly to **one final integrated physical test at app completion (`Stage P6`)**.
   - **Physical Phone QR Scan Gate**: Live runtime store starts with `0` owner-submitted smartphone camera scans (`PENDING_OWNER_DEVICE_TEST`); never fabricated in code.
   - **Browser E2E & Cloud Persistence**: Single-host JSON atomic store (`schemaVersion: 8`, `EdisonDataRepository` port) is retained in AI Studio without paid Cloud SQL (`TASK-P3-001` ready for external PostgreSQL execution).
   - **Non-Transactional Billing & Outreach Lock**: `paymentCollectionActive: false`, `realPaymentGatewayConnected: false`, `actualCashChargedUsd: 0`, and `automatedOutreachBlocked: true` remain strictly enforced.
   - **Independent Legal Research Policy**: Country statutes (`COUNTRY_ACTIVATION_REGISTER.md`) are researched independently from public official sources; **`ZERO LEGAL COMPLIANCE CLAIMED`** and all countries remain `NOT ACTIVATED` until Phase 14 country launch approval.
