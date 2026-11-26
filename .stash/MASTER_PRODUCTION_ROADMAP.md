# EDISON Automatic TV Advertising — Master Production Roadmap

**Status:** ACTIVE
**Last reconciled:** 2026-11-26
**Baseline HEAD:** `e95d3ee556f0e01e5056bcc4037634f6c42797d2`
**Total stages:** 36

## Whole-app audit — 2026-11-26

- `npm.cmd run lint`: PASS.
- Android unit tests and APK assembly: PASS.
- Final `npm.cmd run lint`: PASS after CL-01 repairs.
- Full Vitest: 36 files passed; 165 passed, 1 skipped.
- Playwright: 2 browser tests passed.
- The country-launch verification suite now passes 8/8; stale tests now match
  retired HTTP 410 behavior.
- Fixed a real `/api/country-launch/decision` handler defect: it had treated the
  Express request as the response and returned HTTP 500. It now returns 410.
- Country policy/decision writes remain absent from D1 after attempted retired
  writes and store reconstruction.
- Android: native shell, QR enrollment, D1 API groundwork and Android 16 emulator
  launch evidence exist. Keystore credential rotation, staging deployment,
  real enrollment, IMA, playback and physical validation remain incomplete.
- AD TRACKER: HLS/cue parsing and D1 break-event persistence are test fixtures or
  software adapters; no authorized live broadcast source exists.
- SWITCHER: only software state/adapters exist; no real launch, input snapshot,
  source switch or broadcast restoration is implemented.
- Ad playback: no IMA/Media3 integration or real ad playback exists.
- Whole-app CI: local Node and browser baselines pass; Android CI and emulator
  CI remain incomplete.
- Production blockers: Cloudflare migration/secret, R2 decision, Google account
  approval, legal/counsel decisions, signing, physical TV/STB, and owner approval.

This roadmap is authoritative for AD TRACKER, SWITCHER, and native EDISON Android
TV ad playback. A stage is complete only after its evidence and tests are
recorded. Simulations, emulator tests, account approvals, and physical hardware
tests remain separate evidence classes.

## Stage status

| Stage | Status | Objective |
|---|---|---|
| 1 | DONE | Freeze the implemented baseline and establish the new handoff |
| 2 | DONE | Define physical-system architecture and trust boundaries |
| 3 | BLOCKED | Execute the automatic-switching feasibility gate |
| 4 | PENDING | Define the authorized broadcast signal source |
| 5 | PENDING | Replace synthetic profiles with validated contracts |
| 6 | PENDING | Implement an authorized AD TRACKER input reader |
| 7 | PENDING | Implement detection confidence and false-positive protection |
| 8 | PENDING | Implement AD TRACKER lifecycle state handling |
| 9 | PENDING | Define the AD TRACKER/SWITCHER protocol |
| 10 | PENDING | Harden break-event persistence and idempotency |
| 11 | PENDING | Implement the SWITCHER state machine |
| 12 | PENDING | Implement previous-state snapshotting |
| 13 | PENDING | Implement the verified automatic launch bridge |
| 14 | PENDING | Implement SWITCHER platform controls |
| 15 | PENDING | Implement and verify broadcast restoration |
| 16 | PENDING | Build the Android ad-session shell |
| 17 | PENDING | Define approved ad media contracts |
| 18 | PENDING | Integrate the approved native player/IMA path |
| 19 | PENDING | Implement app-to-SWITCHER lifecycle events |
| 20 | PENDING | Replace mock scheduling with approved inventory |
| 21 | PENDING | Implement idempotent ad event persistence |
| 22 | PENDING | Complete security and privacy controls |
| 23 | PENDING | Implement watchdog and failure recovery |
| 24 | PENDING | Reconcile repository CI and automated baseline |
| 25 | PENDING | Complete emulator end-to-end testing |
| 26 | PENDING | Prepare physical-device integration prerequisites |
| 27 | PENDING | Perform physical Android TV end-to-end validation |
| 28 | PENDING | Obtain final production acceptance |
| 29 | PENDING | Finish Android enrollment and Cloudflare D1 operations |
| 30 | IN PROGRESS | Reconcile the whole-app baseline and retired interfaces |
| 31 | PENDING | Complete media ingestion and delivery validation |
| 32 | PENDING | Complete privacy, consent, and DSR production gates |
| 33 | PENDING | Complete Android CI and scoped automated verification |
| 34 | PENDING | Complete AdSense/Ad Manager eligibility assessment |
| 35 | PENDING | Complete operational deployment and incident readiness |
| 36 | PENDING | Prepare final launch evidence and sign-off |

