# EDISON — Testing Strategy

**Document Status**: Phase 1 Strategy Baseline

---

## 1. Verification Tiers

### Tier 1: Static & Build Verification (Every Block)
- TypeScript type-check (`npm run lint` / `tsc --noEmit`) — zero errors.
- Production bundle build (`npm run build`) — exit code `0`.

### Tier 2: Functional Unit & API Integration Tests (Phase 2 -> Phase 3)
- **QR Validation**: Verify rejection of `javascript:`, `data:`, malformed URLs, IP literals; verify valid `https:`, `tel:`, `wa.me` normalisation and `302` redirect execution.
- **Campaign State Machine**: Verify invalid transitions (e.g., `draft` -> `active` bypassing `approved`) are rejected server-side.
- **Opportunity Verification Rules**: Verify Tier 2 (`organisation_verified`) never auto-sets Tier 3 (`specific_opportunity_verified`), and expired opportunities are excluded from active playback pools.
- **Analytics Deduplication**: Verify rapid replay of identical event payloads does not inflate counts and `[SIMULATED]` events are strictly tagged.

### Tier 3: Physical & Browser UI Verification (Phase 2)
- **Copy Report Button**: Click in live preview, verify full report text copied to clipboard and `"Copied"` state displayed.
- **16:9 TV Preview**: Verify real video playback, timed image playback, play/pause/restart/fullscreen, and return-to-editor.
- **Physical Mobile Phone QR Scan Test**: Scan the live QR code rendered on screen using a physical smartphone camera; verify it reaches `/r/:token` and lands on the intended destination. (Must be logged as an actual verified test before claiming completion.)

### Tier 4: Hardware, Break-Detection & Chaos Testing (Phase 4 / 5 / 11)
- Physical Samsung Tizen, LG webOS, Android TV, and HDMI-CEC/HDCP latency benchmarking.
- Fault-injection testing across all 18 failure modes in `FAILURE_MODE_ANALYSIS.md`.
