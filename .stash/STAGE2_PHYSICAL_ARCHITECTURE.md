# Stage 2 — Physical-System Architecture and Trust Boundaries

**Status:** DECIDED, CONDITIONAL ON STAGE 3 FEASIBILITY
**Reviewed:** 2026-11-26
**Scope:** Android TV / Google TV and traditional broadcast only

## Decision

Use three separate responsibility domains:

1. **AD TRACKER** runs in the trust domain that has lawful, direct access to
   broadcast break metadata. It must not depend on the EDISON Android app
   observing another app's tuner, screen, or protected media surface. The
   exact source and host are not selected until Stage 4.
2. **SWITCHER** runs on, or is explicitly authorized by, the device that owns
   the active broadcast input and channel. It is the only component allowed to
   snapshot that state, launch EDISON, and request and verify restoration.
   The exact device, service privilege, and platform control mechanism are
   unresolved until Stage 3. A companion device is not accepted unless it can
   prove exact state readback and restoration.
3. **EDISON** remains a separate native Android TV application. It owns ad
   session UI, media playback, and truthful playback lifecycle events. It does
   not monitor or control another app's tuner/input, draw over another app, or
   provide a general-purpose remote.

Automatic switching remains a hard product requirement. If Stage 3 finds no
permitted device/control path that can guarantee the required transition and
restoration, dependent live SWITCHER implementation is blocked. Do not replace
the workflow with a viewer prompt or manual channel selection.

## Trust and event flow

```text
Authorized broadcast metadata source
        |
        | normalized evidence; no protected-surface capture
        v
AD TRACKER (source-scoped, confidence-gated, duplicate-safe)
        |
        | local authenticated, expiring, correlated event
        v
SWITCHER (validates event; snapshots exact prior state)
        |
        | authorized automatic launch
        v
EDISON Android TV app (ad-session playback only)
        |
        | authenticated lifecycle result: complete/fail/abort/timeout
        v
SWITCHER (restores and verifies the prior broadcast state)
```

The trigger and lifecycle control path is local to the authorized source/device
trust boundary. Cloudflare, the Node.js media host, and general application APIs
are not in the real-time switch/restore control loop. Their existing enrollment
or media functions do not establish device input authority.

## State and failure ownership

- SWITCHER owns a versioned, device-local snapshot containing the exact source
  and channel identity exposed by the selected platform, capture time, and
  correlation/session ID. Optional viewing state is included only if the
  platform can read and restore it. Do not infer identity or invent state.
- AD TRACKER owns cue validation, confidence, event identity, and expiry.
  SWITCHER rejects expired, duplicate, malformed, or unauthorized events.
- EDISON reports actual player lifecycle outcomes only. App launch, ad request,
  or elapsed time alone is not proof of playback completion or impression.
- No valid cue or insufficient confidence means no switch. Invalid or stale
  trigger means no switch. Failed launch or playback ends the ad session and
  asks SWITCHER to restore. SWITCHER never guesses a channel or treats an
  unverified command as successful restoration.
- If restoration cannot be verified, SWITCHER records an explicit failure and
  enters its bounded recovery/watchdog path. It must not report success.
- The viewer does not initiate the transition. A manual prompt is not a
  fallback architecture.

## Repository evidence and non-evidence

- `android-tv/app/src/main/AndroidManifest.xml` currently declares Internet
  access and the Leanback launcher feature. It has no TV-input service or
  switching component.
- `android-tv/.../MainActivity.kt` implements the enrollment/setup shell; it
  has no ad player or broadcast-control path.
- `src/server/tvPlatformAdapter.ts` contains synthetic channels, simulated
  transitions, and deterministic watchdog outcomes. It is test/simulation
  code, not a platform control implementation or hardware evidence.
- `SMART_TV_COMPATIBILITY_RESEARCH.md` labels its findings preliminary and
  contains multiple platform/architecture candidates. Treat it as leads for
  Stage 3 source verification, not proof of current API permission or device
  capability.
- `RUNTIME_SEPARATION.md` describes the Node.js/Cloudflare media/API runtimes.
  Neither runtime owns the viewer's broadcast input.
- No target TV/STB model, firmware, authorized broadcast source, vendor
  integration, or physical switching/restoration test is recorded.

## Stage 3 inputs and blockers

Stage 3 must use a named, owner-authorized target device and establish from
current authoritative platform/vendor documentation and device evidence:

- Who owns the broadcast input and can read its exact source/channel state.
- Whether a third-party app can automatically launch and later return control
  on that device, and which explicit system/OEM/operator privileges are needed.
- Whether source/channel state can be restored and verified after app
  foregrounding, interruption, reboot, and failure.
- Whether any proposed CEC or companion-hardware path is permitted and provides
  the required readback; do not assume CEC alone meets exact restoration.
- Which local authenticated transport connects the authorized tracker,
  switcher, and app lifecycle, without putting cloud services in the control
  loop.
- The failure behavior and explicit unsupported-device result.

**Stage 2 completion evidence:** Responsibility domains, trust flow, state
ownership, fail-closed behavior, repository evidence, and Stage 3 proof
requirements are recorded here. This is an architecture decision, not a
feasibility result. Stage 3 remains a hard gate and no switching code is
authorized by this document.