**Current stage:** 3 — Automatic-Switching Feasibility Gate (blocked pending a
named, owner-authorized target device and access evidence)

**Current hard gate:** Stage 3 — Automatic-Switching Feasibility Gate

**Stage 3 research:** `.stash/STAGE3_FEASIBILITY_RESEARCH.md` records current
official Android documentation, a retail streamer candidate assessment, and
the remaining target-specific blocker. It does not close the gate.

**Baseline status:** CL-01 local code/test reconciliation is accepted. Stage 30
remains in progress pending its Stage 24 dependency and repository CI gate.

## Stage 2 architecture boundary

The detailed decision and evidence are in
`.stash/STAGE2_PHYSICAL_ARCHITECTURE.md`. This boundary is not an
implementation or feasibility claim:

```text
Authorized broadcast source
        |
        v
AD TRACKER (normalized, confidence-gated, idempotent break events)
        |
        | authenticated/correlated/expiring trigger
        v
SWITCHER (snapshot + launch + restore + watchdog)
        |
        | automatic foreground launch
        v
EDISON Android TV application (native ad playback)
        |
        | real lifecycle completion/failure
        v
SWITCHER (verified broadcast restoration)
```

Boundary decisions:

- AD TRACKER must receive a lawful, externally accessible break signal.
- SWITCHER owns application launch and broadcast-state restoration.
- EDISON owns ad-session playback only and must not control the TV as a remote.
- Broadcast source/channel/input identity must be snapshotted and verified.
- Any source that requires protected DRM/HDCP frame capture is forbidden.
- Any source that requires OEM, operator, signature, or partner privileges must
  remain an external blocker until authorization/evidence exists.
- Emulator state transitions do not prove real switching or restoration.

## Stage 2 completion evidence

- `.stash/STAGE2_PHYSICAL_ARCHITECTURE.md` defines execution/trust domains,
  state and failure ownership, observed repository boundaries, and measurable
  Stage 3 proof requirements.
- The native app manifest has no TV-input service or switching permission; its
  activity is an app shell, not a tuner controller.
- The server TV adapter is simulated and cannot establish platform authority.
- No device or live source was named, so Stage 3 is blocked pending
  target-device/vendor capability evidence. No switching implementation began.
- Owner confirmed on 2026-11-26 that no target device is available or selected;
  Stage 3 remains blocked until a named authorized target and access are
  provided.
- Official-source Stage 3 research found no ordinary retail-device evidence for
  the complete automatic launch and exact input/channel restoration contract.
  Current AOSP docs place TV HAL access in system TV Inputs and identify the
  TV App as a system app. An OEM/operator-authorized integration remains a
  conditional candidate, not a verified capability.

## Stage 1 completion evidence

- Repository state verified: HEAD `e95d3ee556f0e01e5056bcc4037634f6c42797d2`.
- Working tree was clean before handoff-document creation.
- `.stash/READ_THIS_FIRST.md` established as the entry point.
- `.stash/MASTER_PRODUCTION_ROADMAP.md` established as the initial 28-stage
  ledger and later expanded to 36 stages.
- `.stash/CLINE_TASK.md` and `.stash/CLINE_REPORT.md` establish no-active-task,
  awaiting-Cline, and awaiting-Copilot-review states.
- Existing Android app, HLS parser, break predictor/scheduler, D1 event store,
  offline cache, and TV adapter were classified; simulations and hardware gaps
  remain explicitly separated.
- No application code or production configuration was changed.

## 1. Freeze the Implemented Baseline and Handoff

**Objective:** Create an evidence-based baseline and prevent simulations from being
mistaken for real automatic TV switching.

**Existing components:**
- `android-tv/`
- `src/server/hlsCueParser.ts`
- `src/server/breakDurationPredictor.ts`
- `src/server/breakScheduler.ts`
- `src/server/tvPlatformAdapter.ts`
- `src/server/offlineIntelCache.ts`
- `src/server/cloudflare/d1BreakEventStore.ts`
- `COMMERCIAL_BREAK_DETECTION.md`
- `SMART_TV_COMPATIBILITY_RESEARCH.md`
- `RUNTIME_SEPARATION.md`
- `.stash/`

