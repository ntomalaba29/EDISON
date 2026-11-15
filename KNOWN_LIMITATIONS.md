# EDISON — Known Limitations

**Honesty Standard**: Separates verified Phase 2 baseline + `Block P2-V2.1` code, approved `v2.2` Shared Ad Intelligence requirements (`NOT STARTED`), consent-blocked decisions (`DEC-OPEN-01`), unresolved external constraints, and physical testing restrictions. Overall completion stands at **15.5% of the full 15-phase international commercial app** (`84.5%` remaining), **25.0% of the software-to-`Stage-P6` milestone**, and **62.0% of the AI Studio prototype assignment**.

1. **`[BLOCK P2-V2.1 VERIFIED ON DISK — AWAITING OWNER COMMIT]`**:
   - Prior `P2-FIX.6`, Blueprint `v2.1`, and Blueprint `v2.2` batch was confirmed committed by the Project Owner (`"I've committed"`).
   - `Block P2-V2.1` (`$0.00 / FREE` Charity/job lock, Commercial `Text-Only` Ad mode, 7-stream revenue types, `LiveReportSnapshot.progressMetrics`, `schemaVersion: 7`) is verified locally and **awaiting manual Owner commit** before unlocking `Block P2-V2.2`.
   - `.git` metadata is absent inside `/app/applet`.

2. **`[CONSENT ARCHITECTURE CONFLICT — UNRESOLVED OWNER DECISION DEC-OPEN-01]`**:
   - Blueprint `v2.0`'s household accounts, multi-profile personalisation, dual-layer consent epochs, and `HTTP 403` QR revocation conflict with Phase 1/2's account-free direct `HTTP 302` (`ADR-002`) baseline. Competing Options A, B, and C are documented in `PRIVACY_SECURITY_AND_COMPLIANCE.md` and `DECISIONS_LOG.md`.
   - **No consent/profile/epoch-403 implementation is permitted or scheduled until the Project Owner resolves `DEC-OPEN-01`.**

3. **`[REMAINING APPROVED CORE FEATURES — IMPLEMENTATION NOT STARTED]`**:
   - **Remaining Unblocked Track A (`P2-V2.2` & `P2-V2.3`)**: Alternating 4-Slot Break Scheduler (`CHARITY -> COMMERCIAL` with Direct-Paid priority + mock `AdNetworkAdapter` in `SimulationTvAdapter`), 7-stream revenue ledger analytics UI, and `Vitest`/`Supertest` regression suite.
   - **Network-Wide Shared Ad Intelligence (`v2.2`, `ADR-016` / `PRD-19`)**: Central Shared Intelligence Service, multi-TV corroboration threshold & anti-poisoning quarantine, background sync, offline-capable `Local Intelligence Cache`, rollback mechanics, and software verification scenarios `25`–`35` are **APPROVED CORE REQUIREMENTS** whose code implementation is **`NOT STARTED`** (targeted cleanly for software implementation in Phase 5).
   - **Blocked on `DEC-OPEN-01` (`15%` of AI Studio Assignment)**: Household 7-level geo accounts, multiple voluntary profiles per TV, matcher, named TV greetings, consent epochs, `HTTP 403` post-withdrawal QR enforcement, and multi-profile mobile Opportunity Card.

4. **`[GOOGLE AD MANAGER CTV FORMAT & ACCOUNT ELIGIBILITY — UNRESOLVED DEC-OPEN-03]`**:
   - Standard AdSense/AFV are ineligible for native CTV apps; GAM + IMA SDK is the official path, **but** EDISON holds zero GAM CTV account today, and whether GAM CTV supports third-party static banner or text-only backfill (vs VAST video only) remains **`UNRESOLVED`**.

5. **`[INACCESSIBLE / UNVERIFIED DEFERRED GITHUB CANDIDATES]`**:
   - Among the 9 named research candidates (`DEFERRED` to Phase 4/5; zero cloning/integration): `scottn12/Sports-Broadcast-Commercial-Detector` and `FlyingCow/remo` could not be verified publicly (`INACCESSIBLE / UNVERIFIED`); `abdullaabdullazade/audio-ad-detection` has `LICENCE UNVERIFIED`; `nicolasrondan/tv_commercial_break_detector` has partial public verification with unverified licence/history.

6. **`[PHYSICAL HARDWARE & LEGAL RESEARCH BOUNDARIES]`**:
   - **Zero physical Smart TV hardware tests** have been executed—and **repeated physical testing is prohibited during development**, deferred strictly to **one final integrated physical test at app completion (`Stage P6`)**.
   - **Independent Legal Research Policy**: Country statutes (`COUNTRY_ACTIVATION_REGISTER.md`) are researched independently from public official sources with **no lawyer/legal counsel dependency**; **`ZERO LEGAL COMPLIANCE CLAIMED`** and all countries remain `NOT ACTIVATED`.
   - **Existing P2 Baseline Limits**: JSON atomic single-host store (`schemaVersion: 6`), public `/uploads/:filename`, zero real payment collection (`paymentCollectionActive: false`), commercial outreach strictly locked, AURA deferred.
