# EDISON — Testing Strategy

**Document Status**: Updated QA & Verification Strategy (`v2.2` — current test evidence and status are in [`EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md`](EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md); retain the single physical TV test at `Stage P6`)

---

## 1. Core Testing Governance Rule (Software-First, Single Final Hardware Check)

1. **Software-First Development Testing**: Throughout development (Phase 2 prototype through Phase 3 hardening and Phases 4–5 software integrations), EDISON verifies all logic, scheduling, UI, privacy boundaries, ad formats, QR routing, shared network intelligence, and failure recovery using **automated tests, browser automation, recorded video/stream fixtures, commercial-break simulations, and mock TV adapters (`SimulationTvAdapter`)**.
2. **NO Repeated Physical Smart TV Testing During Development**: Engineers and automated workflows must **not** require or conduct repeated physical television device test cycles during software development.
3. **ONE Final Integrated Physical Test (`Stage P6`)**: Exactly **one planned physical television & smartphone integration test** is executed at the very end after the complete software application is built and passes all software suites.
4. **Honesty Prohibition**: Never claim Smart TV hardware compatibility, tuner switching, or physical break detection is physically verified prior to that single final `Stage P6` test.

---

## 2. Verification Tiers

### Tier 1: Static & Build Verification (Every Change)
- TypeScript check (`npm run lint` / `tsc --noEmit`) — exit code `0`.
- Production bundle build (`npm run build` / `vite build`) — exit code `0`.

### Tier 2: Mandatory Automated Functional, Integration & Security Regression Suite (`Vitest` + `Supertest`)
All core and shared-intelligence software test scenarios must pass before final completion. `DEC-OPEN-01` is resolved and its prototype behavior is tested; production/hardware validation remains separate:

1. **Alternating Sequence Invariant**: Verify `CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL` ordering and zero consecutive same-category ads even when one pool is larger.
2. **Four-Advertisement Scheduling**: Verify 4-ad break schedules cleanly when remaining break time covers all 4 slots + switching + safety margin.
3. **Short-Break Adaptation**: Verify graceful adaptation (`4 -> 2 -> 1 -> 0`) preserving alternating category rules without cutting into live programme resumption.
4. **No-Inventory Scenarios**: Verify empty Charity or Commercial slots remain skipped/unused rather than looping or violating alternation.
5. **Direct-Paid Commercial Priority**: Verify approved Direct-Paid campaign always wins over higher-eCPM network inventory.
6. **Network Inventory Fallback**: Verify modular `AdNetworkAdapter` fills an unused Commercial slot only when Direct-Paid inventory yields zero matches (and never occupies Charity slots).
7. **Banner / Image Advertisements**: Verify Option A & Option B 16:9 image/banner validation, safe zones, and playback.
8. **Video Advertisements**: Verify MP4/WebM magic-byte/aspect/duration validation and preload readiness check.
9. **Text-Only Commercial Advertisements**: Verify creation, moderation, preview, and delivery of written-only commercial ads without image/video uploads.
10. **Multiple Profiles per TV**: Verify CRUD for multiple voluntary profiles under the approved household model.
11. **Single-Person Opportunity Matching**: Verify Required/Preferred/Optional scoring matches one eligible member without rejecting on optional gaps.
12. **Multiple-Person Household Matching**: Verify matching several household members produces plural personalisation safely.
13. **No-Match Scenarios**: Verify zero-match `CHARITY ADS` or unmatching profiles do not falsely claim a match.
14. **Personalised Display Names**: Verify preferred display names render cleanly on TV without showing qualifications, employment history, or contacts.
15. **Personalisation Consent Disabled / Opt-Out**: Verify neutral non-personalised display when individual consent is false or shared-TV privacy opt-out is set.
16. **Consent Withdrawal Behaviour**: Verify the approved bundled withdrawal behavior leaves ordinary TV unaffected.
17. **Profile Updates & Deletion**: Verify profile edits re-evaluate matches and deletion purges personalisation access immediately.
18. **Geographic Eligibility**: Verify regional/geo matching works accurately for Charity/Commercial targeting while blocking exact household coordinate/address leakage to advertisers.
19. **QR Access & Expiry**: Verify expired/revoked opportunities and campaigns reject `/r/:token` immediately (`HTTP 410 / 404` or `403` per approved rule) and cannot schedule.
20. **Advertiser Privacy Restrictions**: Verify advertisers cannot browse household profiles, coordinates, or member PII (`403` / sanitized aggregate metrics only).
21. **Revenue-Report Separation**: Verify separate reporting for Charity (`$0`), Direct-Paid, Network Estimated, Network Confirmed, Actual Received, and Refunds.
22. **Network-Provider Failures**: Verify `AdNetworkAdapter` timeout/error leaves Commercial slot unused cleanly with zero TV disruption.
23. **Duplicate Delivery Prevention**: Verify persistent idempotency and bot/prefetch filtering on delivery & QR events.
24. **Playback Failure & Safe Return to Television**: Verify watchdog timeout and simulated player crash restore ordinary TV immediately (`SimulationTvAdapter` + mock emulator fault injection).

#### Network-Wide Shared Ad Intelligence Software Tests (`v2.2` — Scenarios `25`–`35`, locally tested simulation)
25. **Multiple Simulated TVs Submitting Observations**: Verify concurrent simulated `SimulationTvAdapter` devices submit signed, scoped break-detection observations independently.
26. **Central Aggregation & Validation**: Verify schema checks, channel/broadcaster/country/platform validation, and single-device quarantine (**a single TV's observation MUST NEVER automatically become trusted network-wide intelligence**).
27. **Confidence Scoring & Corroboration**: Verify multi-TV agreement increments confidence across threshold (`K >= N` devices) before publishing a new versioned intelligence record.
28. **Conflicting Observations**: Verify disagreeing observations split/reduce confidence or quarantine outliers instead of silently overwriting trusted channel patterns.
29. **Automatic Background Synchronisation**: Verify simulated TVs pull compatible delta updates seamlessly without interrupting or pausing simulated live TV playback.
30. **Offline Cache Operation**: Verify a disconnected simulated TV operates cleanly from its `Local Intelligence Cache` and runs local detection independently with zero crashes.
31. **Reconnection & Update Delivery**: Verify queued observations upload on reconnect and validated newer intelligence versions download cleanly with idempotency.
32. **Invalid or Malicious Observations**: Verify spoofed device signatures, impossible durations, mismatched channels, and flooding rates are rejected (`401`/`400`/`429`) and audited.
33. **Version Compatibility Enforcement**: Verify updates tagged for `platform=Tizen` or `country=ZA` are never applied by an `Android TV / UK` simulator (no universal compatibility assumptions).
34. **Rollback Verification**: Verify both corrupted-checksum rejection and post-activation false-positive degradation automatically roll the `Local Intelligence Cache` (and central pointer) back to the prior known-good version.
35. **Privacy Isolation Audit**: Verify observation submissions, central records, and distributed intelligence bundles contain **zero** household IDs, individual profiles, precise locations, personal viewing histories, or private ad/opportunity interactions.

### Tier 3: Browser E2E, Recorded Media & Emulator Verification (`Playwright`)
- End-to-end browser verification across commercial text/banner/video creation, pre-submit 16:9 preview, break simulator, admin moderation, QR scan inspection, and recorded stream fixtures — no repeated physical hardware cycles required.

### Tier 4: Single Final Integrated Physical Test (`Stage P6`)
- Executed **exactly once after application completion** on one explicitly supported Smart TV device + smartphones to confirm real playback, remote Return-to-TV, physical QR scanning, watchdog recovery, local intelligence cache persistence, and approved consent behavior.
