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

The project has the native app entry point, Android TV launcher metadata, and
an initial setup-required screen with a focus-visible Exit action. It does not
yet have the complete focus-first app shell, loading/error/empty state flow,
backend connection, Google IMA, ad playback, or emulator/device validation.
Those are tracked in
`.stash/PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md`.
