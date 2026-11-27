# EDISON — Next PC Setup and Current-PC Cleanup Record

**Recorded:** 2026-11-27 (current)
**Purpose:** Recreate the verified development environment on a new Windows PC.
This is a setup record, not a production-readiness claim.

## First steps on the next PC

1. Install Git, Node.js/npm, Temurin JDK 17, and Visual Studio Code from their
   official sources. The versions below are the versions verified on this PC;
   use the repository-pinned Gradle wrapper and lockfile rather than installing
   Gradle or project dependencies globally.
2. Clone the canonical repository and enter it:

   ```powershell
   git clone https://github.com/ntomalaba29/EDISON.git
   Set-Location EDISON
   ```

   Use `main` tracking `origin/main` on the new clone. This PC's old `origin`
   URL was invalid; its working remote was named `new-origin`.
3. Read `.stash/READ_THIS_FIRST.md`, this file, and
   `.stash/PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md` before continuing.
4. Install Node dependencies from the lockfile and run the repository checks:

   ```powershell
   npm ci
   npm.cmd run lint
   npm.cmd run test
   npm.cmd run build
   ```

   Run browser tests with `npm.cmd run test:e2e` when the required test services
   are available. See the production ledger for known baseline limitations.
5. To build Android, install the Android command-line SDK packages listed below,
   accept the applicable Google SDK licenses, and use the repository wrapper:

   ```powershell
   Set-Location android-tv
   .\gradlew.bat :app:testDebugUnitTest :app:assembleDebug
   ```

   Set `JAVA_HOME` to the JDK 17 installation and `ANDROID_HOME` /
   `ANDROID_SDK_ROOT` to the Android SDK path in the shell that runs Gradle.
   These variables were not persisted in the user environment on this PC.
6. For emulator validation, create an Android 16 / API 36 Android TV x86_64
   AVD named `EDISON_TV_API36` at 1920x1080. Windows Hypervisor Platform
   acceleration and firmware virtualization were enabled for this PC; verify
   the new PC's virtualization support rather than assuming it is available.

## Versions and tools verified on this PC

| Component | Verified version/state | Notes |
|---|---|---|
| Windows | Windows; exact build not recorded | PowerShell and Git CLI used |
| VS Code | 1.148.0 | Retained on this PC; no VS Code extensions were listed |
| Node.js | 22.23.5 | Project runtime |
| npm | 10.9.9 | Project packages come from `package-lock.json` |
| Git | 2.56.0.4 | Available on this PC; install provenance not established |
| GitHub CLI | 2.105.0 | Available on this PC; install provenance not established |
| FFmpeg | 9.0.2 | `Gyan.FFmpeg` winget package; install directory dates to 2026-11-17, before the Android setup recorded here |
| Temurin JDK | 17.0.21.1+2 | Installed at `C:\Program Files\Eclipse Adoptium\jdk-17.0.21.10002-hotspot`; winget uninstall failed (MSI 1603), so it remains for manual removal |
| Android command-line tools | sdkmanager 22.0 | Installed under `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest`; CLI reports deprecation warning |
| Android platform | `platforms;android-36` revision 2 | Compile SDK 36 |
| Android build tools | `build-tools;36.0.0` | |
| Platform tools | 37.0.3 | |
| Android Emulator | 37.3.10 | |
| Android TV image | `system-images;android-36;android-tv;x86_64` revision 4 | Used by `EDISON_TV_API36` |
| Google TV image | `system-images;android-36;google-tv;x86_64` revision 4 | Also present locally |
| Emulator hypervisor driver | 2.2.0 | WHPX was usable after the owner enabled Windows Hypervisor Platform and firmware virtualization |
| Android Gradle Plugin | 9.5.3 | Declared by the Android project |
| Gradle | 9.9.2 | Wrapper distribution checksum is pinned in `android-tv/gradle/wrapper/gradle-wrapper.properties`; no global Gradle is required |
| Android application | `io.github.malaba29.edison.tv`, label `EDISON TV` | Debug scaffold and enrollment path; not a production ad player |
| Android AVD | `EDISON_TV_API36` | Android 16 TV, x86_64, 1920x1080; emulator launch and shell interaction were verified |

