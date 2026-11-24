# EDISON — AI Studio Handoff and Executable Subphase Ledger

**Status snapshot:** 2026-11-24 (atomic task ledger; 76/97 executable substages complete; free Cloudflare preview deployed, media storage deferred)
**Audited starting snapshot:** `main` at `ba1ea76` (`docs: record GitHub Actions startup failure`), clean and tracking `origin/main` before this documentation subphase.  
**Authority:** This file is the current implementation-status and next-work source of truth. The weighted percentages and older checkpoint labels in the roadmap, tracker, README, and command-centre history are historical and must not override this ledger.

## 1. Atomic execution ledger

The rewritten ledger defines **one task for one verifiable substage**. A task is complete only after implementation, focused tests, a production/repository check where relevant, status reporting, and the scoped commit/push handoff. External actions—billing, providers, hardware, legal review, and commercial authorization—remain explicitly blocked or deferred.

**Current arithmetic:** **76 / 97 executable substages = 78.4%**. Worker compatibility is split into authentication/session, business APIs, filesystem/media behavior, and restart/migration checks. Media adaptation is split into validation/storage separation, provider-backed durable storage, and compatible media execution; remote R2 billing is deferred and compatible media execution still requires provider approval. Tasks 3.6, 5.10j1–5.10j11, 5.10k1–5.10k3, and 5.11a are verified. Run `npm run progress` to reproduce the fraction.

### 15-phase sequence

1. Definition and research
2. Functional prototype
3. Engineering hardening
4. TV control and adapters
5. Break intelligence and Cloudflare compatibility
6. Advertising delivery and news distribution
7. Advertiser and publisher operations
8. Creative rendering
9. Opportunity and editorial operations
10. Privacy and security readiness
11. Reliability
12. Pilot readiness
13. Commercial readiness
14. Country activation
15. International expansion

Then **Stage P6**, the one final physical test.

### Atomic Phase 5.10 execution path

| Task | Objective | Completion evidence | Status |
|---|---|---|---|
| 5.10j1 | Reconstruct remaining domain collections on D1 after process restart | Store reconstruction test covering pilot, commercial, country, expansion, and reliability collections | **DONE** |
| 5.10j2 | Serve advertiser targeting aggregates from D1-backed, consented household state | Restart HTTP test verifies location-level aggregation, consent withdrawal, and no exact-location exposure | **DONE** |
| 5.10j3 | Serve revenue ledger from D1-backed campaigns and analytics | Owner-scoped campaign estimates survive store reconstruction; payment collection stays disabled | **DONE** |
| 5.10j4 | Serve QR-watch link and measured-event details from D1 | Restart test verifies owner-only access, 404/403 behavior, and measured-event filtering | **DONE** |
| 5.10j5 | Read admin advertiser-profile listings from D1 | Admin listing reflects D1 profiles after store reconstruction; non-admin remains forbidden | **DONE** |
| 5.10j6 | Reconcile commercial disputes against D1 revenue-ledger inputs | Restart test shows persisted campaigns and disputes while payment collection remains off | **DONE** |
| 5.10j7 | Complete the remaining application-read source inventory | Remaining JSON-only reads are classified; concrete business-data gaps become scoped tasks | **DONE** |
| 5.10j8 | Build opportunity-operations overview from D1 | Restart test verifies opportunities, complaints, appeals, and campaigns contribute to the actor-scoped overview | **DONE** |
| 5.10j9 | Build privacy-compliance overview from D1-backed state | Restart test verifies household, consent, QR, and session evidence is reflected without cross-actor exposure | **DONE** |
| 5.10j10 | Build prototype-readiness snapshot from D1 | Restart test verifies persisted campaign, creative, opportunity, analytics, and physical-test evidence; hardware remains untested | **DONE** |
| 5.10j11 | Build foundation and live-report summaries from persisted inputs | Health, auth summary, and live report return restart-stable D1-backed counts with no stale JSON totals | **DONE** |
| 5.10k1 | Make Worker startup filesystem-independent and serve health/live reports | Local `workerd` starts without filesystem writes; `/api/health` and `/api/reports/live` return HTTP 200 with `memory_only` state and D1-backed summary fields | **DONE** |
| 5.10k2a | Verify public and authentication/session routes in local `workerd` | CSRF bootstrap, unauthenticated identity, registration, login, and session operations return expected responses through D1 | **DONE** |
| 5.10k2b | Verify protected campaign, QR, opportunity, and reporting routes in local `workerd` | Representative reads and writes return expected authorization and D1-backed results in local `workerd` | **DONE** |
| 5.10k2c | Define Worker behavior for filesystem-backed docs and media routes | Documentation works without local filesystem access; unsupported media execution fails explicitly rather than as an internal error | **DONE** |
| 5.10k3 | Verify Worker restart durability and explicit D1 migration requirements | Restart, migration, and failure-recovery checks pass | **DONE** |
| 5.11a | Separate validated media bytes from filesystem persistence | Pure validation returns safe bytes and metadata; the existing Node file path and upload behavior remain unchanged | **DONE** |
| 5.11b | Add a durable object-storage adapter for validated media | Upload and retrieval use an owner-approved object store with path/content-type safeguards | **PARTIAL — local R2 adapter and Worker upload/read verified; owner chose to keep the preview free-only, so remote R2 and durable uploads remain off** |
| 5.11c | Integrate a compatible media-processing service | Probe/transcode jobs run in a selected compatible service with durable job/output evidence | **BLOCKED — no free hosted provider is selected; browser-side FFmpeg/WASM is a no-cost candidate, not integrated or production-verified** |

**5.10k1 evidence (2026-11-22):** `npm run dev:cloudflare` built and started local Wrangler successfully. Local `GET /api/health` and `GET /api/reports/live` both returned HTTP 200; health reports `memory_only` for the isolate-local domain store and D1 for application-record summary inputs, without claiming durable domain storage. TypeScript, focused media-worker tests (2 passed), lazy-initialization coverage, and the two slow D1 persistence tests (2 passed with an increased test timeout) passed. Media output directories are now created only when a transcode job executes. No remote migration, deployment, or hardware test was performed.

**5.10k3 / 5.11a evidence (2026-11-22):** With Wrangler pointed at a fresh local D1 database, registration, login/logout, campaign/QR writes and reads passed; after stopping and restarting the Worker, user/profile/campaign/QR counts remained in D1. `wrangler d1 migrations list --local` reported no unapplied migrations. A Worker configuration without an `EDISON_DB` binding returned HTTP 503 `CLOUDFLARE_D1_NOT_BOUND`. The temporary database was removed after testing. Media byte validation now produces a storage-neutral `Uint8Array` payload before the existing Node filesystem adapter writes it; validation and existing upload-security regression tests passed (3 selected tests), as did TypeScript, a production build, and Worker health/docs smoke. No remote migration or deployment occurred.

**5.11b local evidence (2026-11-24):** The R2 adapter supports Cloudflare Web streams, validates key/content-type consistency, and safely serves uploaded bytes. Focused media tests (11 passed) and a live local Worker upload/download round-trip passed byte-for-byte. The owner chose to keep the preview free-only after reviewing the R2 subscription terms; no R2 subscription, bucket, or binding was created, and remote uploads remain unavailable.

### 5.10j7 read-source inventory

The route audit in `src/server/app.ts` classifies the remaining read sources as follows:

| Classification | Routes / sources | Decision |
|---|---|---|
| D1-primary business reads | QR links, advertiser profiles, campaigns, creatives, support tickets, opportunities/complaints/appeals, moderation overview, funnel/revenue analytics, physical QR tests, QR watch/events, advertiser targeting, household/member/consent records, pilot/commercial/country/expansion readiness, reliability report, delivery and advertiser/broadcast overviews, AURA devices, and commercial disputes | Existing D1 repository reads remain primary; store-only fallback when no D1 repository is configured is the supported local JSON mode. |
| Business-data reads still JSON-backed | `/api/opportunity-ops/overview`; `/api/compliance/overview`; `/api/qa/prototype-readiness` (only physical QR tests are hydrated); `/api/health`, `/api/reports/live`, and `/api/auth/me` summary (foundation counts) | Split into 5.10j8–5.10j11 respectively; do not treat these summaries as D1-parity evidence until their tasks pass restart tests. |
| Intentional static/repository reads | Governance docs, i18n bundles, regional deployment manifests, Track B country configuration, TV adapter capability/channel profiles, break-predictor profiles | Static code or repository files; not user-persisted application records. |
| Intentional process-local simulation/diagnostics | Offline cache, shared-intelligence fleet simulation, AURA discovery simulation, request/observability/delivery metrics, media-worker job diagnostics, and local database/migration status | Runtime-local by design; explicitly not durable D1-backed state or production/hardware evidence. |
| Intentional local migration tooling | PostgreSQL verification imports `data/edison-store.json` when present, otherwise builds a local store snapshot | Local migration test utility, not a production application read API. |
| Compatibility fallbacks to JSON store | Individual advertiser-profile/household misses and legacy local-mode fallback branches | Preserved for compatibility; Worker enablement must verify that D1 is seeded and must not mistake local fallback data for D1 persistence. |

