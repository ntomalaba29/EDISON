# EDISON Project Status — 2026-11-27

## Current handoff

The current numbered queue and evidence ledger are:

[`PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md`](PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md)

The owner asked to finish the existing Android TV enrollment/API work first.
APP-03 is in progress: the owner approval screen, QR/code flow, Android
Keystore-encrypted session, polling client, credential rotation/recovery, and
old-token rejection now exist locally. The remaining APP-03 work is end-to-end
staging and restart verification. MEDIA-01 software media-contract work is complete,
but real delivery and Android playback remain open. Stage 16 now has a bounded
Android ad-session state machine and JVM tests, but no real player or IMA trigger.
Stage 19 has a bounded app lifecycle-event envelope and JVM tests, but no real
player or SWITCHER transport.
Stage 21 server-ingestion guards are implemented in software for replay payload,
timestamp, minimum playback and lifecycle order, but there is no real IMA/player
callback persistence.
Stage 23 has a bounded Android watchdog decision model for deadlines and
interruptions, but no OS/hardware watchdog or physical restoration proof.
Stage 22 has credential, replay, PII and no-store controls with passing focused
tests. Independent security review, legal/privacy decisions and remote abuse
controls remain open.
APP-04 has local D1/API groundwork but is not deployed or ready.

## Current assessment

**Not production ready.** The native Android TV project and setup-required
shell exist; Android 16 TV emulator evidence covers install, launch, layout and
D-pad Exit/Back behavior. Playback, Google IMA, actual ad requests/events,
physical TV verification and production enrollment are not complete. The
public Cloudflare preview still reports `applicationApiReady:false`.

The local D1 enrollment API has focused passing tests. Latest checks pass:
TypeScript, production build, Vitest (37 files; 171 passed, 1 skipped),
Playwright (2/2), Android JVM tests, and APK assembly. Android 16 TV AVD
install/launch and initial focus are verified. No live enrollment request was
sent. No Cloudflare secret, remote migration, deployment, live ad request or
release was performed.

The TV token-rotation client/server path is implemented, but not robustly
recovered if the rotation response is lost after the server invalidates the old
token. In that case owner-assisted re-enrollment may be required; this must be
reviewed before production use.

The exact local toolchain and next-PC setup steps are recorded in
[`NEXT_PC_SETUP.md`](NEXT_PC_SETUP.md). The repository changes are pushed and
Warp, Claude Code, Cline, and the Android SDK/AVD were removed. The Temurin JDK
uninstaller failed with MSI error 1603, so the owner must remove it manually;
other retained tools and local user data are listed in that setup record.

## Scope and guardrails

The queue covers Android TV, native Google CTV advertising, a separate AdSense
website-eligibility assessment, and directly required build/CI/technical
verification. Tizen, webOS, Fire TV, AdMob, other ad networks and paid-advertiser
marketplace/billing work are excluded. Do not deploy, change billing, make live
ad requests, or claim owner/legal/hardware approvals without explicit
authorization and recorded evidence.