The Android SDK license setup was completed for the Google packages used by the
verified build. Android Studio was not installed: two download attempts stalled,
and the user selected the command-line SDK approach instead.

## Other local developer tools found before cleanup

- Warp was registered with winget as `Warp.Warp`, version
  `v0.2026.11.18.08.17.stable_04`.
- Global npm packages were `@anthropic-ai/claude-code@2.1.330` and
  `cline@3.0.76`. Their CLI launchers were in `%APPDATA%\npm`; helper launchers
  `claude.cmd`, `cline.cmd`, and `edison.cmd` were in `C:\Users\HP\bin`.
- Neither Claude Code nor Cline appeared as a separate winget application.
  No Cline/Claude VS Code extension was listed.
- These tools are not EDISON build prerequisites. Their presence is recorded
  because the owner specifically requested their removal. The install origin
  of Warp and the global npm packages was not independently established.
- Git and Node.js are recorded as available project prerequisites. Their
  installation provenance was not established, so this cleanup does not remove
  them.
- GitHub CLI and FFmpeg were also present. Their origin/use by other work is
  not established, so they were left for the owner to remove manually if no
  longer needed.

## Configuration and items not to assume

- Android environment variables were set only in individual build shells, not
  in persistent user variables.
- The repo contains the Gradle wrapper and the Node lockfile; it does not
  require a global Gradle install.
- Cloudflare Workers + D1 are the selected backend direction, but no remote
  migration, secret write, deployment, paid-resource change, or live enrollment
  was performed. Reconfigure credentials securely on the new PC only when the
  owner authorizes that task. Never copy secrets into this file or Git.
- Google native CTV/IMA eligibility, live ad requests, physical Android TV
  testing, release signing, and production readiness remain unverified. Website
  AdSense eligibility is a separate assessment.
- This record excludes personal files, browser data, credentials, project
  deletion, and other apps not named above. The owner will handle manual cleanup
  of remaining items.

## Current-PC cleanup record

The owner requested that repository work be pushed first, then Warp, Claude
Code, Cline, and EDISON-specific development setup be removed while retaining
VS Code. Cleanup was attempted after the code commit was pushed.

- **Removed:** Warp (`Warp.Warp`) with winget; Claude Code
  (`@anthropic-ai/claude-code@2.1.330`) and Cline (`cline@3.0.76`) global npm
  packages; the `claude.cmd`, `cline.cmd`, and `edison.cmd` launchers; and the
  obsolete `C:\Users\HP\bin` user-PATH entry. Verification showed Warp absent
  and the global npm package list empty.
- **Removed:** Android SDK API/build/emulator packages, command-line tools,
  Android TV/Google TV system images, the `EDISON_TV_API36` AVD, generated
  `.android` user data, and the Gradle 9.9.2 wrapper distribution cache.
  `%LOCALAPPDATA%\Android\Sdk` and `%USERPROFILE%\.android` no longer exist.
- **Not removed:** Temurin JDK 17.0.21.1+2 remains installed. Winget's MSI
  uninstaller failed twice with error 1603, including after stopping the
  project Gradle daemon. This requires manual Windows uninstall/elevation.
- **Retained:** VS Code 1.148.0. Git, Node.js/npm, GitHub CLI, and FFmpeg were
  retained because their installation provenance or use by other projects is
  unknown. Windows Hypervisor Platform/firmware virtualization settings were
  left unchanged. Shared Gradle caches, app settings/history, and the EDISON
  repository were not deleted; the owner said they will handle remaining
  manual cleanup.
- The computer is therefore **not yet at “VS Code only.”** Recheck installed
  apps and any remaining user data after manual cleanup.