**Build/change:** Stash baseline and handoff documents only. No application code
is to be changed.

**Evidence:** Working-tree inventory, HEAD, simulation boundaries, existing
tests, and current blockers.

**Completion criteria:**
- All entry-point documents exist.
- MASTER roadmap has 28 numbered stages.
- Cline task/report have explicit states.
- The current stage and blockers are recorded.
- No code/configuration changed.

**Dependencies:** None.

## 2. Define the Physical-System Architecture

**Objective:** Assign one execution location to AD TRACKER and one implementation
owner to SWITCHER.

**Tasks:** Define external capture/source host, Android app role, SWITCHER
privileges, broadcast snapshot format, protocol transport, and failure boundaries.

**Completion criteria:** One architecture decision record and trust diagram exist.
Every hardware/privilege dependency is named. No unverified public API is assumed.

**Dependencies:** 1.

## 3. Execute the Automatic-Switching Feasibility Gate

**Objective:** Establish whether exact automatic source switching and restoration
are possible on the selected Android TV/STB.

**Tasks:** Inspect documented Android TV APIs, target TV/STB capabilities,
authorized CEC, OEM, operator, or companion hardware options.

**Completion criteria:** A capability matrix identifies the least-complex viable
implementation or an explicit blocker. Emulator or ordinary-app assumptions do
not count as hardware proof.

**Dependencies:** 2.

**Hard gate:** If exact channel/input restoration cannot be guaranteed, do not
build dependent live switching code. Continue independent detector/software work.

## 4. Define the Authorized Broadcast Signal Source

**Objective:** Select the lawful signal source for commercial-break detection.

**Tasks:** Evaluate operator cue feed, SCTE-35/HLS/DASH, HbbTV/ATSC, or
authorized HDMI/audio source. Define channel/source identity and retention.

**Completion criteria:** One source is approved and accessible. Protected
HDCP/DRM capture is prohibited. Fallback behavior is documented.

**Dependencies:** 3.

## 5. Replace Synthetic Profiles with Validated Contracts

**Objective:** Prevent simulated channel profiles from entering live detection.

**Relevant files:** `breakDurationPredictor.ts`, `types/edison.ts`,
`sharedIntelligencePreview.ts`.

**Tasks:** Add validated channel, broadcaster, region, source, and configuration
keys. Separate samples from live observations.

**Completion criteria:** Unknown profiles are rejected; synthetic profiles cannot
be used in production mode; contract tests pass.

**Dependencies:** 2, 4.

## 6. Implement the AD TRACKER Input Reader

**Objective:** Normalize authorized break metadata into typed observations.

**Relevant files:** `hlsCueParser.ts`, `broadcastMetadataParser.ts`, parser tests.

**Tasks:** Parse start/end/duration/continuity, reject malformed/discontinuous
signals, and correlate clocks.

**Completion criteria:** Recorded fixtures pass; replay/out-of-order/CRC/clock
tests pass; no trigger is emitted from ambiguous input.

**Dependencies:** 4, 5.

## 7. Detection Confidence and False-Positive Protection

**Objective:** Trigger only from independently corroborated valid break evidence.

**Relevant files:** `breakDurationPredictor.ts`, `COMMERCIAL_BREAK_DETECTION.md`.

**Tasks:** Add confirmation windows, confidence thresholds, lower-tail duration
checks, and conservative skip behavior.

**Completion criteria:** Low-confidence and insufficient-window detections never
switch; every decision records evidence/reason.

**Dependencies:** 6.

## 8. AD TRACKER Lifecycle State Handling

**Objective:** Make break events duplicate-, overlap-, and recovery-safe.

**Tasks:** Implement candidate/confirmed/active/ended/uncertain/invalid states,
monotonic clocks, debounce, expiry, and reconciliation.

**Completion criteria:** One trigger is emitted per break; overlapping and
replayed evidence converge safely; uncertain events never switch.

**Dependencies:** 7.

## 9. AD TRACKER-to-Switcher Protocol

**Objective:** Authenticate and version the trigger protocol.

**Tasks:** Define trigger/cancel/status/heartbeat/recovery messages and signed
transport. Include event, channel, confidence, duration, expiry, and correlation
IDs.

