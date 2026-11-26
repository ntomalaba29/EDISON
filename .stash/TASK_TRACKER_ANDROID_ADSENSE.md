# Android TV + Google CTV Ads — Tracker Redirect

This legacy tracker contained unsupported `92/99` progress and completion
claims. Those claims are withdrawn.

Use the authoritative, ordered ledger at
[`PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md`](PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md).
It records scoped tasks, dependencies, acceptance evidence, owner-only blockers,
and continuation instructions. Do not add a competing percentage or mark work
complete based on documentation, simulation, or research samples.

**Current assessment:** Not production ready. The native Android TV scaffold
and emulator-tested shell are real and recorded as APP-01/02; enrollment,
media playback, IMA/GAM eligibility, real ad event reporting and physical-device
evidence remain incomplete. APP-03's local owner approval, QR/code flow,
Keystore storage and status polling are implemented but not verified against a
configured staging service. AdSense is a separate website assessment, not an
Android TV SDK. See the numbered queue for every remaining scoped task.
