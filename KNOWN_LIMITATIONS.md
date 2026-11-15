# EDISON — Known Limitations

**Honesty Standard**: Separates verified Phase 2 baseline + `P2-V2` Track A (`P2-V2.1`–`P2-V2.4`) code, prototype-only simulation previews (`SharedIntelligencePreviewView`), consent-blocked decisions (`DEC-OPEN-01`), unresolved external constraints, and physical testing restrictions. Overall completion stands at **19.0% of the full 15-phase international commercial app** (`81.0%` remaining), **30.6% of the software-to-`Stage-P6` milestone**, and **85.0% of the AI Studio prototype assignment** (**100% of unblocked Track A complete**).

1. **`[BLOCK P2-V2.4 VERIFIED ON DISK — AWAITING OWNER COMMIT]`**:
   - Prior `Block P2-V2.3` (`Vitest` + `Supertest` regression suite) was confirmed committed by the Project Owner (`"Committed, next"`).
   - `Block P2-V2.4` (Shared Ad Intelligence Prototype Preview `[Mock]` & Final Track A Handover Sign-Off) is verified locally and **awaiting manual Owner commit**.
   - `.git` metadata is absent inside `/app/applet`.

2. **`[CONSENT ARCHITECTURE CONFLICT — UNRESOLVED OWNER DECISION DEC-OPEN-01]`**:
   - Blueprint `v2.0`'s household accounts, multi-profile personalisation, dual-layer consent epochs, and `HTTP 403` QR revocation conflict with Phase 1/2's account-free direct `HTTP 302` (`ADR-002`) baseline. Competing Options A, B, and C are documented in `PRIVACY_SECURITY_AND_COMPLIANCE.md` and `DECISIONS_LOG.md`.
   - **No consent/profile/epoch-403 implementation is permitted or scheduled until the Project Owner resolves `DEC-OPEN-01` (blocks ONLY the remaining `15.0%` Track B AI Studio scope; does NOT block Phase 3 `TASK-P3-001` engineering hardening of Track A).**

3. **`[NORMAL TV REMOTE & SHARED AD INTELLIGENCE IMPLEMENTATION STATUS]`**:
   - **Normal Everyday TV Remote Control (`ADR-017` / `PRD-20`)**: Approved first-class core capability via `AURA → EDISON Control Engine → platform adapters → TV` (conventional commands separate from intelligent ad-break control), with software implementation **`NOT STARTED`** (Phase 4 adapters; zero physical TV hardware compatibility claimed or tested prior to `Stage P6`).
   - **Network-Wide Shared Ad Intelligence (`ADR-016` / `PRD-19`)**: `SharedIntelligencePreviewView` + `src/server/sharedIntelligencePreview.ts` provide an interactive **mock prototype simulation** demonstrating zero-PII enforcement, `K >= 3` corroboration gating, Sybil/outlier quarantine, scope-isolated offline cache fallback, and FPR automatic rollback.
   - **Production Central Shared Intelligence Service** (real device cryptographic attestation, fleet telemetry ingestion, SCTE-35/HbbTV pipeline, and Smart TV OS local cache daemons) remains **`NOT STARTED`** until **Phases 4–5**.

4. **`[GOOGLE AD MANAGER CTV FORMAT & ACCOUNT ELIGIBILITY — UNRESOLVED DEC-OPEN-03]`**:
   - Standard AdSense/AFV are ineligible for native CTV apps; GAM + IMA SDK is the official path, **but** EDISON holds zero GAM CTV account today (`MockAdNetworkBackfillAdapter` active), and whether GAM CTV supports third-party static banner or text-only backfill (vs VAST video only) remains **`UNRESOLVED`**.

5. **`[INACCESSIBLE / UNVERIFIED DEFERRED GITHUB CANDIDATES]`**:
   - Among the 9 named research candidates (`DEFERRED` to Phase 4/5; zero cloning/integration): `scottn12/Sports-Broadcast-Commercial-Detector` and `FlyingCow/remo` could not be verified publicly (`INACCESSIBLE / UNVERIFIED`); `abdullaabdullazade/audio-ad-detection` has `LICENCE UNVERIFIED`; `nicolasrondan/tv_commercial_break_detector` has partial public verification with unverified licence/history.

6. **`[PHYSICAL HARDWARE, BROWSER E2E & LEGAL RESEARCH BOUNDARIES]`**:
   - **Zero physical Smart TV hardware tests** have been executed—and **repeated physical testing is prohibited during development**, deferred strictly to **one final integrated physical test at app completion (`Stage P6`)**.
   - **Physical Phone QR Scan Gate**: Live runtime store records `0` owner-submitted smartphone camera scans (`PENDING_OWNER_DEVICE_TEST`); never fabricated in code.
   - **Chromium Playwright E2E & FFmpeg**: AI Studio container lacks Chromium & FFmpeg workers (`TASK-P3-003` / `TASK-P3-004` queued in Phase 3).
   - **Independent Legal Research Policy**: Country statutes (`COUNTRY_ACTIVATION_REGISTER.md`) are researched independently from public official sources with **no lawyer/legal counsel dependency**; **`ZERO LEGAL COMPLIANCE CLAIMED`** and all countries remain `NOT ACTIVATED`.
   - **Existing P2 Baseline Limits**: JSON atomic single-host store (`schemaVersion: 7`), public `/uploads/:filename`, zero real payment collection (`paymentCollectionActive: false`), and commercial business discovery / automated outreach strictly paused and locked.
