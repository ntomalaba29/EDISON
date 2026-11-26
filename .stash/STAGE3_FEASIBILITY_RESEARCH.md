# Stage 3 — Automatic-Switching Feasibility Research

**Status:** BLOCKED — no target TV/STB selected or available
**Research date:** 2026-11-26
**Scope:** Official Android documentation and manufacturer-published device
specifications only; no device purchase or hardware test

The owner authorized candidate research using official sources and confirmed no
target device is currently known. No device was purchased or selected.

## Result

No reviewed ordinary retail Android TV/Google TV device is established as able
to detect another input's commercial break, launch EDISON from the background,
read the exact prior broadcast channel/input, and restore it automatically.
Current AOSP documentation describes the TV App as a system app and limits
system TV HAL access to system TV inputs; it does not establish a general
third-party app contract for this complete cross-input workflow.

The only plausible complete product path identified so far is an
OEM/operator-authorized system integration on the device that owns the
broadcast input, with explicit support for state readback, automatic launch,
and exact restoration. This is a candidate architecture, not proof that any
vendor offers or will authorize it. A named target and access to it are still
required.

## Evidence matrix

| Evidence | What the source establishes | What it does not establish for EDISON |
|---|---|---|
| [AOSP Android TV architecture](https://source.android.com/docs/devices/tv) | The system TV App is a system app; only system TV Inputs access the TV Input HAL; built-in tuner and HDMI inputs are manufacturer-provided; third-party TV Inputs have package-scoped provider data and cannot access non-passthrough built-in tuner content. Only privileged system-partition apps can read the entire TV Provider database. Manufacturers may customize the TV App and TV Input implementations. | Does not provide a public third-party app API to take over the system TV App's selected input, inspect another input's channel, or guarantee exact cross-app restoration. It establishes a clear OEM/system integration boundary. |
| [Android TV Input Framework developer guide](https://developer.android.com/training/tv/tif) | Directs third-party content apps to Android TV home-screen APIs and warns that the guide's TIF support range is Android 5.0–7.1. It is not current-device capability evidence. | No third-party authority to seize another input, observe another tuner, or restore the active input/channel on current retail firmware. |
| [`TvInputManager` reference](https://developer.android.com/reference/android/media/tv/TvInputManager) | Public API documentation describes listing TV inputs, checking an input's connected state, and using `TvView` to interact with an input. | Listing inputs/connection state is not proof of reading the system's active source/channel or switching away and restoring it. No such end-to-end guarantee is documented in the reviewed reference. |
| [Android background activity launch restrictions](https://developer.android.com/guide/components/activities/background-starts) | Background activity launches have been restricted since Android 10; the guide enumerates conditions and exceptions, including a system grant or a sender with an allowed foreground/visible context. | A background AD TRACKER implemented as an ordinary app cannot assume it may foreground EDISON automatically whenever a cue arrives. The selected device's authorized launcher/service path must be verified. |
| [NVIDIA SHIELD TV Pro specifications](https://www.nvidia.com/en-us/shield/shield-tv-pro/) | NVIDIA describes an Android TV 11 streaming device with HDMI 2.0b, HDCP 2.2, HDMI-CEC, and a remote IR blaster for TV/receiver power and volume. | The published specifications do not describe a satellite/broadcast tuner input or an API for reading and restoring another TV input/channel. CEC support and remote power/volume control alone do not prove the required behavior. |

The repository manifest likewise declares Internet access and the Leanback
launcher feature, but no TV-input service or switching component. The existing
`tvPlatformAdapter.ts` is synthetic test code. Neither is hardware evidence.

## Candidate assessment

| Candidate | Assessment | Decision |
|---|---|---|
| Ordinary Google TV television with built-in broadcast tuner | EDISON may run as a separate foreground app, but no target-specific system integration or public input-state read/restore API is established. | Not accepted as an automatic-switching target without vendor documentation and a physical test. |
| Android TV streamer such as NVIDIA SHIELD TV Pro | Could be considered for EDISON UI/player testing. Its published HDMI-CEC and IR features do not give EDISON the TV's tuner/channel state or prove restoration. | Playback-only candidate; rejected as evidence or a solution for the complete workflow. Do not purchase it for switching validation. |
| OEM/operator-integrated Android TV or broadcast STB | A manufacturer can customize the system TV App and TV Input components; system TV Inputs have the documented HAL access boundary. That is the appropriate privilege domain to evaluate for a switcher. | Most plausible full-workflow candidate, but it requires a named vendor/model, explicit integration access, and verified APIs. Public partner directories do not establish that any partner will provide EDISON access. Nothing is selected or confirmed. |
| External HDMI companion/pass-through controller | Could be explored only if the device remains HDCP-compliant and exposes reliable input-state readback and restoration. | No suitable candidate or evidence identified. Do not capture, decrypt, or bypass protected content. |

The [Android TV partner directory](https://www.android.com/tv/) lists TV and
service-provider brands, but does not document device-specific switching APIs
or grant EDISON system privileges. Airtel product-page retrieval did not return
product specifications in this pass. The Google TV Streamer product page
redirected to a region-selection page; no capability is inferred from either
retrieval. No other consumer box was presented as a solution.

## Feasibility gate and next evidence

Stage 3 remains **BLOCKED**. To resume, the owner must identify and provide
authorized access to a specific TV/STB and its broadcast source. For that
target, record:

1. Manufacturer, exact model, firmware/Android version, and whether it is a TV
   with an internal tuner or a separate receiver/STB.
2. The actual broadcast input/source and who controls it (TV OEM, operator, or
   receiver vendor).
3. Current vendor documentation and any required OEM/operator/system
   permissions or service access.
4. Whether an authorized process can obtain the exact active source/channel,
   automatically launch EDISON, and restore/read back the same state after
   success, timeout, app crash, and interruption.
5. A physical-device test plan and evidence. Emulator tests, CEC availability,
   app launch success in the foreground, or a TV remote's power/volume controls
   do not pass the gate.

Until that evidence exists, do not implement a live switcher, claim an ordinary
Android app can do the complete job, substitute a manual prompt, or report
production feasibility.
