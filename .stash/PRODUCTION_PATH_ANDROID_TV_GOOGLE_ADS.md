# EDISON Production Path — Android TV + Google CTV Ads

**Status:** Active execution plan; production readiness is not established  
**Last reviewed:** 2026-11-26  
**Repository snapshot:** `1e28771293defed325da07d7b6fa476a25074c55` (`test`)  
**Scope:** EDISON's Android TV application, its Google CTV advertising integration, and the build/CI/technical evidence required for those components.

This is the authoritative task ledger for this scoped effort. It replaces the Android TV/advertising completion counts and status claims in older `.stash` notes. It does not recalculate the separate 99-substage general project ledger. Do not report a percentage for this path.

## Continuation protocol

1. Read this file before starting work. Preserve unrelated worktree changes.
2. Take the next unblocked task in order. A task is complete only when its acceptance evidence is recorded here and the relevant code/tests/build checks pass.
3. Keep `Status`, evidence, and `Next task` current at the end of each work session. If interrupted, record the exact in-progress item, changed files, last command and result, and next command here.
4. Distinguish application code, mocks/simulations, research samples, account configuration, and physical-device results. A document, mock, test fixture, capability enum, or architecture contract is not implementation evidence.
5. Never record secrets, Google account tokens, signing keys, or device credentials in this file or the repository. No production ad requests, billing changes, deployment, or release without explicit owner authorization.

## Product and evidence baseline

- The user has requested a production-ready Android TV product and asked that the work be completed sequentially and recoverably.
- The user's “Google AdSense” wording is recorded, but the repository's own business/architecture notes say ordinary AdSense is not a native Android TV ad SDK; the described CTV path is Google Ad Manager (GAM) with the Google IMA SDK. Confirm eligibility and account requirements with Google before any live integration. Do not silently substitute products or represent an AdSense account as GAM approval.
- At the audited repository root, no EDISON Android Gradle project, manifest, Kotlin/Java app source, or Google IMA dependency/integration was found. Android projects under `research/study/` are reference material, not the EDISON app.
- `src/server/tvPlatformAdapter.ts`, AURA and related TV code model platform capabilities and test harnesses. They do not operate an Android TV device. `hardwareTested` remains false.
- The shared-intelligence preview seeds synthetic TV IDs and bundle records. Its prior `isPrototypeSimulation: false` value contradicted the fixtures and the declared type.
- The type declaration in `src/server/sharedIntelligencePreview.ts` was syntactically incomplete and blocked TypeScript checking.
- The committed Android TV/advertising tracker claimed tasks complete without native app, IMA, playback, live ad event, or physical-device evidence. Those claims are not accepted as completion evidence.
- The README describes the product as pre-production and the Cloudflare preview as an app shell, with application API, media upload and media processing readiness false.
- Initial worktree was clean at the repository snapshot above. No deployment, device test, or Google account verification has been performed by this work.

## Scope boundaries and release blockers

Included: Android TV / Google TV app, eligible Google CTV ad path, ad playback lifecycle and event correctness, relevant backend integration, CI/build/package correctness, and verification.

Excluded: Samsung Tizen, LG webOS, Fire TV, AdMob, OpenRTB, paid-advertiser purchasing/billing, and unrelated product subsystems.

Production release remains blocked until the app exists, Google confirms an eligible account/product configuration, real playback/events are validated, security/privacy/policy gates pass, and a supported physical Android TV device passes the release test. Any step requiring an owner account, signing key, paid service, legal decision, hardware, deployment, or public release must be explicitly identified as owner action; do not simulate its completion.

## Ordered task ledger

Status values: `IN PROGRESS`, `PENDING`, `BLOCKED`, `DONE`. No task is `DONE` without its acceptance evidence.