**Completion criteria:** Protocol schema, replay, signature, expiry, and malformed
message tests pass.

**Dependencies:** 2, 8.

## 10. Break-Event Persistence and Idempotency

**Objective:** Make break events durable and replay-safe.

**Relevant files:** `d1BreakEventStore.ts`, D1 migrations, D1 event tests.

**Tasks:** Add lifecycle updates, unique event identities, channel/profile
isolation, retention, and PII rejection.

**Completion criteria:** Restart/replay tests pass and no PII or identity conflict
can persist.

**Dependencies:** 9.

## 11. SWITCHER State Machine

**Objective:** Implement a fail-closed transition/restoration state machine.

**Tasks:** Model ordinary, snapshot-ready, switching-in, in-ad, switching-out,
restoration-failed, and watchdog states with deadlines.

**Completion criteria:** Duplicate triggers create no second session; every
terminal state has a bounded action.

**Dependencies:** 3, 9, 10.

## 12. Previous-State Snapshotting

**Objective:** Capture enough state to restore the real viewer experience.

**Tasks:** Record active input, channel/tuner identity, media position where
available, audio state, and snapshot age.

**Completion criteria:** Snapshot completeness is validated; stale or incomplete
state blocks automatic switching.

**Dependencies:** 3, 11.

## 13. Automatic Launch Bridge

**Objective:** Launch EDISON automatically and verify foreground readiness.

**Tasks:** Use the approved Android launch mechanism, correlate session IDs,
wait for readiness, add launch timeout and watchdog.

**Completion criteria:** Controlled emulator tests prove one automatic launch;
failed launch leaves ordinary state unchanged.

**Dependencies:** 11, 12.

## 14. SWITCHER Platform Controls

**Objective:** Connect SWITCHER to the selected real switching implementation.

**Tasks:** Implement only the approved TV/STB/OEM/companion adapter; add capability
checks and explicit unsupported-action handling.

**Completion criteria:** Unsupported or unverified device actions are rejected.
No simulated adapter is used for a live launch.

**Dependencies:** 13.

## 15. Broadcast Restoration

**Objective:** Restore and verify the exact prior broadcast state.

**Tasks:** Restore input/channel/viewing state, verify readiness, retry within
bounds, and terminate with watchdog-safe behavior.

**Completion criteria:** Input and channel verification pass or the state is
explicitly marked unrestorable. Exact restoration is never inferred.

**Dependencies:** 12, 14.

## 16. Native Android Ad-Session Shell

**Objective:** Make EDISON a controlled foreground ad session.

**Relevant files:** `android-tv/app/src/main/kotlin/.../MainActivity.kt`,
manifest and Gradle files.

**Tasks:** Add ad-session states, lifecycle, focus, process-death, and
communication with SWITCHER.

**Completion criteria:** Emulator lifecycle tests pass; replayed/stale triggers
cannot start a second ad; no content claims real playback.

**Dependencies:** 11, 13.

## 17. Approved Ad Media Contract

**Objective:** Define the exact native ad format and delivery source.

**Tasks:** Select container, codec, dimensions, cache policy, authorization,
checksum, expiry, timeout, and fallback.

**Completion criteria:** One versioned contract exists and unsupported media
fails without blocking broadcast restoration.

**Dependencies:** 16.

## 18. Native Ad Playback Integration

**Objective:** Integrate approved Google IMA/Media3 or first-party native playback.

**Tasks:** Initialize player/container, use test assets until approval, clean up
lifecycle listeners, and handle timeout/decode/error.

**Completion criteria:** Emulator test-tag playback passes; dependency provenance
is recorded; no live request is made before approval.

**Dependencies:** 17.

## 19. App-to-Switcher Lifecycle Events

**Objective:** Communicate real playback state to SWITCHER.

**Tasks:** Send ready, started, paused, completed, failed, timeout, and aborted
events with session/correlation IDs.

**Completion criteria:** SWITCHER restores only after a valid completion or
approved terminal outcome; stale replay is rejected.

**Dependencies:** 11, 16, 18.

## 20. Approved Ad Selection

**Objective:** Replace simulated inventory and mock backfill with approved assets.

**Relevant files:** `breakScheduler.ts`, `adDeliveryInfra.ts`, campaign/creative
records.

