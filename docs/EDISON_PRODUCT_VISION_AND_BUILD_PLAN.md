# EDISON Product Vision and No-Cost Build Plan

**Owner-confirmed product context:** 2026-11-18  
**Status:** Product vision and build sequence. Hardware integrations, hosting, subscriptions, and journalist pricing are not yet production-ready.

## 1. What EDISON is

EDISON is a Smart TV advertising and opportunity network. It detects commercial breaks on a specific TV channel, shares validated break timing with other EDISON installations, and uses an authorized EDISON TV app to play EDISON content and return to the programme. It also provides TV remote controls, audience profiles, advertising, opportunity listings, and an approved journalist/news publishing feature concept.

The guiding rule is that ordinary TV remains available. If break detection, timing, permissions, playback, or programme return is uncertain, EDISON must not take over.

## 2. Product components and control boundaries

### A. TV-side commercial-break tracker

- Runs in an authorized TV/source environment or another explicitly permitted local detector.
- Identifies a break on a particular channel and records its observation time, break start/end or estimated remaining duration, signal source, and confidence.
- Uses broadcast cues such as SCTE-35/HLS metadata where the selected source exposes them. Other local signals require their own authorized signal access and privacy decision.
- Does not use camera, microphone, protected-screen capture, DRM/HDCP bypass, or unauthorized tuner/HDMI capture.

### B. EDISON break-intelligence service

- Receives technical break observations and associates them with a stable channel/broadcaster/platform scope.
- Validates timestamps, channel scope, freshness, duplicates, conflicts, and source trust before sharing useful observations.
- Syncs compatible information to other EDISON TVs so they can anticipate breaks on that same channel.
- Shares only technical break intelligence, never viewer profiles, household identity, precise location, profession, opportunity preferences, or individual viewing history.
- A local prototype can run on this computer. Cross-home synchronization later needs a network-reachable EDISON service or an approved peer-sync arrangement; a third-party ad-tech API is not inherently required.

### C. EDISON TV app

- The TV app contains its own **EDISON Ad** and **Back** controls.
- On a qualifying break event, the TV-side EDISON flow invokes its Ad action and plays approved EDISON content.
- When playback finishes or Back is used, it returns through a supported TV path to the programme/input that was playing.
- Preserves viewer control: physical or ordinary remote input wins and can cancel/exit EDISON.
- Exact restoration of a live programme is not claimed unless the selected source/platform supports it.

### D. EDISON phone app

- Acts as an ordinary TV remote using the TV's supported local Wi-Fi or Bluetooth transport.
- Provides EDISON's other phone features, including account/household setup, profiles, opportunity preferences, and any approved viewer controls.
- The phone remote is not where the TV app's **EDISON Ad** and **Back** controls live.
- Local transport avoids a third-party cloud dependency, but still requires a protocol the TV supports and authorizes.

### E. EDISON network and operations

- Manages households, profiles, advertiser submissions, campaigns, opportunities, verification, moderation, QR links, analytics, shared break observations, and country/language settings.
- Keeps charity/public-benefit opportunity verification independent from advertising spend.
- Uses EDISON-owned first-party event collection where required; third-party ad trackers and ad-network integrations are separate, optional decisions and are not currently connected.

## 3. Advertising and geographic targeting

- **Paid commercial messages:** Broad content is allowed for submission, including products/services, local promotions, events, and personal greetings such as birthdays, anniversaries, and Valentine's messages. Content must still comply with applicable law, rights, EDISON content rules, and moderation; payment is not automatic approval.
- **Formats:** Image/banner, video, and text-only messages are in the current product scope.
- **Targeting:** A paid campaign may target a selected catchment area, locality, metropolitan area, constituency, or other supported geography.
- **Privacy:** Advertisers select a target area but do not receive a household's exact installation location. Internal matching uses the least precise location level needed.
- **Charity ads and free opportunities:** Remain free to submit and separate from paid commercial inventory.
- **Scheduling:** Current software design has a four-slot `CHARITY -> COMMERCIAL -> CHARITY -> COMMERCIAL` sequence, with conservative duration/safety checks. How a journalist news item fits this sequence is an open inventory decision.

## 4. Journalist and breaking-news publishing

**Owner-approved feature concept; pricing and operating rules remain to be decided.**

- Journalists/publishers can register and submit breaking news.
- A submitted report can be targeted to a relevant geography and, when eligible, placed on the next relevant commercial break.
- Journalist/publisher access is planned as a monthly subscription; subscription price is undecided.
- This is a distinct editorial/news publishing workflow, not merely another commercial advertisement. News must be clearly identified as editorial or sponsored.
- Before enabling broad or automatic distribution, define identity/publisher verification, source/evidence capture, rapid moderation, publication expiry, corrections/retractions, complaints, household news preferences, and geographic relevance.
- Recommended safety boundary: a subscription buys publishing access/tools, not truth, a guaranteed slot, or a way around verification. Any paid promotion must be labelled. High-impact or uncertain claims require review.
- Define how urgent news competes with paid/charity ads, what "next break" means if no eligible break arrives soon, and how outdated items are withdrawn.

## 5. Opportunity and audience profiles

- Households may have multiple individual profiles.
- A profile can hold the viewer's location, profession, desired work/opportunity types, formal/informal preferences, and whether a vacancy's location is acceptable.
- EDISON can match jobs, education, training, grants, tenders, and related opportunities using required/preferred/optional criteria.
- Viewers control personalization and notifications; consent withdrawal must stop the associated personalization/QR behavior as specified.
- Opportunity verification, expiry, complaints, and appeals remain independent from ad payments. A paid advertiser cannot buy a positive verification outcome.