| ID | Status | Task and acceptance evidence | Depends on |
|---|---|---|---|
| AUD-01 | DONE | Repair the malformed TypeScript type, restore the declared shared-intelligence history shape, fix the missing helper/version references and app import found by the compiler, and truthfully label seeded fixtures as simulation. `npm.cmd run lint` passes; all 11 shared-intelligence tests pass, including the new synthetic-fixture assertion. | — |
| AUD-02 | DONE | Run and record the software baseline plus current CI status. Baseline is not green; see the work log and BASE-01. | AUD-01 |
| BASE-01 | BLOCKED | Reconcile the existing non-Android failures before claiming repository CI is green: 13 Vitest failures (mostly 33/34 readiness assertions because the legacy country-launch verification returns 7/8, plus tests that expect country-launch routes to remain live although the app returns 410) and one E2E assertion for a PostgreSQL readiness message absent from the UI. Do not silently restore retired behavior or broaden product scope; agree whether to update stale tests or change behavior before touching those contracts. | AUD-02 |
| ARCH-01 | DONE | Owner chose a standalone foreground app: EDISON plays only after the viewer opens EDISON; no overlay/takeover of another app's tuner, HDMI input, or protected surface. IMA/Media3 are for EDISON's own app-owned video playback. | AUD-02 |
| ARCH-02 | DONE | Reviewed current official Android TV, Android TV quality, IMA Android TV, IMA compatibility and Media3-IMA integration guidance. Source notes below. Google publisher-account/product approval is a separate owner gate in ADS-01. | ARCH-01 |
| APP-01 | DONE | Created the EDISON-owned native Android TV Gradle project under `android-tv/`, isolated from research samples. Owner selected app ID `io.github.malaba29.edison.tv` and launcher name `EDISON TV`. JDK 17, API 36, Build-Tools 36.0.0, Platform-Tools 37.0.3, AGP 9.5.3, and Gradle wrapper 9.9.2 are configured. The wrapper distribution SHA-256 is pinned. `.\android-tv\gradlew.bat --no-daemon --console=plain -p android-tv :app:assembleDebug` passes; `aapt dump badging` confirms the package, TV launcher activity, and non-required touchscreen. APK SHA-256 and remaining limitations are in the work log. Store availability/ownership of the chosen ID is not verified; no emulator or hardware test has run. | ARCH-02 |
| APP-02 | DONE | Implemented a D-pad/focus-first TV shell with setup/loading/error/empty/ready states, lifecycle-safe pause/destroy handling, and an Exit action. JVM state/lifecycle tests pass. Android 16 TV emulator 1920×1080 validation passed: APK installed and launched by Leanback category, setup-required UI was readable, Exit was initially focused, D-pad Center exited, and Back removed the app from foreground. No real player or playback is implemented, so this task does not claim media or ad readiness. | APP-01 |
| APP-03 | PENDING | Define and implement device enrollment/authentication against the selected EDISON backend. Use least privilege, short-lived/revocable credentials, safe pairing, replay protection, and documented recovery; no synthetic device is production enrollment evidence. | APP-01, backend decision in APP-04 |
| APP-04 | PENDING | Decide and document the supported deployed API runtime/endpoint. Implement only the endpoints the Android app needs for configuration/ad decision and events; verify auth, authorization, schema validation, persistence, migrations, and restart behavior. Do not make a local Express-only path appear production-ready. | ARCH-01 |
| MEDIA-01 | PENDING | Define the source and delivery requirements for ad media: supported formats/codecs, HTTPS, timeouts, cache policy, content validation, and error behavior. Confirm the selected Android player can play the chosen assets on the supported device/API range. | APP-01 |
| ADS-01 | PENDING | Resolve the intended Google product with Google and the owner: ordinary AdSense is not presumed suitable for native CTV; document GAM CTV eligibility, account approval, inventory/ad-tag prerequisites, privacy/policy constraints, and any owner-only actions. Confirm whether only linear video ads are acceptable: current IMA Android compatibility matrix lists Android support for linear ads, but not linear-display or non-linear overlays. No live ad request until approved. | ARCH-02 |
| ADS-02 | PENDING | Add the supported Google IMA SDK dependency and initialize its ad display container/loader with a non-production test configuration. Verify SDK version, dependency provenance/license, app lifecycle cleanup, and test-ad request on emulator. | APP-01, MEDIA-01, ADS-01 |
| ADS-03 | PENDING | Implement the ad request → load → play → pause/resume/skip (where allowed) → completion/error lifecycle using the selected Android media player and IMA APIs. Verify event ordering, listener cleanup, timeout behavior, and no UI deadlocks. | ADS-02 |
| ADS-04 | PENDING | Implement server-side, authenticated, idempotent event ingestion for actual IMA/player events. Persist request/session correlation and event type/timestamp; reject duplicates/replays and malformed/out-of-order inputs. Never count an ad request or simulated playback as an impression. | APP-04, ADS-03 |
| ADS-05 | PENDING | Implement and test policy-compliant consent/privacy behavior, age/child handling if applicable, regional restrictions supplied by approved policy, data minimization, retention, and user-facing disclosures. Obtain owner/counsel review where required; do not invent legal approval. | ADS-01, APP-03, ADS-04 |
| SAFE-01 | PENDING | Make playback fail safely on network loss, ad timeout, decode error, app process death, background/foreground transitions, and device restart. Return to a usable app/ordinary TV state without fabricated completion or impression events. | APP-02, ADS-03 |
| SAFE-02 | PENDING | Review device credential storage, transport security, logging/PII, request validation, dependency risks, abuse limits, and event authorization. Add focused regression tests; record unresolved risks and any independent review required. | APP-03, APP-04, ADS-04 |
| CI-01 | PENDING | Add Android build and unit-test jobs to GitHub Actions, pin compatible JDK/Gradle/Android SDK tooling, cache safely, and make failures block the scoped release branch. Keep existing TypeScript/Node CI intact. | APP-01 |
| CI-02 | PENDING | Add automated Android tests for app lifecycle, remote/focus controls, player state transitions, IMA event mapping, event retry/idempotency, and failure paths. Run relevant full repository checks in CI. | APP-02, ADS-03, ADS-04, CI-01, BASE-01 |
| QA-01 | PENDING | Run reproducible Android emulator tests on a documented supported API/device profile; record artifact hash, environment, commands, results, logs, and defects. Emulator tests do not satisfy physical-device acceptance. | CI-02 |
| QA-02 | PENDING | On owner-provided Android TV / Google TV hardware, verify installation, D-pad operation, real ad test-tag playback, network interruption/recovery, event delivery, and logs. Record make/model, OS/build, app version/hash, test configuration, measurements, and owner-observed result. | QA-01, ADS-03, ADS-04 |
| QA-03 | PENDING | After Google account/format approval, owner authorization, policy review, and successful test-tag validation, verify a permitted real campaign/ad on the target device and reconcile IMA callbacks with persisted reporting. Never use live ads for test traffic or click test ads. | ADS-01, ADS-05, QA-02 |
| REL-01 | PENDING | Produce signed release artifact with owner-controlled signing, versioning, reproducible build instructions, rollback/update plan, crash/health observability, and support/incident runbook. Do not store signing material in Git. | CI-02, SAFE-02, QA-02 |
| REL-02 | PENDING | Complete owner and qualified reviewer sign-off for Google publisher policy, applicable privacy/consumer/platform requirements, distribution terms, incident response, and launch authorization. Record blockers; software tests cannot grant these approvals. | ADS-05, QA-03, REL-01 |

