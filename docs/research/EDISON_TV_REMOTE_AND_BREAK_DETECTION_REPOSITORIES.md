# EDISON TV Remote and Commercial-Break Detection Repository Research

**Status:** Research and proposed architecture; no external source code copied or integrated.  
**Reviewed:** 2026-11-18  
**Purpose:** Record the remote-control and TV commercial-break projects to study when designing EDISON's hybrid TV system. This is not a security audit, legal opinion, or hardware compatibility certification.

## 1. EDISON product flow (owner-provided)

1. A TV-side commercial-break tracking component detects a break on a specific channel.
2. It timestamps and reports the observation to EDISON.
3. EDISON shares a suitably validated, channel-scoped break observation so compatible EDISON installations can learn about that channel's break timing.
4. On the TV, an authorized EDISON playback/control path switches to EDISON's own ad experience when the break event qualifies.
5. The EDISON TV app has its own **EDISON Ad** and **Back** controls. When a qualifying break is communicated, its TV-side control flow starts EDISON ads; after playback finishes or Back is used, it returns to the programme/input that was playing.
6. The EDISON phone app is a normal TV remote plus EDISON's other features, including household profiles and advertising/opportunity preferences. The **EDISON Ad** and **Back** controls described above belong to the EDISON TV app, not the phone remote.
7. Paid commercial messages are broad: a payer may submit different kinds of lawful content, including product/service promotions, events, and personal greetings (for example birthdays, anniversaries, and Valentine's Day), and target a selected geographic area. Payment does not waive content review or legal/safety rules.
8. The owner has approved a journalist/publisher feature concept: journalists can register under a planned monthly subscription and submit breaking news for a relevant upcoming break. The price and editorial operating rules are undecided; this feature is not implemented.

This product flow is the design context for this research. It does not imply these capabilities are already implemented. The existing remote-control and shared-intelligence code is simulated; no physical TV transport or live break detector is verified.

## 2. Important distinction: local protocol/API vs cloud API

A phone remote needs some communication path to the TV: for example a TV's local WebSocket control service, a paired remote-control protocol, Bluetooth HID, or an OEM SDK. These are all interfaces/protocols in the broad technical sense, but they need not call a third-party cloud service.

Likewise, break detection can be local when an authorized detector can inspect broadcast cues or a permitted media feed. Sharing timestamps across TVs still requires a network path to EDISON's own service or an agreed peer-sync mechanism; that does not inherently require a third-party ad-tech API. If the detector cannot access the programme signal or metadata, it cannot reliably identify a break merely from a phone remote.

## 3. Remote-control repositories

| Repository | What it does / transport observed | License / evidence | Useful EDISON pattern and limits |
|---|---|---|---|
| [mazen-salah/Smart-TV-Remote-Control](https://github.com/mazen-salah/Smart-TV-Remote-Control) | Flutter phone app. Discovers TVs on the local network with SSDP/UPnP and Bonjour/mDNS, then connects directly over Wi-Fi: Samsung Tizen WebSocket v2 and LG webOS WebSocket/SSAP plus a pointer-input socket. Pairing is approved on the TV. No cloud account is described as necessary. | MIT. README, protocol notes, and Samsung/LG service source were reviewed. README reports Samsung hardware testing; LG real-TV verification is still requested. | Strong reference for local discovery, explicit pairing, per-brand transports, reconnect handling, and capability-specific UI. It uses TV-local APIs/protocols, not an API-free connection. Its checked-in Samsung client accepts self-signed certificates without validation; do not copy that TLS behavior. LG uses trust-on-first-use pinning in the reviewed client. |
| [tronikos/androidtvremote2](https://github.com/tronikos/androidtvremote2) | Python implementation of Android TV Remote Protocol v2: paired encrypted local connection to the Android TV Remote Service, not ADB and not Android's TV Input Framework. | Apache-2.0. Repository README and protocol description reviewed; not independently hardware-tested by this review. | Useful reference for local pairing, capabilities, and command messages. It is a protocol implementation, not a Google third-party remote SDK or permission to control every TV. Do not equate protocol support with EDISON ad playback/input switching. |
| [levhakobyan/OpenTV-Remote](https://github.com/levhakobyan/OpenTV-Remote) | Native Android/iOS phone remote with provider-specific local transports. Current README/research describes Android TV Remote v2, Samsung WebSocket, legacy LG SSAP, and Android Bluetooth HID support; providers have different capability and trust boundaries. | MIT. Current README and Android compatibility research were reviewed; the project explicitly distinguishes implementation evidence from physical verification. | Useful for per-TV capability negotiation, pairing/trust, Bluetooth fallback, and not promising unsupported keys. It does not provide EDISON's break detector or programme restoration policy. |
| [xchwarze/samsung-tv-ws-api](https://github.com/xchwarze/samsung-tv-ws-api) | Python client for Samsung TV control over local TCP/IP, using WebSocket and REST interfaces and TV pairing approval. | LGPL-3.0. Current README reviewed; source reuse requires a separate compatibility review. | Useful Samsung protocol/reference material only. Do not copy or link the library into EDISON before resolving LGPL obligations and reviewing its connection security. |

### Remote-control conclusion

The studied remotes do not avoid APIs/protocols; they avoid a cloud dependency by talking directly to the TV on the local network or over Bluetooth. The closest architectural fit is a small, brand-specific local transport behind EDISON's capability-aware adapter boundary. The **EDISON Ad** and **Back** buttons are actions in the EDISON TV app, not generic phone-remote keys. Ordinary commands from the phone remote remain a separate control path. Do not assume generic channel-key injection can safely launch EDISON or restore arbitrary broadcast state.

## 4. Commercial-break detection repositories

| Repository | What it detects / input path observed | License / evidence | Useful EDISON pattern and limits |
|---|---|---|---|
| [ggouzi/HLS-SCTE35-monitoring](https://github.com/ggouzi/HLS-SCTE35-monitoring) | Polls an accessible HLS master/media playlist over HTTP(S) and looks for `EXT-X-CUE-OUT/IN`, `EXT-X-DATERANGE`, `EXT-OATCLS-SCTE35`, or configured tags; can decode SCTE-35 data from supported markers. | MIT. README reviewed; it describes itself as a side project provided as-is. | Good small reference for cue parsing, cue start/end, and monitoring cadence when EDISON is authorized to read that HLS playlist. It is not a general TV tuner detector and does not control or restore a TV. A playlist URL may itself be private or provider-authorized; access is not implied. |
| [socrtwo/adhush](https://github.com/socrtwo/adhush) | Describes multi-signal detection (including black/silence/loudness, channel logo, fingerprints, SCTE-35, schedules, and crowd observations) and local TV-control outputs. Its README lists HDMI/tuner/screen/camera/microphone/line-in capture paths and separate Android-phone behavior. | MIT. Current README reviewed; feature, local-only, and deployment statements are project claims, not independently tested here. | Valuable architecture reference for independent detector signals and a detector/control separation. Do not adopt its capture or actuator paths wholesale: EDISON's current privacy/safety boundary excludes camera, microphone, and unauthorized screen/HDMI/tuner capture, and disallows automatic volume/input hijacking. The README includes optional cloud features, so it is not inherently cloud-free in every configuration. |
| [nicolasrondan/tv_commercial_break_detector](https://github.com/nicolasrondan/tv_commercial_break_detector) | Previously identified as a Python/offline break-detection project; its present source behavior was not verified in this review. | License and implementation remain unverified. | Research lead only. Do not copy or depend on it until the exact repository, source, license, tests, and input requirements are verified. |
| [abdullaabdullazade/audio-ad-detection](https://github.com/abdullaabdullazade/audio-ad-detection) | Previously identified as a Go audio fingerprinting/broadcast-ad detection project; current source and input pipeline were not verified in this review. | License and implementation remain unverified. | Research lead only. Audio fingerprinting requires an authorized audio signal; do not introduce microphone capture into EDISON without a separate owner-approved privacy decision. |
| [scottn12/Sports-Broadcast-Commercial-Detector](https://github.com/scottn12/Sports-Broadcast-Commercial-Detector) | No usable public repository was verified at the supplied owner/name during the prior audit. | Unverified. | Do not rely on it unless a working repository is identified and inspected. |

### Adjacent projects that are not TV break detectors

- [dailymotion/vast-client-js](https://github.com/dailymotion/vast-client-js) parses VAST ad responses and can send ad-event tracking requests. Those are events about an ad being delivered/played; this is not a system for detecting that the TV programme entered a commercial break.
- [videojs/videojs-contrib-ads](https://github.com/videojs/videojs-contrib-ads) manages an ad plugin's playback lifecycle. It is not a broadcast break detector or TV remote.
- [googleads/googleads-ima-html5](https://github.com/googleads/googleads-ima-html5) contains HTML5 IMA examples. IMA/ad-network integrations are separate from EDISON's break-detection signal and would involve their own SDK/service and account/format requirements.

## 5. Proposed EDISON hybrid (design to validate, not implementation status)

### A. Local detector / observation

1. Prefer a permitted, machine-readable broadcast cue (for example SCTE-35 in an authorized HLS playlist) when the selected source exposes one.
2. Where a permitted local input exists, evaluate independent local signals and recorded fixtures, inspired by AdHush's multi-signal architecture. Keep every input explicitly authorized; current policy forbids camera, microphone, protected-screen capture, and DRM/HDCP bypass.
3. Produce an observation rather than an unconditional switch: channel/service identity, break start/end or observed boundary, UTC timestamp, signal source, detector version, and confidence. Do not include household identity or viewer profile data.
4. Deduplicate and validate source/timing; distinguish observed cue time from predicted break time. A single uncertain signal must fail closed rather than interrupt viewing.

### B. EDISON shared break intelligence

1. Publish only validated, channel-scoped observations through EDISON's own shared-intelligence path.
2. Corroborate compatible observations by channel, broadcaster, platform/configuration, and time window; reject stale, replayed, contradictory, or out-of-scope signals.
3. Share break timing/intelligence only—never household location, profession, opportunity preferences, profile identifiers, or ad-viewing history.
4. Treat cross-TV synchronization as a network feature that needs its own authentication, durable storage, clock-skew handling, retention, and operational review. The current in-memory shared-intelligence simulator is not that production service.

### C. TV action and return

1. A TV-side EDISON app/component must have an explicitly supported, owner/OEM-authorized way to show EDISON's own ad experience. A phone remote-control protocol alone does not grant tuner access or permission to overlay another app/input.
2. When policy, signal confidence, and remaining break duration permit, the EDISON TV app invokes its own **EDISON Ad** action. Its **Back** control and ad-completion path return to the saved programme/input. Keep these TV-app actions separate from the phone app's ordinary remote commands.
3. Preserve the active programme/input/session before the switch. On ad completion, explicit Back, timeout, disconnection, or uncertainty, return through the supported TV path. Do not claim exact live-programme resume unless the selected TV/input actually supports it.
4. A viewer's physical or phone-remote input always wins. On a manual channel/input/back/home action, yield immediately and suppress the pending automatic EDISON switch.
5. If any capability, pairing, cue, or return guarantee is missing, stay on the original programme and record a safe skip.

## 6. Questions required before choosing a first implementation

- What is the actual programme source on target TVs: an EDISON-owned HLS player, a licensed IPTV/app feed, a broadcast tuner, HDMI/STB, or a mix?
- Where does the detector run, and what exact signal/metadata can it read under the selected TV and content-provider permissions?
- Which first TV brand/model and source can be tested at the final physical Stage P6 gate?
- Which channel identifier is stable across EDISON installations, and what timestamp tolerance/corroboration rule is acceptable?
- What supported TV-app playback/session mechanism can start EDISON ads and restore the original channel/input without taking control away from the viewer?

## 7. Additional paid-ad scope and approved journalist concept

### Broad paid commercial messages

The owner's intended paid-ad scope is broader than business advertising: any lawful and policy-compliant paid message may be submitted, including local promotions, events, and personal greetings such as birthday, anniversary, or Valentine's messages. Campaigns may target a geographic area such as a catchment area, locality, metropolitan area, or constituency. Target geographies are campaign criteria and must not expose a household's exact installation location to advertisers.

Administrative geographies (for example a constituency) and custom catchment boundaries are not always the same kind of shape. The product will need a defined boundary dataset or owner-entered geometry, a location-matching rule, and privacy-preserving storage before exact coverage claims can be made. Payment permits submission/placement eligibility; it does not bypass review, law, consent, or safety controls.

### Journalist / breaking-news feature — approved concept, implementation pending

The owner approved journalist registration and a monthly subscription model, with breaking news intended for the next relevant commercial break. Subscription pricing and editorial operating rules remain undecided. This is an editorial publishing feature, not just another commercial creative.

Safeguards and policy decisions required before broad distribution:

- Verify journalist/publisher identity and affiliation, with a way to suspend compromised accounts.
- Require the report's time, affected area, source/evidence, and expiry; provide correction and retraction paths.
- Distinguish editorial news from paid promotion on-screen. A subscription may pay for publishing tools/access, but should not buy truth, bypass moderation, or guarantee an editorial slot. Any paid placement must be clearly labelled sponsored.
- For "breaking" placement, use a quick, auditable verification queue and only use unattended fast-lane rules for trusted publishers and bounded low-risk categories. Hold uncertain or high-impact claims for human review.
- Let households opt in to news alerts and choose area/topic preferences; never infer that ad-break content may interrupt their viewing.
- Define how a news item competes with the alternating ad schedule, the slot duration, geographic relevance, repeat suppression, and the behavior when there is no verified break or too little time.

No subscription price, finalized editorial policy, verification tier, distribution guarantee, or priority rule is decided yet. See [`EDISON_PRODUCT_VISION_AND_BUILD_PLAN.md`](../EDISON_PRODUCT_VISION_AND_BUILD_PLAN.md) and [`EDISON_REPOSITORY_SHORTLIST.md`](EDISON_REPOSITORY_SHORTLIST.md).

## 8. Source and reuse rules

This research is for learning architecture and designing an original hybrid. It does not approve wholesale repository cloning or source reuse. Before borrowing code, pin a revision and inspect its license, notices, dependencies, security behavior, privacy/data flow, platform/firmware requirements, and tests. In particular, resolve the LGPL-3.0 terms before using `samsung-tv-ws-api`; do not treat MIT licensing as proof of security or hardware compatibility.

Research source snapshots:

- Remote projects: linked repository READMEs and, where noted above, protocol/source files as reviewed on 2026-11-18.
- HLS cues: [`ggouzi/HLS-SCTE35-monitoring` README](https://github.com/ggouzi/HLS-SCTE35-monitoring).
- Local multi-signal detector: [`socrtwo/adhush` README](https://github.com/socrtwo/adhush).
- Android TV TIF limits and Tizen app key input are separately recorded, with official sources, in [`EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md`](../../EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md).
