# EDISON — Current Limitations and Release Readiness

**Status:** Pre-production. This document distinguishes code and test evidence from deployed services, external approvals, legal review, and physical-device results. Passing software tests do not establish production readiness.

## Application and infrastructure

- The public Cloudflare Worker is a limited preview. Its compatibility endpoint reports `applicationApiReady: false`, `mediaUploadReady: false`, and `mediaProcessingReady: false`.
- The Worker uses D1 bindings for authentication and domain records, but the application also has in-memory state. Restart durability and full production data-path readiness are not established by the public preview.
- The R2 binding and local adapter exist, but R2 is not active and the remote bucket has not been created. Durable media upload is unavailable.
- The Node.js FFmpeg worker is for compatible Node environments only. Media processing is explicitly disabled in Cloudflare Workers; no remote transcoding provider is selected.
- Production backups, restore drills, monitoring, alerting, incident response, and an external security review have not been completed.

## Product integrations and real-world operation

- TV-control adapters, shared ad intelligence, and break behavior have software tests, but no physical Smart TV transport or device compatibility has been verified.
- No live broadcaster, advertising-network, publisher, settlement, payment-provider, or KYC integration is verified.
- Payment collection is disabled. Advertiser estimates and revenue examples must not be presented as collected money or live campaign performance.
- There is no verified commercial launch authorization or operating support process.
- The intended product release is simultaneous, not a series of country or region launches. Per-country and per-region activation decision endpoints are retired and return HTTP 410; they do not gate ad delivery.

## Geographic targeting

- Campaign selection uses campaign `targetRegions`; geographic selection is for ad targeting, not service availability.
- A campaign can use the `GLOBAL` target token, but this does not prove that EDISON has worldwide users, inventory, valid location data, or legal authorization to serve ads in every location.
- The built-in geography profiles cover six grouped market labels and selected subregions. The list is incomplete, includes a combined Kenya/Nigeria profile and a grouped EU profile, and is not an authoritative world-boundary dataset.
- No complete country/region polygon dataset, verified TV location source, radius targeting, device-movement verification, or global targeting accuracy has been established.

## Privacy, cookies, and legal readiness

- Household location, consent state, and optional member education/career profiles exist in the application model. Production data minimization, purpose configuration, access review, and retention enforcement still require end-to-end verification.
- Authentication uses a session cookie and a CSRF cookie; see the draft Cookie Policy for implementation details. The current source review did not identify a cookie preference interface or non-essential analytics cookie.
- Source code defines selected session, QR, and audit retention settings, but a complete production retention and backup-deletion schedule is not verified.
- Draft Privacy, Cookie, and Terms documents are in `docs/legal/`. They contain unresolved owner facts and are **not approved for publication**. Qualified counsel must review them against actual data flows and applicable jurisdictions.
- The jurisdiction register is a non-exhaustive issue list, not legal advice or a compliance certification. No formal legal opinion, regulator approval, registration confirmation, or external privacy audit is verified.
- Region residency manifests are blueprints only. They do not prove actual production storage locations or prevent cross-border access.
- The code includes consent and privacy controls, but they must be validated against each production integration and applicable rules before use.

## Progress accounting

The executable subphase ledger in [`execution-ledger.json`](execution-ledger.json) is the authoritative software-task count. It measures completed subphases; it is not a percentage of commercial readiness, legal compliance, or launch readiness. The current fraction is reproduced by `npm run progress`.

The final physical TV-and-phone procedure is documented in [`docs/testing/STAGE_P6_PHYSICAL_TEST_RUNBOOK.md`](docs/testing/STAGE_P6_PHYSICAL_TEST_RUNBOOK.md). No physical device results are claimed.