## Current work log

### 2026-11-26 — initial audit, source repair, and baseline verification

- Verified HEAD `1e28771293defed325da07d7b6fa476a25074c55`, subject `test`; initial worktree clean.
- Baseline `npm.cmd run lint` failed at `src/server/sharedIntelligencePreview.ts:203` with TypeScript parse errors (`'>' expected`, expression/colon expected).
- Confirmed `SharedIntelPreviewState.isPrototypeSimulation` is the literal type `true`, API regression expects `true`, and persistence validation rejects anything other than `true`; seeded initial state incorrectly returned `false`.
- Found only research/reference Android projects under `research/study`; no EDISON root Android project or IMA implementation was found.
- Repair also exposed and fixed compile blockers in this path: the shared duration-history field was absent from its state type, percentile calls referenced a nonexistent object, the promotion version was undefined, and an existing route referenced an unimported country-launch verification helper. The history is now cloned with state to preserve isolation. Seed records and their audit text now explicitly identify as synthetic simulation.
- `npm.cmd run lint` — PASS after repairs.
- `npm.cmd test -- tests/sharedIntelligence.test.ts` — PASS, 11 tests.
- `npm.cmd test -- tests/sharedIntelligence.test.ts tests/apiRegression.test.ts` — 17 passed, 1 failed. Shared-intelligence API coverage passed; remaining failure is the existing readiness result `33/34`.
- `npm.cmd test` — FAIL: 35 files; 147 passed, 13 failed, 1 skipped. Failures trace to the existing readiness invariant and tests expecting retired country-launch routes to remain active. See BASE-01; do not treat this as a green CI baseline.
- `npm.cmd run test:e2e` — FAIL: 1 passed, 1 failed. TV app Back-control test passed; `tests/e2e/edison.spec.ts` timed out expecting a “Verified real PostgreSQL 16+ schema migrations” UI message that was absent.
- `npm.cmd run build` — PASS; Vite reports the existing ~1.29 MB JavaScript chunk-size advisory.
- `git diff --check` — PASS.
- GitHub Actions run [45768819903](https://github.com/ntomalaba29/EDISON/actions/runs/45768819903) for this audited commit failed at the TypeScript step; subsequent CI steps were skipped. Local type-check passes after the repairs, but the remote run remains a failure on the committed snapshot. No push or deployment was made.
- Owner selected the **standalone foreground Android TV app** model. EDISON will not claim to control external TV tuners, HDMI, or another app's protected surface.
- Official platform review (accessed 2026-11-26):
  - [Android TV app development](https://developer.android.com/training/tv/get-started): TV UX is D-pad-first and designed for viewing distance; TV apps are on-device apps.
  - [Android TV app quality guidelines](https://developer.android.com/docs/quality-guidelines/tv-app-quality): launcher integration, D-pad navigation, landscape layout, minSdk 31 or lower for broad TV support, user-visible ad interaction; full-screen non-video ads must be dismissible and certain non-fullscreen clickable ads cannot link to web URLs or non-TV apps.
  - [IMA SDK Android TV best practices](https://developers.google.com/interactive-media-ads/docs/sdks/android/client-side/android-tv): skip-button focus behavior is supported for TV; Connected TV VAST icon fallback UI has specific focus and lifecycle behavior.
  - [IMA Android / Media3 ExoPlayer integration](https://developers.google.com/interactive-media-ads/docs/sdks/android/client-side/get-started/exoplayer-extension): current guide demonstrates Media3 IMA extension (`media3-exoplayer-ima` 1.11.0), compileSdk 36, minSdk 24, Java 17 and core-library desugaring; it uses Google sample video/ad tags and documents AdsLoader/player lifecycle. Use test tags only until account approval and test gates.
  - [IMA Android compatibility matrix](https://developers.google.com/interactive-media-ads/docs/sdks/android/client-side/compatibility): Android IMA lists linear ads as supported, while linear-display and non-linear overlay ads are unsupported. Therefore do not promise IMA delivery of image/banner or text-only formats.
- ARCH-02 closes the technical platform/source review, not Google account eligibility. ADS-01 remains pending owner/Google verification.
  - Toolchain probe (2026-11-26): no Java/JDK, Gradle, Android Studio, or Android SDK found in standard paths or PATH; `winget` is available. APP-01 is blocked pending owner approval to install the Android build toolchain. No packages or system tools were installed.
  - Owner authorized Android Studio installation. `winget` resolved official Google LLC package `Google.AndroidStudio` version `2026.2.2.10`; installer metadata reported 1,531,610,672 bytes. Download showed no measurable progress after repeated waits; the exact winget process was stopped before installation. The partial zero-byte temp file at `C:\Users\HP\AppData\Local\Temp\WinGet\Google.AndroidStudio.2026.2.2.10\DOB34E.tmp` remains locked by an unidentified process and was not forcibly removed. No Android Studio/JDK/SDK was installed.
  - Owner selected a full installer retry. The second attempt also stalled: at 2026-11-26 12:51 +0100, both cache files (`DO6DAA.tmp` 1,528,823,808 bytes and `DOB34E.tmp` 1,529,872,384 bytes) had been unchanged since 12:06 and 11:51; `winget list` confirmed Android Studio was not installed. Stopped the exact winget process PID 43608 and verified it exited. Do not retry the same large installer again without a changed download method.
  - Owner authorized the minimal command-line toolchain. Official Temurin JDK 17 package metadata was verified (`EclipseAdoptium.Temurin.17.JDK` 17.0.21.102); winget verified the MSI hash and began installation. A Windows OS elevation approval prompt is open; the agent did not interact with it. Owner must approve or cancel directly.
  - Downloaded Google's official `commandlinetools-win-15859902_latest.zip` (155,655,386 bytes); SHA-256 `90AE805D20434428BFFCB699C290860F19BB5F66A67E6B330067E3DE801FB04A` matches Google's published checksum. Extracted `sdkmanager.bat` to `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin`. Android SDK platform/build tools are not yet installed.
  - Owner approved the Windows elevation prompt. Temurin JDK 17.0.21.1+2 is installed at `C:\Program Files\Eclipse Adoptium\jdk-17.0.21.10002-hotspot`; invoking its `java.exe` directly reports version 17. `sdkmanager.bat --version` reports 22.0.
  - Owner had explicitly authorized accepting Google's binding Android SDK license. The initial `sdkmanager --licenses` attempt did not accept anything; it stopped after printing the first of eight available agreements. A package-scoped install prompt then showed that API 36, Build-Tools 36.0.0, and Platform-Tools 37.0.3 require only `android-sdk-license`. Accepted that Google SDK agreement and installed those three packages. Verified `sdkmanager --list_installed`; `%LOCALAPPDATA%\Android\Sdk\licenses\android-sdk-license` exists. No Google TV add-on or third-party agreement was accepted.
  - No global Gradle command is available. The project still needs its Gradle wrapper, native source scaffold, final app ID, and a successful debug build. No publishable package identity was found in the repository; ask the owner before establishing one.
  - Owner selected `io.github.malaba29.edison.tv` after confirming no company domain exists; launcher display name is `EDISON TV`. This ID is based on the repository owner namespace, not verified as a Google Play listing or trademark. Verify Play availability and ownership before release; changing an ID after publication would create a different app.
  - Added the standalone Android TV project under `android-tv/`, with Kotlin app entry point, `LEANBACK_LAUNCHER`, required Leanback/optional touchscreen features, landscape orientation, launcher banner, and placeholder screen. `android-tv/README.md` documents the current scope and build command. Root `.gitignore` excludes local Android build state.
  - Toolchain: Temurin JDK `17.0.21.1+2`; Android API `36` (platform package revision 2), Build-Tools `36.0.0`, Platform-Tools `37.0.3`; AGP `9.5.3`; Gradle `9.9.2`. The official Gradle archive's SHA-256 (`971fcd7150ca4ba04852c0b2ca0d2d0ab9468e14b03473eab19528809914c76b`) matches the published checksum and is pinned in `android-tv/gradle/wrapper/gradle-wrapper.properties`.
  - `.\android-tv\gradlew.bat --version` — PASS; wrapper downloaded and verified Gradle 9.9.2.
  - `.\android-tv\gradlew.bat --no-daemon --console=plain -p android-tv :app:assembleDebug` — PASS; debug APK created at `android-tv/app/build/outputs/apk/debug/app-debug.apk`. `aapt dump badging` confirms package `io.github.malaba29.edison.tv`, label `EDISON TV`, `LEANBACK_LAUNCHER` activity `MainActivity`, and touchscreen not required. APK SHA-256: `AB375E4C6C53D536A58C592D8E519BA57E4C6AD206C35924804F36F0660ED86A`.
  - `--warning-mode=all` exposed a Gradle deprecation from `Configuration.setVisible(boolean)`, scheduled for removal in Gradle 11. It is emitted during AGP configuration, not by project-authored DSL; leave the warning visible and revisit on plugin upgrades rather than suppressing it.
  - APP-01 closes only the native project/build scaffold. No IMA, media source, backend connection, device enrollment, emulator install/playback, physical TV test, live ad request, or production release has been implemented or verified.
  - Began APP-02 with a D-pad-oriented setup-required screen, explicit playback-unavailable messaging, a visible focused state on the sole available action, and a working Exit action. No mock content or simulated playback is presented.
  - `.\android-tv\gradlew.bat --no-daemon --console=plain -p android-tv :app:assembleDebug` — PASS after APP-02 UI changes. `aapt dump badging` again confirms the app ID, TV launcher label/activity, and optional touchscreen. `git diff --check` — PASS.
  - Current debug APK SHA-256: `26B765D4276992555B0026B93D217B7859F05B5DDD2395F5AD7AC1D337FD8CAA`.
  - At this checkpoint APP-02 was still in progress; the later emulator validation below supersedes that status.
  - Expanded APP-02 with an explicit `Loading`, `SetupRequired`, `Empty`, `Error`, `Ready` state model and rendered loading/error/empty/setup/ready messages. The current launch state remains setup-required; no state claims real playback readiness.
  - Added `TvShellStateTest` with JUnit 4.13.2. The suite passed after setting `ANDROID_HOME` and `ANDROID_SDK_ROOT` explicitly:
    - `.\android-tv\gradlew.bat --no-daemon --console=plain -p android-tv :app:testDebugUnitTest :app:assembleDebug` — PASS.
    - The test proves non-ready states cannot be confused with the Ready state and that retry is separately represented for errors.
  - Latest debug APK SHA-256 after the APP-02 state changes: `6978915F90FE08F4AC331ADC8E629DC5CD52C50DB22E1CC0DF926865FF2C971C`.
  - Added emulator-independent lifecycle handling: `onPause` stops a Ready-state playback marker and `onDestroy` clears it; setup/loading/error/empty states do not stop or claim a playback. JUnit lifecycle tests pass.
  - Latest debug APK SHA-256 after lifecycle changes: `545CDA16E5A305D733A4C2A08DD44D0FE3CF7A24E54FC4677CB033243D7D98EB`.
  - Emulator runtime validation passed on Android 16 (`sdk_google_atv64_x86_64`) with WHPX acceleration:
    - EDISON APK installed successfully with `adb install -r -t`.
    - Leanback launcher monkey launch succeeded.
    - UI hierarchy confirmed `EDISON TV`, `SETUP REQUIRED`, setup message, playback unavailable message, and initially focused `Exit EDISON TV`.
    - Captured 1920×1080 emulator screenshot verified readable layout and focus ring.
    - D-pad Center on focused Exit left the app with `visible=false`.
    - D-pad Back also left EDISON without a resumed/foreground activity.
    - No `FATAL EXCEPTION` or app crash was found in the collected logcat window.
  - Emulator package `37.3.10`, Android TV system image `android-36;android-tv;x86_64`, and Google TV system image `android-36;google-tv;x86_64` were installed. A manually registered AVD named `EDISON_TV_API36` was created with a 1080p TV profile.
  - Emulator access was initially blocked; this was resolved when the owner enabled Windows Hypervisor Platform and restarted. `emulator -accel-check` returned `WHPX(10.0.19045) is installed and usable`, and the Android 16 TV AVD booted. The firmware virtualization property remained false in one Windows CIM query, but it did not prevent WHPX acceleration or emulator runtime validation.
  - APP-02 emulator validation is complete; see the verified Android 16 TV launch, UI hierarchy, focus, D-pad Center/Back, and logcat evidence above.
  - Commit `5868d4a` added the Android TV scaffold and scoped audit repairs; merge commit `d2b878f` integrated remote commit `3a6a847` and was pushed to `new-origin/main`. Production readiness remains unestablished.

## Next task

    Continue with APP-03: define and implement device enrollment/authentication against the selected EDISON backend. Before implementation, record the backend decision from APP-04: the app must not depend on a local-only Express runtime or appear to have production fleet enrollment. Use short-lived/revocable credentials, safe pairing, replay protection, and documented recovery. No synthetic device is completion evidence. Physical Android TV QA remains a later gate, and Google IMA/live ads remain blocked on account eligibility and explicit approval. BASE-01 remains an explicit repository CI/release blocker; do not claim the full suite is green or change unrelated route behavior without an agreed scope decision.