## 6. Current implementation truth

- Existing software includes advertiser and opportunity workflows, creative authoring/validation, QR redirects, household/profile prototypes, consent logic, simulated ad scheduling, simulated TV adapters, break-cue fixtures, a break-duration predictor, and simulated shared intelligence.
- The current shared-intelligence code demonstrates scoped observations, signatures, quorum, conflict handling, offline cache, and rollback in software. It does not yet operate as a durable network service among real TVs.
- A live TV-side commercial-break tracker, production phone-to-TV remote transports, TV app switching/restoration on real devices, production ad delivery, and the journalist publishing/subscription workflow are not yet implemented.
- The journalist capability is now part of the product scope, but price, verification policy, moderation workflow, breaking-news priority, and service operations still need requirements before implementation.
- GitHub Actions is blocked by the account billing/spending-limit notice; local development and tests can continue. Linux CI and physical TV compatibility remain unverified.

## 7. Build sequence with only this computer

### Step 1 — Finish the TV-app Ad/Back simulation (Phase 4.5)

Use the existing TypeScript application and local tests. Complete the simulated TV app's Ad/Back lifecycle and verify that its controls remain separate from the phone's conventional remote. This is not a real TV integration.

### Step 2 — Make the event contract explicit (Phase 5.4 — verified simulation)

The authenticated fleet simulation signs UTC break-start events with Ed25519 device keys, binds source/scope/channel/event IDs, shares fresh events with compatible simulated TVs, and rejects stale/future, duplicate/replayed, mismatched-channel, conflicting, and PII-bearing events. Focused service and API tests verify this contract. The event path is process-memory simulation only; durable fleet sync and real TV detection remain unimplemented.

### Step 3 — Test a real detector against authorized fixtures

Start with recorded HLS/SCTE-35 sample playlists and deterministic fixtures. Implement cue start/end parsing and clock behavior. Do not assume a generic Smart TV app can read the TV's live tuner or another app's stream.

The local parser now reads HLS `PROGRAM-DATE-TIME`/`EXTINF` timelines, `CUE-OUT`/`CUE-IN`/`CUE-OUT-CONT`, and SCTE-35 `DATERANGE` boundaries. Its fixture tests verify clock recovery and fail-closed handling of missing or malformed cues. It treats SCTE-35 payload bytes as opaque; it does not decode splice commands, fetch live streams, or establish access to a TV's tuner. Captured authorized-source validation remains outstanding.

### Step 4 — Prototype local synchronization

Run the EDISON service on this computer and connect simulated clients or devices on the same trusted local network. Verify channel scoping, timestamp alignment, deduplication, offline behavior, and stale-event expiry. This is not yet cross-home production synchronization.

### Step 5 — Build the TV-app and phone-app boundaries

Keep the TV app's Ad/Back playback flow separate from the phone's conventional remote. Use browser-based simulated screens now; select and test real platform transports only when a specific TV/source and supported permissioned API are available.

### Step 6 — Complete paid-message geographic targeting (Phase 6.5)

Extend existing paid-message campaigns with verified supported geographic boundaries (catchment, locality, metropolitan area, constituency) without exposing exact household locations. Continue the existing free-opportunity, matching, verification, consent, and QR flows.

### Step 7 — Build journalist publishing and review (Phases 7.4 and 9.4)

Add journalist/publisher onboarding and monthly subscription state (price TBD, no payment collection), a breaking-news queue, geographic relevance, editorial checks, publication/expiry, corrections/retractions, and an auditable next-eligible-break decision. Do not let payment bypass editorial checks.

### Step 8 — Integrate news into break inventory (Phase 6.6)

After owner decisions on editorial review, viewer opt-in, placement priority, expiry, and subscription entitlements, connect eligible news to the next relevant commercial break. Do not infer a guaranteed slot.

### Step 9 — Defer production dependencies until necessary

No paid cloud or developer accounts are needed for Steps 1–3. This computer can run the demo and tests. Cross-home sync requires an internet-reachable server; real TV detection and playback require a compatible TV/source and the proper permissions. Do not create accounts or incur costs until we agree on the service and platform.

## 8. Repository research and reuse gate

The link-only candidate list is maintained in [`research/EDISON_REPOSITORY_SHORTLIST.md`](research/EDISON_REPOSITORY_SHORTLIST.md). It categorizes repositories for study/emulation versus additional review. **None has been cloned or integrated.** Before cloning or borrowing code, pin the revision and inspect license/notices, dependencies, security, privacy/data flow, platform compatibility, and tests. The LGPL-3.0 Samsung project requires specific license review; a permissive license does not establish safety or TV compatibility.

## 9. Decisions still open

- Which TV brand/model and broadcast source are the first target?
- Where does the break tracker run, and what authorized metadata or signal can it read?
- What stable channel identity and timestamp/corroboration tolerance should the shared service use?
- What TV-app mechanism is authorized to show EDISON ads and restore the channel/input?
- How should journalist content compete with the current charity/commercial ad sequence?
- What journalist verification, moderation, correction, expiry, subscription, and pricing rules should apply? See `DEC-OPEN-05` and `DEC-OPEN-06`.
- What viewer opt-in and break-inventory priority should apply to news? See `DEC-OPEN-07`.
- Which boundary source should power production geographic targeting? See `DEC-OPEN-08`.
- Which administrative boundaries or catchment definitions will geographic targeting support first?