| Phase / stage | Completed / total |
|---|---:|
| Phase 1 — Definition and research | 3 / 3 |
| Phase 2 — Functional prototype | 8 / 8 |
| Phase 3 — Engineering hardening | 6 / 7 |
| Phase 4 — TV control and adapters | 3 / 5 |
| Phase 5 — Break intelligence and Cloudflare compatibility | 35 / 37 |
| Phase 6 — Ad delivery and news distribution | 2 / 6 |
| Phase 7 — Advertiser and publisher operations | 2 / 4 |
| Phase 8 — Creative rendering | 2 / 3 |
| Phase 9 — Opportunity and editorial operations | 2 / 4 |
| Phase 10 — Privacy and security readiness | 4 / 5 |
| Phase 11 — Reliability | 2 / 3 |
| Phase 12 — Pilot readiness | 2 / 2 |
| Phase 13 — Commercial readiness | 1 / 3 |
| Phase 14 — Country activation | 2 / 3 |
| Phase 15 — International expansion | 2 / 3 |
| Stage P6 — One final physical test | 0 / 1 |
| **Overall** | **75 / 97** |

These are **subphase counts**, not the older weighted business-progress percentages. “Completed” means the software/documentation deliverable met its stated local acceptance criteria and its test evidence is recorded. It does **not** imply production deployment, legal compliance, commercial authorization, or real-TV compatibility.

The phase/stage counts above sum to **75 / 97 executable substages (77.3%)**. This direct sum is maintained in `execution-ledger.json` and reproduced with `npm run progress`; no historical weighted percentage is used for current reporting.

### Status vocabulary

- **DONE** — deliverable and acceptance criteria are complete; verification is recorded below or in the named test.
- **BLOCKED** — implementation or evidence is waiting on a concrete external blocker; do not mark complete.
- **PENDING** — not started; available for work only after its prerequisites and any owner decisions are satisfied.
- **DEFERRED** — intentionally held for an owner, legal, commercial, deployment, or one-time hardware gate.

Every subphase must be completed, verified, reported, reviewed, and committed as one unit. If it cannot meet all acceptance criteria in one bounded task, split it before implementation. Do not mark a subphase complete on the strength of a plan, mock, UI, or a passing test that does not cover its acceptance boundary.

## 2. Baseline and “test once” record

The recorded Windows local baseline was run against the code snapshot committed as `0281d36`; `ba1ea76` added documentation only. The latest Linux CI run below verifies the published `main` commit `aeaccd4`; it does not include the current uncommitted media changes.