**Tasks:** Reserve assets against the break duration; enforce eligibility,
frequency, region, expiry, and duration.

**Completion criteria:** Mock adapters are unreachable in production; an ad cannot
exceed the safe break window.

**Dependencies:** 7, 17, 18.

## 21. Idempotent Ad Event Persistence

**Objective:** Persist real ad lifecycle evidence.

**Tasks:** Authenticate device/session; ingest IMA/player callbacks; reject
malformed, replayed, duplicate, and out-of-order events.

**Completion criteria:** Impressions are never inferred from launch or request;
crash/replay tests pass.

**Dependencies:** 10, 19, 20.

## 22. Security and Privacy

**Objective:** Protect credentials, triggers, state snapshots, logs, and events.

**Tasks:** Review Keystore, credential rotation, replay/signatures, authorization,
PII, switching permissions, and third-party dependencies.

**Completion criteria:** A scoped security review passes and unresolved risks have
owners. No secrets exist in Git or stash.

**Dependencies:** 9, 12, 21.

## 23. Watchdog and Failure Recovery

**Objective:** Make all interruptions fail closed.

**Tasks:** Cover launch timeout, app crash, decoder crash, network loss, ad
timeout, process death, and restoration failure.

**Completion criteria:** Every fault ends in verified restoration or explicit
restoration-failed state. No duplicate switch can occur.

**Dependencies:** 11, 15, 16, 19.

## 24. Repository CI and Automated Baseline

**Objective:** Establish green automated build and test gates.

**Tasks:** Reconcile existing failures, add Android CI, pin toolchains, and add
parser/protocol/lifecycle/D1/failure tests.

**Completion criteria:** Relevant Node and Android builds/tests pass in CI;
simulation-only tests are clearly labeled.

**Dependencies:** 5 through 23, with Stage 3 as an independent blocker gate.

