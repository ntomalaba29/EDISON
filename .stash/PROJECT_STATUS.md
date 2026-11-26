# EDISON Project Status — 2026-11-26

## Current handoff

The active request is an evidence-based production path for the Android TV
application and Google CTV advertising integration. The authoritative ordered
task ledger, acceptance criteria, status, and continuation record are:

[`PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md`](PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md)

Read that ledger before continuing. It supersedes conflicting Android TV and
advertising claims in older stash notes. Do not rely on historical progress
percentages as evidence of implementation or production readiness.

## Current assessment

**Not production ready.** At the audited repository snapshot
`1e28771293defed325da07d7b6fa476a25074c55`, product source contains TV platform
simulations, but no EDISON native Android application or Google IMA integration
was found. No live ad playback or physical Android TV test is evidenced. The
repository's README also describes the product as pre-production.

The initial TypeScript check found a parse error and related shared-state defects
in `src/server/sharedIntelligencePreview.ts`. AUD-01 is repaired and verified:
`npm.cmd run lint` and all 11 focused shared-intelligence tests pass. The full
Vitest and E2E suites still have failures recorded in BASE-01; production and
CI readiness are not established.

## Safety and scope

Work only on Android TV, the eligible Google CTV ad path, and directly required
build/CI/technical verification. Tizen, webOS, Fire TV, AdMob, and paid
advertiser purchasing/billing are out of scope. Do not deploy, change billing,
make live ad requests, or claim owner/legal/hardware approvals without explicit
authorization and recorded evidence.
