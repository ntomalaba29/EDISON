# EDISON TV for Android TV

This is the native Android TV application project. Research projects remain
under `research/study/` and are not included in this app.

## Build

Install JDK 17 or newer and Android SDK packages `platforms;android-36`,
`build-tools;36.0.0`, and `platform-tools`. Accept the Google Android SDK
license when prompted. Set `JAVA_HOME` and `ANDROID_SDK_ROOT` for your local
toolchain, then run from the repository root:

```powershell
.\android-tv\gradlew.bat -p android-tv :app:assembleDebug
```

The wrapper pins Gradle 9.9.2 and verifies its published SHA-256 checksum. The
project uses Android Gradle Plugin 9.5.3. The debug APK is written to
`android-tv/app/build/outputs/apk/debug/app-debug.apk`.

The app ID is `io.github.malaba29.edison.tv` and the launcher name is
`EDISON TV`. Verify app ID availability before publishing; changing the ID
after release would create a different Android application.

## Current implementation boundary

The app has a D-pad setup flow that requests a time-limited enrollment from the
EDISON API, displays its QR approval link and eight-digit fallback code,
persists the pending device credential encrypted with Android Keystore, and
polls until approval, expiry, lockout, or revocation. A household viewer can
approve the TV in the EDISON web app or select **Connect a TV** and enter the
short code. The debug build defaults to the public Worker origin; override it
with `-PedisonApiBaseUrl=https://your-https-origin` when building a different
environment. Only an HTTPS origin without a path is accepted.

The public Worker is not yet configured for enrollment, and the complete flow
has not been tested end to end. The D1 migration and pairing secret require
owner-authorized staging setup; edge-wide abuse control, local credential
rotation/recovery, device configuration APIs, Google IMA, ad playback, event ingestion, and
physical-device verification remain open. Enrollment does not enable playback.
The app also contains a unit-tested in-process ad-session state machine for
authorization/loading/play/pause/completion/failure/abort states. It does not
start playback or claim IMA integration.
It also has state-gated lifecycle event envelopes for ready, started, paused,
resumed, completed, failed, aborted and timeout outcomes. No transport or real
player is connected yet.
The app also has a software watchdog decision model: deadlines or interruptions
request restoration only when restoration is explicitly verified; otherwise they
produce a fail-closed restoration-failed result. This is not an OS/hardware
watchdog and does not prove TV restoration.
See `.stash/PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md` for evidence and tasks.