- `npm ci` — passed; npm reported no vulnerabilities.
- `npm run lint` — passed.
- `npm run build` — passed; Vite emitted a large-chunk advisory for the approximately 1.33 MB JavaScript chunk.
- `npm run test:e2e` — passed, 1/1.
- Vitest — 89 passed, 1 skipped. Command: `npm test -- --maxWorkers=2 --testTimeout=60000`, with `EDISON_FFMPEG_BIN` and `EDISON_FFPROBE_BIN` pointing to temporary Windows binaries outside the repository. The skipped symlink test reported Windows `EPERM`; the test remains enabled on Linux.
- Environment — Windows, Node.js `22.23.5`, npm `10.9.9`.
- GitHub Actions — run [45293498597](https://github.com/ntomalaba29/EDISON/actions/runs/45293498597) passed on 2026-11-24 for published `main` commit `aeaccd4e0d6b44813dab3ee7531ae3b4e83c1027`. Ubuntu CI completed type-check, PostgreSQL 16 migrations, all **155 Vitest tests across 35 files**, **2 Playwright E2E tests**, and production build. This resolves Phase 3.6 for that commit; it is not CI evidence for the current uncommitted media changes.
- The owner authorized local feature work to continue while Phase 3.6 remains blocked. This is a sequencing exception only: it does not mark 3.6 complete or verify Linux.

**Phase 4.5 verification (2026-11-18):** `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd test -- --maxWorkers=2 tests/formalReport.test.ts` (5 tests), `npm.cmd run test:e2e -- tests/e2e/tvAppControls.spec.ts` (1 test), and `git diff --check` passed. The focused browser test verifies the phone's ordinary AURA Back command, the TV-app Ad/Back path, and automatic return after simulated ad playback. Run Playwright from the repository's canonical `C:\Users\HP\Desktop\Malaba\EDISON` path spelling on this machine; the alternate casing triggered duplicate Playwright module resolution. The production build retains its existing large-chunk advisory. These results validate a software simulation only.

**Phase 5.4 verification (2026-11-18):** `npm.cmd run lint`, `npm.cmd test -- --maxWorkers=2 tests/sharedIntelligence.test.ts tests/securityHardening.test.ts tests/formalReport.test.ts` (29 passed, 1 platform-specific skip), `npm.cmd run build`, and `git diff --check` passed. The focused service and authenticated API tests verify Ed25519-signed UTC break events, stable channel IDs independent of TV platform, cross-TV peer sync, freshness, nonce replay and event-ID reuse rejection, per-source deduplication, flood throttling, conflicting-start holdback, scope/channel binding, and zero-PII rejection. Event endpoints identify their results as software simulation only (`hardwareTested: false`). This is process-memory simulation, not durable fleet storage, live device attestation, or cross-home production synchronization.

**Phase 5.5 verification (2026-11-18):** Opt-in AES-256-GCM persistence atomically stores and restores the Ed25519 fleet signing key, registered device keys, signed bundles, observations and replay/rate state, timestamped break events, counters, and bounded audit history. Restore validates schema, signing-key consistency, and bundle signatures; missing/wrong keys fail closed. `npm.cmd run lint`, the focused Phase 5.5/5.6 test suite, production build, and `git diff --check` passed. The encrypted local file is development persistence, not a production database or managed key service.

**Phase 5.6 verification (2026-11-18):** Added one-shot local key rotation via `EDISON_SHARED_INTEL_ROTATE_TO_KEY`. To rotate, back up the encrypted state file and current key; set `EDISON_SHARED_INTEL_STORAGE_KEY` to the current key and `EDISON_SHARED_INTEL_ROTATE_TO_KEY` to a new, distinct 64-hex-character key; run `npm.cmd run dev`. The command decrypts with the current key, atomically re-encrypts the complete fleet state under the new key, and exits without starting the web server. Then set `EDISON_SHARED_INTEL_STORAGE_KEY` to the new key and clear `EDISON_SHARED_INTEL_ROTATE_TO_KEY` before starting normally. Invalid/same keys do not replace the file; tests restore the same fleet state with the new key and verify the old key fails closed. A temporary-file smoke test also verified the server command exits and the rotated file reopens with the new key. Key recovery is owner-managed: retain an off-repository backup of the current key; lost keys cannot be recovered by EDISON. TypeScript, 8 shared-intelligence tests, 31 focused shared-intel/API/report tests (1 platform skip), build, and diff checks passed. The build retains the existing large-chunk advisory.

**Phase 5.7 verification (2026-11-18):** Bound signed break-event submissions, conflict matching, persistence, and receiver sync to both canonical channel and `decoderProfileId`. Registration assigns each attested device an opaque shared decoder/feed profile; the profile is included in the event signature, and mismatched source claims are rejected. Same-channel break reports for different profiles remain independent, and a receiver sees only events matching its assigned profile. Existing encrypted states without the new fields restore using a dedicated legacy profile, keeping old devices/events mutually compatible without mixing them into new profiles. TypeScript, 33 focused shared-intelligence/API/formal-report tests (1 platform-specific skip), production build, and `git diff --check` passed. The 1.35 MB client bundle still produces the existing Vite chunk-size advisory. This is profile-scoped software simulation, not physical decoder integration or deployed fleet synchronization.

**Phase 5.8 verification (2026-11-18):** Added a Cloudflare D1-compatible break-event storage adapter and a dedicated SQLite migration under `migrations/cloudflare-d1/`, separate from the existing PostgreSQL migrations. The schema enforces zero-PII storage, canonical UTC timestamps, and valid event/profile/channel identifiers; indexed queries require both channel and decoder profile and omit conflict-held events. The adapter validates records and DB results, bounds query size, supports safe idempotent updates, and rejects record-ID rebinding across event identities. TypeScript, the focused D1 migration/adapter tests (2 passed), and `git diff --check` passed. Tests execute the migration using Node's local SQLite implementation through a D1-compatible binding; no live Cloudflare D1 instance or Workers deployment was used for this phase. A separate free-tier D1 database was provisioned later for local Wrangler binding verification. Node emits its expected experimental SQLite warning.

**Cloudflare compatibility research (2026-11-18):** Cloudflare Workers can bridge Node HTTP servers with `cloudflare:node`'s `httpServerHandler`, and Wrangler can serve a Vite-built SPA alongside Worker routes. The Node filesystem in Workers is virtual; `/tmp` is request-scoped and is not durable, so it cannot back EDISON's current JSON-file store or uploaded-media files. EDISON also uses `child_process` for FFmpeg, which needs a separate compatible execution approach rather than running directly inside a Worker. Wrangler's local `workerd` runtime can exercise a Worker and simulated bindings without an account. Sources: [Node.js HTTP](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/), [Node.js filesystem](https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/), [Workers static assets](https://developers.cloudflare.com/workers/static-assets/binding/), [local development](https://developers.cloudflare.com/workers/local-development/), and [React + Vite](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/). This research used Cloudflare's public documentation; no Cloudflare AI or account assistant was available in this session.

**Phase 5.9 verification (2026-11-18):** Added Wrangler local development, a Workers Node HTTP/Express compatibility shell, and SPA asset routing without exposing the incomplete Worker (`workers_dev` is disabled). The Worker build passes `wrangler deploy --dry-run`. Local `workerd` smoke tests returned 200 for `/api/_cloudflare/compatibility`, explicit 503 for unported `/api/*`, and 200 for both `/` and a client-side SPA route. The initial local run exposed Cloudflare Workers SDK issue [#9309](https://github.com/cloudflare/workers-sdk/issues/9309): `iconv-lite`'s `browser` false mappings cause `require_streams(...) is not a function`. Added an idempotent install-time metadata patch for those mappings; the local Worker then started and passed the route checks. Workerd initially could not start because this Windows host lacked the standard x64 VC runtime; with the owner's approval, Microsoft's signed Visual C++ Redistributable was installed, and no restart was required. A free-tier Cloudflare account and separate `edison-staging` D1 database now exist; Wrangler binds `EDISON_DB` to this database in local mode. After adding that binding, `npm run dev:cloudflare` reported the local D1 binding and returned 200 for the compatibility route and SPA routes, plus explicit 503 for an unported API route. Migrations 0001–0003 have only been applied to Wrangler's local D1 simulator; no remote migration, deployment, paid-plan upgrade, or change to existing Cloudflare resources occurred. `workers_dev` remains disabled. This is still a runtime shell only: application APIs deliberately remain unavailable until the persistence and media milestones are complete. Earlier `npm run lint`, `npm run build`, and `git diff --check` passed; `npm audit` still reports six high-severity findings in the existing Vite/picomatch dependency chain, and no broad dependency upgrades were applied.

**Cloudflare reference inspection (2026-11-19):** With the owner's shared dashboard, inspected the `pescon` production Worker read-only. It uses its `workers.dev` hostname, has no custom domain or route, binds one D1 database, separates Production and Preview settings, keeps secret values encrypted, persists Worker logs, leaves traces disabled, and is deployed manually through Wrangler; it also has a five-minute cron trigger. Its compatibility date/`python_workers` flag and cron are project-specific and were not copied. EDISON's existing `edison-staging` D1 binding remains separate. Per the owner's preference, `workers_dev` is now `true` in `wrangler.jsonc` for a future free-hostname deployment; this is configuration only, not a deployment. Wrangler CLI is not authenticated in this shell, and no setting, secret, database, or deployment in `pescon` was changed. EDISON's Worker still returns explicit 503 for application APIs until persistence and media compatibility are complete.

**Phase 5.10a verification:** Added migration `0002_application_records.sql` and an asynchronous D1 record store that persists independently keyed records rather than one unbounded application-state blob. The migration constrains collection and record identifiers, valid JSON payloads, per-record size, timestamps, and owner indexing; the adapter applies caller-supplied runtime codecs, bounds list queries, supports owner filtering, and surfaces unsuccessful D1 operations. The focused application-record and break-event tests pass (4 total), `npm run lint` passes, and Wrangler applied migration 0002 to the **local** `edison-staging` simulator. No application API was switched to this adapter.

**Phase 5.10b verification:** Added migration `0003_auth_sessions_audit.sql` and `D1AuthSessionStore` for unique normalized accounts, scrypt password hashes, hashed session tokens, CSRF/session expiry state, and bounded auth audit retention. Registration writes the user, rotated/pruned sessions, and audit record in a D1 batch; login, logout, session touch/lookup, production demo-account blocking, and security audit writes use D1 and fail explicitly on DB errors. Tests cover duplicate registration rollback, restart-by-reconstruction reads, token hashing, login failure audit, session rotation/touch/idle and absolute expiry, logout, and the 500-record audit cap. Wrangler applied migration 0003 to the **local** `edison-staging` simulator. Focused D1 tests pass (7 total), `npm run lint` passes, and the existing security suite passes (18 passed, 1 platform skip) with a 30-second per-test timeout. No Express route or Worker API is wired to this adapter yet; that asynchronous integration is tracked separately in 5.10c. No remote migration or deployment occurred.

**Phase 5.10c verification:** Added an async-compatible auth/session repository boundary and wired D1-backed session attachment/touch, registration, login, logout, and CSRF rejection audits into Express 4 using an async-handler that forwards failures to the existing API error middleware. Authenticated advertiser registration still initializes the existing domain profile store; its missing-profile defaults now match the registration defaults. D1 operation exceptions receive explicit operation codes so infrastructure failures return the standard 500 response rather than an authentication conflict. The focused D1 auth HTTP/store and API regression tests pass (12 total), `npm run lint` passes, and `git diff --check` passes. Other API audit call sites and admin audit-log listing/export remain on the existing repository and are tracked in 5.10d. No Worker API was enabled, and no remote migration or deployment occurred.

**Phase 5.10d verification:** Admin audit listing and JSON/CSV export now merge D1 auth/security records with existing JSON/domain audit rows, sort the combined result newest-first, enforce the 500-row bound, and await export audit persistence. D1 audit-read and audit-write failures are covered and reach the standard Express 500 middleware. Focused D1 HTTP/store/API tests pass (13 total), `npm run lint` passes, and `git diff --check` passes. Direct route-level audit call sites outside the auth/admin boundary are separately tracked in 5.10e. No remote migration or deployment occurred.

**Phase 5.10e verification:** Replaced direct route-level `store.recordSecurityAudit` calls with a centralized dual-write helper that immediately preserves existing JSON/domain audit records and queues D1 audit writes. A response-drain middleware waits for queued D1 writes before sending JSON or text responses and forwards D1 failures to `apiErrorMiddleware`. With no separate D1 repository, JSON audit writes remain a single record. Focused D1 auth, route-audit, API, and security suites pass (32 passed, 1 platform skip), `npm run lint` passes, and `git diff --check` passes. No remote migration or deployment occurred.

**Phase 5.10f verification:** Added `D1DomainRecordRepository` over the existing bounded application-record store and wired advertiser-profile and QR-link creation, update, status, and list/read operations to D1 when injected. A profile is initialized during D1 registration, and QR/profile writes are explicitly mirrored to D1. D1 write/read failures use standard Express error handling where the route has no valid JSON fallback; JSON-backed behavior remains unchanged when no domain repository is injected. Focused D1 application/auth/domain and API regression suites pass (18 total), `npm run lint` passes, and `git diff --check` passes. No media routes or Worker APIs were enabled, and no remote migration/deployment occurred.

**Phase 5.10g verification:** Added campaign collection methods to `D1DomainRecordRepository` and wired campaign list/create/update/clone/transition/delete routes to mirror JSON domain records into D1 when injected. Owner/admin scoping is preserved by owner-filtered D1 reads or the admin unscoped read, and campaign status filtering remains server-side. The campaign lifecycle test verifies create, list, update, clone, valid draft-to-expired transition, and delete. Focused D1 application/auth/domain/API suites pass (19 total), `npm run lint` passes, and `git diff --check` passes. No Worker API or remote migration/deployment was enabled.

**Phase 5.10h verification:** Added support-ticket collection methods to `D1DomainRecordRepository` and wired support-ticket list/create/status routes to mirror JSON domain records into D1 when injected. Owner/admin visibility is preserved through owner-filtered or unscoped D1 reads, while existing JSON status-update authorization remains unchanged. The focused HTTP test verifies owner creation, list visibility, close/status persistence, and D1 restart-style reads. D1 application/auth/domain/API suites pass (20 total), `npm run lint` passes, and `git diff --check` passes. No media routes, opportunity/household collections, Worker API, remote migration, or deployment were enabled.

**Phase 5.10i verification:** Added ad-creative collection methods to `D1DomainRecordRepository` and wired ad-creative list/create/update/attach/delete routes to mirror JSON domain records into D1 when injected. Owner/admin visibility remains preserved, attach writes both creative and campaign records, and delete removes the D1 creative record. The focused HTTP test verifies text-only create/list/update/attach/delete persistence. D1 application/auth/domain/API suites pass (21 total), `npm run lint` passes, and `git diff --check` passes. No media upload/transcode execution, opportunity/household collection, Worker API, remote migration, or deployment was enabled.

**Phase 5.10j initial local D1 collection slices (historical note):** Added D1 collections and Express persistence for opportunities, complaints, appeals, households, profiles, QR/consent records, physical scan logs, pilot cohorts, commercial readiness, and analytics while preserving owner/admin scopes, redaction, and consent epochs. The then-current work was intentionally not counted as complete because the broad milestone included additional reads and restart checks; it is now decomposed into 5.10j1–j4.

**Latest 5.10j update:** Standard and household QR redirects now hydrate and persist D1 state; delivery manifests, analytics funnel, advertiser-ops/pro-forma, broadcast-render, and admin moderation reads consume D1 collections, and admin QR/creative moderation writes persist to D1. Commercial dispute create/list/resolve, AURA paired-device state, and Shared Intelligence preview state now persist and reload with their privacy and safety invariants. The latest combined D1/Shared Intelligence suite passes 29 tests; API/Track B and security regressions pass; dedicated AURA/OEM tests pass; TypeScript lint and a production build to a temporary output directory succeed. These are local compatibility results only, and the Worker API, some collections/report routes, media compatibility, remote migration, and deployment remain incomplete.

**Phase 5.10j1 verification:** Existing D1 HTTP coverage reconstructs pilot cohorts, Stage P6 prep notes, commercial assumptions/board decisions, country policy/launch decisions, regional localization/expansion decisions, and the latest reliability report in a new app/store instance. Covered by the focused `tests/d1AuthSessionApp.test.ts` run (20 passed, including this coverage), TypeScript check, and diff check. Local D1 compatibility only.

**Phase 5.10j2 verification:** `/api/advertiser/targeting-aggregates` reads eligible household records through the D1 repository and returns only coarse aggregate rows; consent withdrawal removes the household from advertiser targeting, and exact addresses/member data are not returned. The repository computes and returns aggregate projections rather than household records. `npm.cmd test -- --maxWorkers=1 --testTimeout=60000 tests/d1AuthSessionApp.test.ts` passed (20 tests); `npm.cmd run lint` and `git diff --check` passed.

**Phase 5.10j3 verification:** `/api/analytics/revenue-ledger` now builds its snapshot from D1 campaign and analytics-event reads when D1 is injected, while retaining the JSON-backed path otherwise. The D1 campaign lifecycle test verifies owner-scoped campaign estimates before and after store reconstruction and confirms `paymentCollectionActive=false`. The focused D1 suite passed (20 tests); TypeScript and diff checks passed. No Worker API, remote migration, or deployment was enabled.

**Phase 5.10j4 verification:** `/api/qa/qr-watch/:token` reads the QR link and analytics events from D1 when the repository is injected, while preserving JSON fallback behavior. A reconstructed-app test verifies persisted redirect totals, owner access, 403 for another owner, 404 for a missing token, and filtering to `real_measured` events. `npm.cmd test -- --maxWorkers=1 --testTimeout=60000 tests/d1AuthSessionApp.test.ts` passed (20 tests); `npm.cmd run lint` and `git diff --check` passed. No Worker API, remote migration, or deployment was enabled.

**Phase 5.10j5 verification:** `/api/admin/advertiser-profiles` now reads the profile listing from D1 when available and retains the JSON-backed fallback. The D1 HTTP test verifies non-admin denial and that an admin listing after store reconstruction includes the persisted advertiser profile. `npm.cmd test -- --maxWorkers=1 --testTimeout=60000 tests/d1AuthSessionApp.test.ts` passed (20 tests); `npm.cmd run lint` and `git diff --check` passed. No Worker API, remote migration, or deployment was enabled.

**Phase 5.10j6 verification:** `/api/advertiser-ops/disputes` now builds its reconciliation revenue ledger from D1 campaigns and analytics when D1 is configured, alongside the persisted dispute records. The restart test verifies the commercial campaign estimate and open dispute survive reconstruction in the response, while `paymentCollectionActive=false` and charity total remains zero. `npm.cmd test -- --maxWorkers=1 --testTimeout=60000 tests/d1AuthSessionApp.test.ts` passed (20 tests); `npm.cmd run lint` and `git diff --check` passed. No Worker API, remote migration, or deployment was enabled.

**Phase 5.10j7 verification:** Audited application GET/read routes and repository inputs. Existing D1-primary collection reads, local-mode JSON fallbacks, static/repository resources, process-local simulation/diagnostics, and local migration tooling are now explicitly classified above. Four remaining business-data parity gaps were split into tasks 5.10j8–5.10j11 before implementation. This inventory-only substage was checked with `npm.cmd run progress` and `git diff --check`; no application code or external service was changed.

**Phase 5.10j8 verification:** `/api/opportunity-ops/overview` now builds its actor-scoped projection from D1 opportunities, complaints, appeals, and campaigns when available, retaining the JSON fallback. The restart test verifies reconstructed D1 inputs and campaign fee-independence evaluation. The focused D1 suite passed (20 tests); `npm.cmd run lint` and `git diff --check` passed. No Worker API, remote migration, or deployment was enabled.

**Phase 5.10j9 verification:** `/api/compliance/overview` now projects D1-backed households, analytics, household QR retention records, and session-retention timestamps when configured, while preserving the local JSON path. Session reads return only expiry timestamps; role-scoped household visibility and private no-store caching are retained. The restart integration test verifies consent withdrawal, cross-actor isolation, exact-location redaction, and admin-only expired-session/stale-QR counts. The D1 and privacy-compliance suites passed (23 tests); TypeScript and diff checks passed. No Worker API, remote migration, or deployment was enabled.

**Phase 5.10j10 verification:** `/api/qa/prototype-readiness` now builds readiness inputs and summary counts from D1 campaign, creative, opportunity, analytics, QR, and physical scan records when configured; actor-scoped repository queries are retained. The restart integration test verifies these D1-derived totals after using a reconstructed JSON store, including persisted analytics and physical scan evidence. The focused D1 suite passed (20 tests); TypeScript, progress, and diff checks passed. This remains a software/readiness report; no TV hardware test is claimed.

**Phase 5.10j11 verification:** `/api/health`, `/api/reports/live`, and `/api/auth/me` now use exact D1 aggregate counts for application records plus D1 auth user/audit counts when D1 repositories are configured; local JSON behavior remains unchanged. Count queries aggregate in SQLite rather than relying on 500-row list windows. Reconstructed-app tests verify campaigns/status breakdown, QR, creatives, profiles, opportunities, analytics, auth users, and audit counts agree across all three endpoints. D1, API, and security suites passed (45 passed, 1 skipped); TypeScript and diff checks passed. No Worker runtime or remote service was started.

**Do not rerun passing tests just to reproduce a result.** Keep this evidence tied to the exact code commit and command. Rerun the smallest relevant test set when its code or test changes; run the full suite when shared code, dependencies, or cross-cutting behavior changes. Retry a failed external CI check only to obtain missing evidence or after its cause is corrected. Documentation-only edits do not require application tests. Never call the Windows symlink skip a Linux pass.

## 3. Executable subphases

Dependencies below are actual prerequisites, not an implied dependency on every earlier row. “Local tests” means tests run in this repository; it does not mean hardware or production verification.

### Phase 1 — Project definition and technical research: 3 / 3

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 1.1 | Establish product scope, user journeys, two ad categories, free-opportunity and fail-safe rules. Acceptance: approved requirements and boundaries are recorded. | — | **DONE** — master specification, business model, PRD. |
| 1.2 | Establish feasibility, platform/legal boundaries, privacy principles, risks, and open decisions. Acceptance: claims are evidence-tagged and unresolved items remain visibly open. | 1.1 | **DONE** — research, risk, privacy, and decisions documents. |
| 1.3 | Establish bounded architecture, testing discipline, roadmap, and owner handoff process. Acceptance: software-first test policy and single physical-test gate are documented. | 1.1, 1.2 | **DONE** — architecture and testing/governance docs. |

### Phase 2 — Functional prototype: 8 / 8

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 2.1 | Authentication/RBAC, local data store, QR validation, and direct redirect. Acceptance: role boundaries and QR validation/routing regressions pass. | 1.1 | **DONE** — `qrValidator.test.ts`, `apiRegression.test.ts`. |
| 2.2 | Advertiser profiles, campaigns, schedules, and non-transactional estimates. Acceptance: campaign lifecycle and $0 charity rules are tested. | 2.1 | **DONE** — advertiser and journey tests. |
| 2.3 | Guided and upload-based creative authoring, validation, and text-only format. Acceptance: invalid media/QR input is rejected without overwriting existing QR data. | 2.2 | **DONE** — creative and API regression coverage. |
| 2.4 | TV preview, simulation, and alternating break scheduling. Acceptance: alternation, duration safety, and fail-safe skip behavior are tested; `DEC-OPEN-02` remains a policy decision where applicable. | 2.3 | **DONE** — `breakScheduler.test.ts`; software simulation only. |
| 2.5 | Opportunity intake, independent verification tiers, expiry, complaints, and appeals. Acceptance: payment never changes verification outcomes. | 2.1 | **DONE** — opportunity and journey tests. |
| 2.6 | Admin moderation, audit/reporting views, and analytics funnel. Acceptance: simulated and measured events remain distinguishable. | 2.2, 2.5 | **DONE** — API and journey regression tests. |
| 2.7 | QR QA workflow and handoff/readiness reporting. Acceptance: QR failures are visible and real phone-camera success is not fabricated. | 2.1, 2.6 | **DONE** — readiness and journey coverage; physical phone verification remains in Stage P6. |
| 2.8 | Owner-approved Track B household/profile/consent model and epoch QR revocation. Acceptance: bundled withdrawal behavior and privacy boundaries pass tests. | 2.1, 2.5, 2.7 | **DONE** — `trackB.test.ts`; no hardware claim. |

### Phase 3 — Engineering hardening: 5 / 7

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 3.1 | API input validation, CSRF/session controls, and rate limits. Acceptance: invalid/unauthorized requests fail closed and the focused security tests pass. | 2.1 | **DONE** — `securityHardening.test.ts`. |
| 3.2 | Persistence boundary, safe error handling, request/audit telemetry, and redaction. Acceptance: repository and HTTP behavior remain covered without leaking sensitive fields. | 3.1 | **DONE** — API/security regressions and type-check. |
| 3.3 | PostgreSQL migrations, executor, and JSON backfill. Acceptance: migration up/down and backfill behavior pass against the local PGlite test path; no paid remote DB is required. | 3.2 | **DONE** — `postgresMigration.test.ts`; no remote host provisioned. |
| 3.4 | FFmpeg/ffprobe worker execution, path confinement, timeout, and retry behavior. Acceptance: real binaries execute in the local test and unsafe paths are rejected. | 3.2 | **DONE** — `mediaWorker.test.ts`, Windows binaries used. |
| 3.5 | Local static/build/E2E/full-test baseline. Acceptance: the recorded Windows commands pass and platform-specific skips are identified honestly. | 3.1–3.4 | **DONE** — baseline recorded in §2. |
| 3.6 | Verify GitHub Actions startup and Linux job results. Acceptance: workflow creates jobs and the Linux test suite completes, including the symlink test. | 3.4, 3.5 | **DONE** — [run 45293498597](https://github.com/ntomalaba29/EDISON/actions/runs/45293498597) passed on published `main` commit `aeaccd4`; Ubuntu full suite: 155 Vitest tests, 2 Playwright tests, PostgreSQL 16 migrations, type-check, and build. |
| 3.7 | Provision and verify an approved remote PostgreSQL 16 host, backup/restore, and secure connection configuration. Acceptance: migration and restore checks pass against the owner-approved region/provider without exposing credentials. | 3.3, explicit owner budget/region approval | **DEFERRED** — local PGlite/`pg.Pool` tests pass; no paid remote host is authorized or provisioned. |

### Phase 4 — TV control and adapters: 3 / 5

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 4.1 | Software TV platform harnesses, simulated faults, and safe return to ordinary TV. Acceptance: capability gates and fault cases pass without claiming physical device access. | 3.1 | **DONE** — `tvPlatformAdapter.test.ts`, `phase4AdaptersAndCache.test.ts`. |
| 4.2 | AURA pairing, command queue, everyday remote command simulation, and CEC policy guard. Acceptance: pairing/queue/fail-safe behavior passes as a simulator. | 4.1 | **DONE** — `auraAndOemAdapters.test.ts`; it is not a real TV transport. |
| 4.3 | Implement real, permissioned TV command transports and capability handling for selected platforms. Acceptance: commands use the supported pairing/transport APIs and manual viewer input always wins. | 4.2, 3.6 | **BLOCKED — API/PLATFORM** — owner authorized local work despite 3.6, but official Android TV docs restrict TIF to API 21–25 and OEM use; Samsung Tizen's documented TVInputDevice API delivers remote-key events to the foreground app, not outbound commands from a companion remote. No verified public transport meeting this acceptance criterion has been selected. |
| 4.4 | Produce signed platform packages and complete platform-specific release checks. Acceptance: signing, store permissions, and release artifacts are validated for explicitly selected devices. | 4.3, owner hardware selection | **DEFERRED** — partner/store signing and hardware qualification; Stage P6 remains the sole physical test. |
| 4.5 | Complete the software-only EDISON TV-app Ad/Back lifecycle, visibly separate from the phone's conventional remote. Acceptance: a simulated break enters the EDISON ad view; Back and ad completion restore ordinary TV state; phone Back remains an ordinary remote command; focused tests prove the separation. | 2.4, 4.1, 4.2 | **DONE — SIMULATION** — `tests/e2e/tvAppControls.spec.ts` verifies the TV-app Ad/Back lifecycle, automatic return after playback, and a separate ordinary AURA phone Back command. No native TV app, transport, or hardware compatibility is claimed. |

### Phase 5 — Break intelligence and Cloudflare compatibility: 12 / 16

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 5.1 | Parse permitted broadcast cue fixtures and enforce conservative cue/policy rules. Acceptance: malformed, protected, or low-confidence input skips safely. | 4.1 | **DONE** — `broadcastMetadataParser` coverage and Phase 4 exit tests. |
| 5.2 | Implement and test the shared-intelligence prototype: scoped observations, quorum, conflict handling, signatures, and rollback. Acceptance: scenarios 25–35 pass with zero PII in test payloads. | 5.1 | **DONE — SIMULATION** — `sharedIntelligence.test.ts`; seeded in-memory devices and process-generated keys do not constitute a deployed fleet service. |
| 5.3 | Implement the conservative per-channel duration predictor and recorded-fixture calibration. Acceptance: lower-bound safety and fixture benchmark pass. | 5.1 | **DONE — SIMULATION** — `breakScheduler.test.ts` and recorded calibration suite. |
| 5.4 | Define and test timestamped, channel-scoped commercial-break events shared between simulated TVs. Acceptance: signed UTC event times, stable channel scope, source identity, freshness limits, deduplication/replay rejection, conflict handling, and zero PII are verified end-to-end without replacing the existing duration-learning observation model. | 5.1, 5.2, 4.5, 10.2 | **DONE — SIMULATION** — `/api/shared-intel-fleet/break-events` accepts signed UTC events. Phase 5.7 further binds these events and `/api/shared-intel-fleet/break-events?tvDeviceId=…&channelId=…&decoderProfileId=…` sync to an opaque shared decoder/feed profile. `sharedIntelligence.test.ts` and `securityHardening.test.ts` cover the channel/event behavior; 5.7 adds profile isolation and legacy encrypted-state compatibility. The existing duration-learning model is unchanged. |
| 5.5 | Persist shared-intelligence fleet state locally across restarts. Acceptance: opt-in encrypted storage restores fleet/device signing keys, signed bundles, observations/replay and rate state, break events, and counters; malformed or undecryptable state fails closed without replacement. | 5.2, 5.4, 3.3, 10.3 | **DONE — LOCAL DEVELOPMENT** — AES-256-GCM encrypted, atomic file persistence; restore validation and restart/replay tests pass. No production database or attestation is claimed. |
| 5.6 | Provide operator-controlled local encryption-key rotation and define recovery limits. Acceptance: rotate the complete persisted state to a distinct key; the new key restores unchanged state, old/invalid keys fail closed, and failed/invalid rotation does not replace the state file. Document owner-managed key backup and the unrecoverability of key loss. | 5.5, 10.2 | **DONE — LOCAL TOOLING** — one-shot `EDISON_SHARED_INTEL_ROTATE_TO_KEY` operation and service-level tests; no key escrow or automatic recovery. |
| 5.7 | Bind saved signed break events, conflict handling, and peer sync to both canonical channel and an opaque shared decoder/feed profile. Acceptance: signed submissions are bound to an attested device's profile; matching TVs sync only matching profile events; same-channel events from different profiles remain isolated; legacy encrypted state restores under a distinct legacy profile. | 5.4, 5.5, 10.2 | **DONE — SIMULATION** — decoder profile is an opaque non-PII shared feed/decoder profile, not a physical decoder serial. Service, authenticated API, profile-isolation, and encrypted legacy-restore tests pass. No physical decoder integration or production fleet is claimed. |
| 5.8 | Implement and test a Cloudflare D1 persistence adapter for decoder-scoped durable break intelligence, including schema/migrations and channel/profile isolation. Acceptance: D1-compatible storage passes local adapter and migration tests; credentials and production account access are not required for local verification. | 5.7, 3.3, owner-approved Cloudflare plan | **DONE — LOCAL D1-COMPATIBLE ADAPTER** — dedicated SQLite migration and storage adapter verified by `tests/d1BreakEventStore.test.ts`; channel/profile filters, conflict exclusion, identity-rebinding rejection, canonical UTC, and zero-PII constraints are covered. A separate free-tier D1 database is configured for Wrangler; its migration was applied locally only. |
| 5.9 | Add an account-free Cloudflare Workers runtime shell for the Vite SPA and Express API. Acceptance: local `workerd` serves built SPA assets, routes API requests through Cloudflare's Node HTTP bridge, and clearly reports that unported application APIs are not ready; no deployment or app-API parity is claimed. | 5.8 | **DONE — LOCAL COMPATIBILITY SHELL ONLY** — Wrangler dry-run and local Worker route smoke tests pass. Application API endpoints intentionally return 503 until persistence and media compatibility are complete. |
| 5.10a | Establish the D1 application-storage foundation: define the persistence boundary, migration strategy, and validated D1 data-access layer without changing production API behavior. Acceptance: local binding tests cover migration application, typed reads/writes, and explicit database errors; the design supports the existing domain model without a single unbounded JSON blob. | 5.9, 5.8, 10.3 | **DONE — LOCAL D1 FOUNDATION** — `0002_application_records.sql` stores bounded, keyed records with valid JSON and owner indexes; `D1ApplicationRecordStore` provides codec-validated reads/writes, bounded owner-scoped lists, deletes, and explicit DB error handling. Focused D1 tests (4 total), `npm run lint`, and local Wrangler migration application pass. API integration is intentionally deferred. |
| 5.10b | Implement the D1 authentication/session/audit storage adapter. Acceptance: unique normalized accounts, password verification, hashed session tokens, CSRF state, session rotation/touch, idle/absolute expiry, logout, production demo-account blocking, and bounded audit retention pass local binding tests across adapter restarts. | 5.10a, 10.3 | **DONE — LOCAL D1 ADAPTER** — `0003_auth_sessions_audit.sql` and `D1AuthSessionStore` pass registration/login/logout/session/audit tests; no API route is wired yet. |
| 5.10c | Wire core authentication and session operations through the async-compatible D1 repository in Express. Acceptance: registration, login/logout, session resolution/touch, and CSRF rejection audit preserve existing HTTP behavior; database failures reach standard error handling, and advertiser registration still initializes its profile. | 5.10b, 10.3 | **DONE — LOCAL D1/EXPRESS INTEGRATION** — focused auth/session HTTP and API regression tests pass (12 total); TypeScript validation passes. Remaining API audit writers and admin audit-log reads are explicitly out of scope. |
| 5.10d | Merge D1 auth/security audit rows into admin audit listing/export and await export audit writes. Acceptance: domain and D1 rows are both preserved, sorted and bounded; export formats remain intact; D1 read/write failures use standard Express error handling. | 5.10c, 10.3 | **DONE — LOCAL ADMIN AUDIT INTEGRATION** — list and JSON/CSV export merge records; focused D1 HTTP/API tests verify both record sources and the export audit entry. |
| 5.10e | Wire direct route-level security-audit writers to the async D1 repository. Acceptance: route-generated security audits persist in D1, existing domain audit records remain available, and D1 failures reach Express error handling for all audited routes. | 5.10d, 10.3 | **DONE — LOCAL ROUTE AUDIT INTEGRATION** — centralized dual-write helper and response-drain middleware route all direct app audit calls through D1 while preserving JSON domain records. |
| 5.10f | Persist representative non-media domain state for advertiser profiles and QR links through D1. Acceptance: registration initializes profiles, profile and QR writes mirror to D1, profile/QR reads use D1 when injected, status updates persist, D1 failures surface through Express, and JSON fallback remains unchanged. | 5.10e, 10.3 | **DONE — LOCAL DOMAIN SLICE** — D1 profile/QR repository and HTTP routes are covered by focused D1/domain/API tests. |
| 5.10g | Persist campaign lifecycle records through D1. Acceptance: list/create/update/clone/transition/delete preserve JSON behavior and owner/admin scope; D1 status-filtered reads persist across app/store restarts; D1 failures reach Express error handling. | 5.10f, 10.3 | **DONE — LOCAL CAMPAIGN DOMAIN** — campaign collection methods and full CRUD/transition routes are covered by local D1/API tests. |
| 5.10h | Persist support-ticket records through D1. Acceptance: list/create/status-update preserve JSON behavior and owner/admin scope; D1 reads reflect persisted ticket status and owner identity; D1 failures reach Express error handling. | 5.10g, 10.3 | **DONE — LOCAL SUPPORT-TICKET DOMAIN** — support-ticket collection methods and HTTP create/list/status routes are covered by focused D1/API tests. |
| 5.10i | Persist ad-creative records through D1. Acceptance: list/create/update/attach/delete preserve JSON behavior and owner/admin scope; attach mirrors both creative and campaign records; D1 failures reach Express error handling. | 5.10h, 10.3 | **DONE — LOCAL AD-CREATIVE DOMAIN** — ad-creative collection methods and create/list/update/attach/delete routes are covered by focused D1/API tests. |
| 5.10j | Move remaining non-media application-domain collections onto D1 and connect their API routes to the Worker. Acceptance: opportunities, households, complaints, appeals, and remaining collections preserve JSON behavior and survive Worker restarts; no endpoint reports readiness while persistence is incomplete. | 5.10i, 10.3 | **DONE — LOCAL D1 / WORKER INTEGRATION** — D1 collection slices and summary routes passed focused persistence tests; local Worker uses D1 repositories for durable records, explicitly reports its isolate-local store as `memory_only`, and passed auth, business-route, restart, migration, and missing-binding checks. Remote deployment is not claimed. |
| 5.11 | Adapt uploads and media-processing workflows for Cloudflare-compatible storage and execution. Acceptance: validated media uses durable object storage, and FFmpeg work runs only in an explicitly selected compatible service; upload/path safety behavior is preserved. | 5.9, 5.10j | **SPLIT** — 5.11a separates validation; 5.11b provides approved durable object storage; 5.11c integrates compatible media execution. |
| 5.12 | Deploy the complete application to a Cloudflare staging environment and verify operational readiness. Acceptance: authenticated API and SPA, D1-backed state, media path, backups, monitoring, and owner-approved recovery checks pass after Worker restarts. | 5.10j, 5.11, 5.6, 10.3, 15.2 | **PARTIAL — FREE-TIER PREVIEW DEPLOYED** — `https://edison.ntomalaba29.workers.dev` serves the SPA and uses the migrated target-account D1. Live home, health, and compatibility checks returned HTTP 200; media storage/upload are explicitly not ready and media reads return 404. This is not full staging or operational readiness: media storage, backups, monitoring, recovery checks, and broader API readiness remain incomplete. |

### Phase 6 — Ad delivery and news distribution: 2 / 6

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 6.1 | Compile preload manifests with eligibility, region/daypart/codec, frequency-cap, and charity-zero-cost rules. Acceptance: eligible/ineligible cases are deterministic and tested. | 2.2, 2.3 | **DONE** — `deliveryInfra.test.ts`. |
| 6.2 | Ingest delivery events idempotently and simulate CDN failover. Acceptance: duplicate/anomalous events are rejected and fallback remains fail-safe. | 6.1, 3.2 | **DONE** — `deliveryInfra.test.ts`; external CDN is not involved. |
| 6.3 | Connect a production asset origin/CDN and validate signed asset publication, cache expiry, and real outage behavior. Acceptance: staged asset publication, signature verification, expiry, and failover are demonstrated without exposing origin credentials. | 6.1, 6.2, 15.2 | **PENDING** — current origins/manifests are software blueprints. |
| 6.4 | Integrate a real CTV ad-network provider and approved formats. Acceptance: direct-paid inventory keeps priority and no provider fills charity inventory. | 6.1, `DEC-OPEN-03` resolution | **BLOCKED** — GAM/SSP eligibility and account are unresolved; no live provider calls. |
| 6.5 | Implement privacy-preserving paid-campaign targeting for supported geographic areas (including catchment, locality, metropolitan area, and constituency where boundary data is available). Acceptance: in/out matching passes boundary fixtures and advertisers never receive household exact-location data. | 2.8, 6.1, 10.2 | **PENDING — `DEC-OPEN-08`** — boundary source, licensing, and catchment definition must be selected before real coverage claims. |
| 6.6 | Deliver approved, unexpired, geographically relevant journalist news to the next eligible break with clear editorial/sponsored labels and viewer preference controls. Acceptance: inventory, opt-in, expiry, and manual-override rules are tested alongside the ad schedule. | 5.4, 6.5, 7.4, 9.4 | **BLOCKED — `DEC-OPEN-05`, `DEC-OPEN-07`** — verification and break-inventory/opt-in policy are not yet defined. |

### Phase 7 — Advertiser and publisher operations: 2 / 4

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 7.1 | KYC readiness, campaign pacing, and non-transactional billing estimates. Acceptance: failed gates block readiness and charity remains $0. | 2.2 | **DONE — BLUEPRINT** — `advertiserOps.test.ts`; no payment collection. |
| 7.2 | Dispute, credit-adjustment, and SLA triage workflow. Acceptance: dispute transitions and audit evidence are covered. | 7.1 | **DONE — SOFTWARE WORKFLOW** — covered by the current regression suite. |
| 7.3 | Integrate an authorized payment/acquirer and execute audited transactional billing/refunds. | 7.1, 7.2, 13.2, 13.3 | **DEFERRED** — no owner authorization, acquirer, or live payments. |
| 7.4 | Add journalist/publisher registration and monthly subscription-state handling without collecting payments. Acceptance: publisher role and active/expired/suspended access states are audited; price and live billing remain unconfigured. | 2.1, 7.1, 10.2 | **PENDING — `DEC-OPEN-06`** — subscription entitlements and price need owner definition; no payment collection is authorized. |

### Phase 8 — Creative rendering: 2 / 3

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 8.1 | Validate creative dimensions, safe areas, contrast, duration, and platform render profile. Acceptance: unsupported creatives fail before delivery. | 2.3 | **DONE** — `broadcastRender.test.ts`. |
| 8.2 | Execute real media probes/transcodes and verify output formats/loudness. Acceptance: FFmpeg/ffprobe output matches requested profile and confinement rules. | 8.1, 3.4 | **DONE — LOCAL WORKER** — `mediaWorker.test.ts`; production creative pipeline is not yet deployed. |
| 8.3 | Integrate the worker into a durable creative lifecycle with stored outputs, review evidence, and production job operations. Acceptance: retries, output hashes, moderation evidence, and failure recovery persist across worker/service restarts. | 8.2, 6.3 | **PENDING** — current worker is not a deployed rendering service. |

### Phase 9 — Opportunity and editorial operations: 2 / 4

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 9.1 | Seal/redact verification evidence and keep the three verification tiers non-transitive. Acceptance: no ad payment can affect charity verification. | 2.5 | **DONE — SOFTWARE ENGINE** — `opportunityOps.test.ts`. |
| 9.2 | Enforce expiry, re-verification scheduling, complaints, and service-level triage. Acceptance: expired opportunities cannot continue to schedule. | 9.1, 2.6 | **DONE — SOFTWARE WORKFLOW** — opportunity tests and regression suite. |
| 9.3 | Connect an authorized external identity/organization verification provider. Acceptance: vendor response and outages are handled without promoting unverified evidence. | 9.1, 10.1 | **DEFERRED** — no KYC vendor connected or authorized. |
| 9.4 | Define and implement the journalist-news review lifecycle: publisher/source checks, evidence and affected-area record, review decision, expiry, correction/retraction, complaints, audit, and separation of editorial from sponsored content. | 7.4, 9.1, 9.2, 10.2 | **BLOCKED — `DEC-OPEN-05`** — editorial verification and fast-review safeguards require owner decisions before implementation. |

### Phase 10 — Privacy and security readiness: 4 / 5

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 10.1 | Implement consent epoch, QR revocation, data-subject export/erasure, and ordinary-TV-preservation behavior. Acceptance: approved withdrawal and deletion paths pass tests. | 2.8, 3.1 | **DONE — SOFTWARE** — `privacyCompliance.test.ts`; no independent legal finding implied. |
| 10.2 | Enforce retention bounds, zero-PII telemetry, and camera/microphone restrictions. Acceptance: prohibited fields are blocked or redacted in tests. | 10.1, 5.2 | **DONE — SOFTWARE** — privacy/security regression coverage. |
| 10.3 | Run dependency/security checks and maintain the internal security test report. Acceptance: report is tied to a dependency snapshot and test evidence. | 3.1, 3.5 | **DONE — INTERNAL CHECKS** — `docs/security/SECURITY_TEST_REPORT.md`; not an external penetration test. |
| 10.4 | Maintain the country statutory source register and mark evidence, uncertainty, and non-compliance claims accurately. Acceptance: country rules are traceable to public sources. | 1.2 | **DONE — RESEARCH/READINESS RECORD** — does not claim legal compliance or market authorization. |
| 10.5 | Obtain independent penetration testing and resolve findings. Acceptance: findings have closure evidence. | 10.3 | **DEFERRED** — no external pen test performed. |

### Phase 11 — Reliability: 2 / 3

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 11.1 | Exercise documented failure modes FM-01 through FM-18. Acceptance: recovery is deterministic and ordinary TV is preserved in simulation. | 4.1, 5.1, 6.2 | **DONE — SIMULATION** — `reliabilityChaos.test.ts`. |
| 11.2 | Exercise PostgreSQL pool and FFmpeg timeout/OOM failure modes FM-19 and FM-20. Acceptance: failures surface explicitly and do not produce success-shaped fallbacks. | 3.3, 3.4 | **DONE — LOCAL TESTS** — `reliabilityChaos.test.ts`, `reliabilityAndPerformance.test.ts`. |
| 11.3 | Complete Linux CI and cross-platform/soak verification. Acceptance: the full suite passes on Linux and time-based stability evidence is recorded. | 3.6, 11.1, 11.2 | **PENDING** — Linux CI is verified by run 45293498597; time-based soak evidence remains outstanding. |

### Phase 12 — Pilot readiness: 2 / 2

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 12.1 | Implement the software pilot-readiness and zero-PII/consent telemetry gates. Acceptance: incomplete gates fail closed. | 10.1, 10.2, 11.1 | **DONE — SOFTWARE** — `pilotReadiness.test.ts`. |
| 12.2 | Define one closed-cohort pilot protocol, success/abort criteria, and final-test runbook. Acceptance: steps and rollback are reviewable before any physical test. | 12.1 | **DONE — RUNBOOK ONLY** — `docs/testing/STAGE_P6_PHYSICAL_TEST_RUNBOOK.md`. |

### Phase 13 — Commercial readiness: 1 / 3

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 13.1 | Implement software readiness, SLA, and unit-economics gates. Acceptance: premature launch/payment flags remain false. | 7.1, 10.3, 12.1 | **DONE — SOFTWARE** — `commercialReadiness.test.ts`. |
| 13.2 | Conduct and record human board/owner approval. Acceptance: named authorization and constraints are explicit. | 13.1, 12.2 | **PENDING** — software readiness is not approval. |
| 13.3 | Authorize commercial operation, contracts, live payments, and related customer operations. Acceptance: separate explicit owner authorization and operational safeguards. | 13.2, 7.3 | **DEFERRED** — outreach and payment collection remain off. |

### Phase 14 — Country activation: 2 / 3

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 14.1 | Implement country policy and fail-closed activation gates for the documented markets. Acceptance: no market activates when required controls are missing. | 10.4, 12.1 | **DONE — SOFTWARE** — `countryLaunch.test.ts`. |
| 14.2 | Keep public-source statutory research current and each market’s gaps explicitly listed. Acceptance: records are dated and no legal-compliance claim is inferred. | 10.4, 14.1 | **DONE — RESEARCH RECORD** — launch activation remains separate. |
| 14.3 | Complete required regulator filings and owner-authorized market activation. Acceptance: filed evidence and explicit owner authorization are recorded before any market flag can activate. | 13.2, 14.1, 14.2 | **DEFERRED** — no country is activated. |

### Phase 15 — International expansion: 2 / 3

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| 15.1 | Complete localization, currency estimate, and accessibility/caption resource packs. Acceptance: all shipped locale keys and formatting are covered. | 2.3, 14.1 | **DONE — SOFTWARE** — `internationalExpansion.test.ts`. |
| 15.2 | Prepare sovereign-region deployment manifests and container/CDN deployment configuration. Acceptance: residency constraints are explicit and fail closed. | 10.2, 14.1 | **DONE — DEPLOYMENT BLUEPRINT** — not a live regional deployment. |
| 15.3 | Deploy and operate approved sovereign regions with real data residency, monitoring, and contracted providers. Acceptance: residency, backup/restore, observability, and no-cross-border-PII controls pass against the deployed environment. | 13.2, 14.3, 15.2 | **PENDING** — no live region or acquirer rollout. |

### Final Stage P6 — one physical test: 0 / 1

| ID | Single-task deliverable and acceptance boundary | Depends on | Status / evidence |
|---|---|---|---|
| P6.1 | Execute the **single** end-to-end physical TV + phone test only after software gates and owner hardware selection are ready. Acceptance: complete the approved runbook once, record the actual hardware/results, and do not claim unsupported platforms. | 3.6, 4.4, 12.2, 13.2, 14.1 | **DEFERRED** — runbook exists; no physical TV test has been performed. |

## 4. Current product truth and non-negotiable limits

- **TV control:** `tvPlatformAdapter.ts` and `auraRemoteEngine.ts` implement simulator/state-machine behavior, pairing/queue models, OEM contracts, and safety guards. No real TV transport command has been verified. Do not call this real everyday TV remote support.
- **Shared intelligence:** `sharedIntelFleetService.ts` and `offlineIntelCache.ts` implement local software simulations and tests. The fleet devices are seeded in memory and keys are generated by the process. Do not call this a production shared service or live fleet.
- **Ad delivery:** manifests, event ingestion, and failover behavior are tested in software. No production CDN, GAM account, or live ad-network request exists.
- **Payments and verification:** KYC and billing are readiness/pro-forma software only. No payment collection, acquirer, or external KYC provider is active.
- **Hardware/legal/commercial:** `hardwareTested: false`, `externalPenTestCompleted: false`, `paymentCollectionActive: false`, `countryActivated: false`, `regionalExpansionActive: false`, and `legalComplianceClaimed: false` remain authoritative.
- **Open decisions:** preserve `DEC-OPEN-02` (single-slot scheduling policy), `DEC-OPEN-03` (CTV network account/format eligibility), `DEC-OPEN-04` (final test hardware/markets), and new `DEC-OPEN-05` through `DEC-OPEN-08` (news verification, publisher subscription terms, news slot/opt-in rules, and geographical boundary data). `DEC-OPEN-01` is owner-approved and implemented in the software prototype.
- **Safety:** ordinary TV must remain usable; skip on uncertainty; do not intercept protected signals or bypass DRM/HDCP; opportunity verification must remain independent from ad spend; charity stays $0; no commercial outreach or payment collection without authorization.

## 5. GitHub repository research and reuse recommendation

Research was performed against public GitHub repository root listings, READMEs, and LICENSE files on 2026-11-17. The current dedicated source review, owner-provided EDISON flow, and proposed detector/share/switch hybrid are recorded in [`docs/research/EDISON_TV_REMOTE_AND_BREAK_DETECTION_REPOSITORIES.md`](docs/research/EDISON_TV_REMOTE_AND_BREAK_DETECTION_REPOSITORIES.md). This is an architectural comparison, not a security audit or production compatibility certification.

### Official platform API feasibility (checked 2026-11-18)

- [Android TV Input Framework documentation](https://developer.android.com/training/tv/tif) cautions that TIF is supported only on Android 5.0–7.1 (API 21–25), is meant for OEMs building system-TV channels, and directs third-party content apps to home-screen recommendation APIs. Those recommendation APIs do not provide companion-remote control. Do not select TIF as a new general Android TV remote transport.
- [Samsung Tizen TVInputDevice API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvinputdevice-api.html) registers/subscribes to remote-key events delivered to an app, including the mandatory arrows, Enter, and Back keys. It is an app-input API, not an outbound command API for a phone/AURA remote to control the TV.
- **Decision:** Neither documented API meets Phase 4.3's AURA-to-TV command-transport acceptance. Keep the platform decision open rather than presenting simulated APIs or an unofficial protocol as a supported real transport. The local environment also has no Java, Gradle, Android SDK, or ADB, so a native Android deliverable cannot be built or device-tested here.

### TV remote-control projects

| Repository | Verified license and observed scope | EDISON fit / decision |
|---|---|---|
| [mazen-salah/Smart-TV-Remote-Control](https://github.com/mazen-salah/Smart-TV-Remote-Control) | MIT. Flutter client; README describes SSDP/mDNS discovery, local WebSocket control, pairing tokens, reconnect/Wake-on-LAN, Samsung Tizen and LG webOS. It reports Samsung hardware testing; its LG hardware support is explicitly unverified. | Strong reference for explicit discovery, pairing UX, local-network permissions, and brand-specific sessions. Flutter is not a direct fit for this TypeScript app; recheck current protocols and security before implementing. |
| [tronikos/androidtvremote2](https://github.com/tronikos/androidtvremote2) | Apache-2.0. Python implementation of Android TV Remote Protocol v2; README says it does not require ADB and includes tests/examples. | Useful Android/Google TV protocol reference. It is not the Android TV Input Framework and does not provide authorized broadcast takeover or break restoration. |
| [levhakobyan/OpenTV-Remote](https://github.com/levhakobyan/OpenTV-Remote) | MIT LICENSE verified; repository layout includes Android, iOS, and shared code. | Secondary cross-platform UX/reference candidate. Read source, pairing, and permission flow before relying on its claimed capabilities; no code reuse approved. |
| [xchwarze/samsung-tv-ws-api](https://github.com/xchwarze/samsung-tv-ws-api) | LGPL-3.0, confirmed in README and LICENSE. Python Samsung TV WebSocket/REST API; README notes LAN/subnet limits and first-connection approval. | Useful protocol/restriction reference only for now. Do not embed or copy code before a specific LGPL compatibility review and platform decision. |

### Ad signaling, measurement, and break-detection projects

| Repository | Verified license and observed scope | EDISON fit / decision |
|---|---|---|
| [dailymotion/vast-client-js](https://github.com/dailymotion/vast-client-js) | MIT. JavaScript VAST parser/client and tracker; README says VAST 4.3 and tracking-URL support. | Best candidate to evaluate later for optional VAST parsing/standard events. Its tracker can make third-party requests; use only a reviewed event allowlist and privacy-approved endpoints. |
| [videojs/videojs-contrib-ads](https://github.com/videojs/videojs-contrib-ads) | Apache-2.0. Stable Video.js ad-plugin support layer; README highlights ad timeouts and content-state restoration; not a standalone ad plugin. | Useful lifecycle/timeout behavior reference, not a dependency for EDISON’s current React/TV architecture. |
| [googleads/googleads-ima-html5](https://github.com/googleads/googleads-ima-html5) | Apache-2.0 sample repository. README describes examples for the separate HTML5 IMA SDK. | Official integration examples for a later approved web/CTV route. The sample-repo license does not replace the SDK’s own platform/account terms or prove Tizen/webOS compatibility. |
| [ggouzi/HLS-SCTE35-monitoring](https://github.com/ggouzi/HLS-SCTE35-monitoring) | MIT. README describes polling HLS playlists for `EXT-X-CUE`, `EXT-X-DATERANGE`, `EXT-OATCLS-SCTE35`, and custom markers; it labels itself a side project provided as-is. | Small cue-monitoring reference for accessible HLS playlists only; not a tuner capture mechanism or TV-control adapter. Review code/dependencies before reuse. |
| [socrtwo/adhush](https://github.com/socrtwo/adhush) | MIT. README describes local multi-signal detection and multiple TV-control/capture paths; its README claims data stays local by default and includes opt-in/cloud features. Those are project claims, not independently tested here. | Strong detector/replay-test architecture reference, but not a product to clone: camera/mic/screen/HDMI capture and automatic volume/input controls conflict with EDISON’s conservative privacy and no-hijack boundaries unless separately authorized. |

### Recommended original hybrid (no code copied)

1. Keep EDISON’s TypeScript app and implement narrowly scoped, explicit TV transport adapters only after Phase 3 CI and platform selection. Borrow architectural patterns—not source—from the MIT/Apache remote projects: visible pairing, per-platform capabilities, local-network limits, and fail-closed command dispatch.
2. Keep normal remote commands separate from ad-break switching. A viewer’s manual remote input must always win. Do not promise background channel monitoring or tuner takeover based on remote-control repositories.
3. Use permitted broadcast metadata and deterministic recorded fixtures first. Consider local, privacy-preserving signal ensembles only after a separate design/authorization; do not introduce camera, microphone, screen-capture, DRM, or HDCP bypass.
4. If a real ad-network route is later approved, evaluate VAST parsing/tracking and official IMA integration separately. Keep first-party delivery/QR events narrowly defined, deduplicated, and free of cross-site identity or viewer profiling.
5. Do not clone a complete repository. Before any code reuse, inspect the exact pinned revision, license and notices, dependencies, security posture, supported TV/SDK, privacy behavior, and compatibility with EDISON’s fail-safe rules. LGPL/coplanar obligations require explicit review. No external repository was cloned or added as a dependency in this subphase.

## 6. Next bounded task

**Ledger split report:** 5.10i was replaced by two real milestones: `5.10i` is now ad-creative persistence, and `5.10j` is the remaining opportunities/households/complaints/appeals collection migration. This split adds one total row and one completed row: the direct table sum changed from 57/80 to 58/81 (71.6%). No prior percentage was cumulatively added.

**Next bounded task: maintain the free preview and do not claim durable media uploads.** The local R2 adapter and round-trip are verified, but remote storage is off by owner choice. Browser-side FFmpeg/WASM is a possible no-cost local-processing path; it is slower than native FFmpeg, browser-only, has a 2 GB hard input limit, and is not integrated. Linux CI passed on published commit `aeaccd4`; current uncommitted media changes still need to be committed/pushed before they can receive CI verification. Do not claim full staging, commercial readiness, or media upload availability without durable storage.

Phase 4.3 still lacks an approved, verified TV transport/platform. Do not implement an unofficial TV protocol or claim a simulator is a real adapter. Phase 11.3 still needs time-based soak evidence; this is separate from the now-passing Linux CI gate.

## 7. Documents that must point here

AI Studio and future Copilot sessions: read this file first, then `docs/EDISON_PRODUCT_VISION_AND_BUILD_PLAN.md`, `PROJECT_MASTER_SPECIFICATION.md`, `PRODUCT_REQUIREMENTS.md`, `DECISIONS_LOG.md`, `TESTING_STRATEGY.md`, and `SESSION_CONTINUITY_LOG.md`. Use `docs/research/EDISON_REPOSITORY_SHORTLIST.md` for the link-only repository shortlist and `COMPLETE_DEVELOPMENT_ROADMAP.md` for phase descriptions, not its historical weighted status labels. Use this file for current subphase counts, status, evidence, repository findings, and the next task.
