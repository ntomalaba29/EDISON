# EDISON Project Status — 2026-11-26

## Current handoff

The current numbered queue and evidence ledger are:

[`PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md`](PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md)

The owner asked to finish the existing Android TV enrollment/API work first.
APP-03 is in progress: the owner approval screen, QR/code flow, Android
Keystore-encrypted session, and polling client now exist locally. The remaining
APP-03 work is credential rotation/recovery and end-to-end staging verification.
APP-04 has local D1/API groundwork but is not deployed or ready.

## Current assessment

**Not production ready.** The native Android TV project and setup-required
shell exist; Android 16 TV emulator evidence covers install, launch, layout and
D-pad Exit/Back behavior. Playback, Google IMA, actual ad requests/events,
physical TV verification and production enrollment are not complete. The
public Cloudflare preview still reports `applicationApiReady:false`.

The local D1 enrollment API has five focused passing tests; TypeScript check,
web production build, Android JVM tests and APK build pass. Android 16 TV AVD
install/launch and initial focus are verified. No live enrollment request was
sent. The full repository baseline remains non-green; see BASE-01 in the
authoritative queue. No Cloudflare secret, remote migration, deployment, live
ad request or release was performed.

## Scope and guardrails

The queue covers Android TV, native Google CTV advertising, a separate AdSense
website-eligibility assessment, and directly required build/CI/technical
verification. Tizen, webOS, Fire TV, AdMob, other ad networks and paid-advertiser
marketplace/billing work are excluded. Do not deploy, change billing, make live
ad requests, or claim owner/legal/hardware approvals without explicit
authorization and recorded evidence.