**Blocker-independent preparation:** An Android CI job is configured to run the
TV application's JVM unit tests and debug APK assembly. The first hosted run
failed because the action's default legacy `tools` package is unavailable; the
second reached Gradle but failed because the wrapper lacks the executable bit.
Both issues were corrected. [GitHub Actions run 45903131145](https://github.com/ntomalaba29/EDISON/actions/runs/45903131145)
passed both the Android job and existing Node/Playwright job. This is
software-build evidence only; it does not complete Stage 24, Stage 33, emulator
testing, or physical-device validation. Checkout still reports a non-blocking
warning for the existing `research/study/adhush` gitlink missing a `.gitmodules`
entry.

## 25. Emulator End-to-End Testing

**Objective:** Verify the complete software state sequence.

**Tasks:** Inject authorized break events, launch EDISON, play approved test
assets, restore a simulated state, and exercise duplicate/crash/timeout paths.

**Completion criteria:** A complete trigger-to-restoration event log passes.
Emulator evidence is labeled as software-only.

**Dependencies:** 24.

## 26. Physical-Device Prerequisites

**Objective:** Prepare a controlled hardware validation.

**Tasks:** Record TV/STB model, firmware, Android version, CEC behavior, switching
method, signed artifact, test source, logs, and rollback.

**Completion criteria:** Every target is identified and authorized. Switching
method is not merely an emulator adapter.

**Dependencies:** 3 and 23 through 25.

## 27. Physical Android TV End-to-End Validation

**Objective:** Demonstrate the real workflow on target hardware.

**Tasks:** Detect an authorized commercial break, launch EDISON automatically,
play the approved ad, report lifecycle, restore and verify exact input/channel,
and test timeout/failure.

**Completion criteria:** Exact source and channel restore. No manual launch or
manual channel selection. Lifecycle and restoration reconcile. Hardware evidence
is attached.

**Dependencies:** 26.

## 28. Final Production Acceptance

**Objective:** Authorize or reject the final system.

**Tasks:** Review ads/Google eligibility, privacy, security, licensing,
compatibility, support, rollback, and physical evidence.

**Completion criteria:** Physical end-to-end acceptance passes. Automated gates
pass. Risks are owned or explicitly waived. Software completion and production
readiness are reported separately.

**Dependencies:** 27.

## 29. Finish Android Enrollment and Cloudflare D1 Operations

**Objective:** Complete the existing EDISON TV enrollment foundation before
automatic switching depends on a valid device identity.

**Relevant files:** `android-tv/app/src/main/kotlin/.../TvEnrollmentClient.kt`,
`src/server/app.ts`, `src/server/cloudflare/d1TvEnrollmentStore.ts`,
`migrations/cloudflare-d1/0004_tv_enrollments.sql`, `wrangler.jsonc`.

**Tasks:** Add credential rotation/recovery, edge-wide abuse control,
owner-authorized staging migration/secret setup, restart persistence verification,
and only required TV configuration APIs. Keep remote operations blocked until
owner authorization.

**Completion criteria:** Local and staging tests pass, D1 migration is applied,
pairing secret is configured, revoked/expired credentials fail, and
`applicationApiReady` remains false until end-to-end evidence is real.

**Dependencies:** 16, 24.

**Owner:** Copilot for architecture/security; Cline may add focused tests and
fixtures after Stage 24.

## 30. Reconcile the Whole-App Baseline

**Objective:** Make the repository's automated and application evidence honest.

**Relevant files:** `tests/countryLaunch.test.ts`,
`tests/d1AuthSessionApp.test.ts`, `src/server/countryLaunchEngine.ts`,
`src/server/store.ts`, `tests/` and the readiness reports.

**Tasks:** Update stale assertions after retiring phased launch writes, identify
genuine defects, repair 33/34 readiness invariant disagreements, reconcile
retired route behavior, and run the complete Node suite and browser suite.

**Completion criteria:** The applicable baseline is green or every remaining
failure is separately classified as an explicit defect/blocker. No stale 34/33
count or retired 200 expectation remains.

**Dependencies:** 24.

**Owner:** Cline for bounded test/helper corrections; Copilot for integration
review and cross-module defects.

**Current evidence (2026-11-26):** Local baseline reconciliation is complete:
`npm.cmd run lint` passes; Vitest passes 36 files (165 passed, 1 skipped);
Playwright passes 2/2. CL-01 is accepted with Copilot repairs. Stage 30 remains
`IN PROGRESS` because Stage 24 is a declared dependency and Android/CI gates
remain open.

## 31. Complete Media Ingestion and Delivery Validation

**Objective:** Establish approved Android-native ad media support.

**Relevant files:** `src/server/mediaWorker.ts`, `src/server/adDeliveryInfra.ts`,
`src/server/broadcastRenderEngine.ts`, media tests, Android app.

**Tasks:** Define source, format, checksum, cache, timeout, validation,
transcoding and fallback. Distinguish direct worker functionality from Cloudflare
sandbox restrictions.

**Completion criteria:** An approved media contract and real Android playback
fixture pass automated and emulator tests.

**Dependencies:** 17, 29.

**Owner:** Copilot for architecture/player; Cline for typed fixtures and
focused validation tests.

## 32. Complete Privacy, Consent, and DSR Production Gates

**Objective:** Make privacy behavior release-ready rather than software-simulated.

**Relevant files:** `src/server/trackBHouseholdConsent.ts`,
`src/server/privacyComplianceEngine.ts`, policy drafts, legal docs.

**Tasks:** Reconcile draft policies, owner counsel decisions, data minimization,
retention, consent epochs, QR revocation, and device switching telemetry.

**Completion criteria:** Required owner/legal decisions are recorded and
automated privacy tests pass. Any missing external approval remains a blocker.

**Dependencies:** 22, 29.

**Owner:** Copilot for implementation/security; Cline for unit fixtures and
documentation consistency checks.

## 33. Complete Android CI and Scoped Automated Verification

**Objective:** Put Android and switcher verification into CI.

**Relevant files:** `.github/workflows/edison-ci.yml`, `android-tv/`,
`tests/hlsCueParser.test.ts`, `tests/d1BreakEventStore.test.ts`,
`tests/tvPlatformAdapter.test.ts`, future switcher tests.

**Tasks:** Add Android JVM/Gradle jobs, emulator smoke profile, protocol tests,
failure tests, idempotency tests, and protected-artifact hashes.

**Completion criteria:** CI is scoped, reproducible, and blocking for the release
branch. Emulator and physical evidence remain separate.

**Dependencies:** 24, 29, 31.

**Owner:** Cline may add pinned CI/test steps; Copilot owns Android orchestration
and security-critical workflow changes.

## 34. Complete AdSense, GAM, and IMA Eligibility Assessment

**Objective:** Separate website AdSense eligibility from CTV GAM/IMA eligibility.

**Tasks:** Document AdSense property requirements if owned, and owner/Google
account evidence for GAM/IMA. Verify permitted CTV formats and test tags.

**Completion criteria:** Exact approved product/configuration is recorded or
explicitly blocked. No AdSense or AdMob substitution is claimed for Android TV.

**Dependencies:** 18, 31.

**Owner:** Copilot; external account/owner action.

## 35. Complete Operational Deployment and Incident Readiness

**Objective:** Establish monitored staging and controlled deployment procedures.

**Tasks:** Complete Cloudflare D1/secret configuration, R2 decision,
backup/restore, monitoring, crash reporting, signing-key custody, rollback,
support, and incident runbooks.

**Completion criteria:** Staging deployment is verified, no secret is in Git,
rollback and health evidence pass, and production release remains owner-gated.

**Dependencies:** 29 through 34.

**Owner:** Copilot; Cline may update runbooks and configuration-free verification
scripts only after explicit task assignment.

## 36. Final Launch Evidence and Sign-Off

**Objective:** Prepare final software/physical readiness without claiming
unverified completion.

**Tasks:** Reconcile test evidence, physical switch/restore evidence, ad event
reconciliation, privacy, security, licensing, Google approval, operations, and
owner sign-off.

**Completion criteria:** Separate software and production readiness reports
exist. All physical/owner/account gates are pass or blocked. No false completion
is recorded.

**Dependencies:** 27, 28, 33, 34, 35.

**Owner:** Copilot lead; external hardware/account/legal approvals require owner
authorization.

## Cline Task Allocation Queue

Only one Cline task may be active at a time.

| Task | Stage | Owner | Bounded objective | Status |
|---|---:|---|---|---|
| CL-01 | 30 | Cline | Reconcile retired country-launch helper and stale route tests | ACCEPTED |
| CL-02 | 24 | Cline | Add HLS parser malformed/duplicate/discontinuity fixture tests | QUEUE |
| CL-03 | 24 | Cline | Expand Android lifecycle unit tests for setup/approved/error states | QUEUE |
| CL-04 | 24 | Cline | Add D1 break-event identity/replay/PII rejection test cases | QUEUE |
| CL-05 | 24 | Cline | Add offline-cache stale-scope and replay test cases | QUEUE |
| CL-06 | 31 | Cline | Add media contract fixtures and validation test cases | QUEUE |
| CL-07 | 33 | Cline | Add Android CI build/unit-test steps with pinned SDK/JDK | QUEUE |
| CL-08 | 30 | Cline | Add a focused TypeScript test inventory/report script | QUEUE |
| CL-09 | 32 | Cline | Reconcile privacy draft and roadmap status labels | QUEUE |
| CL-10 | 35 | Cline | Add configuration-free release-readiness checklist validation | QUEUE |

## Copilot-Only Work Allocation

The following work is not delegated to Cline:

| Workstream | Stages | Reason |
|---|---:|---|
| Automatic switching architecture and feasibility | 2–3 | Hardware/API uncertainty and final technical decisions |
| Real broadcast signal acquisition | 4–9 | Authorization, security, and detection correctness |
| SWITCHER state/snapshot/platform/restoration | 11–15 | Privileged and cross-system integration |
| Native Android ad shell/player/lifecycle | 16–21 | Android/player/security integration |
| Security, privacy and watchdog orchestration | 22–23 | Security-critical cross-module decisions |
| CI/repository integration and baseline repair | 24, 30, 33 | Integration ownership and ambiguous failures |
| Physical hardware and final acceptance | 26–28, 36 | Hardware, account, and owner authorization |
| Enrollment and Cloudflare operations | 29 | Security, remote configuration and deployment boundaries |
| Google CTV/AdSense eligibility | 34 | External account and legal/policy decisions |

## Evidence rules

- `IMPLEMENTED` requires source and passing automated tests.
- `EMULATOR_VERIFIED` requires emulator or Android host evidence.
- `PHYSICAL_VERIFIED` requires the actual target device, source, logs, and artifact.
- `BLOCKED` requires an exact external dependency and owner action.
- `SIMULATED` never closes a live capability gate.
