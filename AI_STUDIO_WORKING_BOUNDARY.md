# EDISON — AI Studio Working Boundary

This document defines the strict scope boundary between what is built and verified inside **AI Studio** (Phases 1–2) versus what is deferred to **VS Code Copilot & Production Engineering** (Phases 3–15).

---

## 1. Inside AI Studio Implementation Boundary (Phase 1 & Phase 2)

1. **Phase 1**: Complete documentation suite (25 files), Smart TV feasibility research (explicitly labelled preliminary where untested on hardware), risk & failure registers, governance & Copy Report UI, and Command Centre definition.
2. **Phase 2 Functional Prototype**:
   - Advertiser registration, login, profile, and dashboard (prototype auth/persistence—clearly scoped).
   - Campaign CRUD and full status state machine (`draft` -> `submitted` -> `under_review` -> `approved`/`rejected` -> `scheduled` -> `active` -> `paused` -> `completed` -> `expired`).
   - Option A Advertisement Creation Studio (templates, logo/product/background image uploads, editable text/pricing/CTA/colors, positioning/resizing/layer arrangement).
   - Option B Upload workflow (file type/size/dimension/aspect-ratio/duration validation + QR presence inspection & fallback generation without silent overwrite).
   - Real 16:9 Television Preview (plays uploaded video or timed image/canvas composition with real scannable QR code, play/pause/restart/fullscreen, QR destination test).
   - Clearly labelled Commercial-Break Simulator (simulated TV channel -> break -> EDISON ad -> QR + simulated phone scan -> manual/auto return to simulated TV).
   - Opportunity classification, submission, supporting evidence upload, 3-tier verification status model, expiry, complaints/appeals.
   - Administrator Review Console (full 16:9 playable preview + live QR inspection before approval/rejection, advertiser/opportunity moderation).
   - Real QR generation & secure redirect validation (testable via physical mobile phone camera against the live dev server URL).
   - 7-stage Analytics model distinguishing `[SIMULATED]` events from `[REAL MEASURED]` prototype events with duplicate-event protection.
   - Input validation, URL sanitisation, and prototype security controls.
   - Complete VS Code engineering handover package.

---

## 2. Strictly Outside AI Studio Boundary (Must Never Be Faked)

- **Real Smart TV channel monitoring or tuner control**.
- **Real commercial-break detection on live broadcasts**.
- **Automatic source switching from arbitrary live TV channels**.
- **Production return-to-live-broadcast hardware integration**.
- **Manufacturer-specific production SDK binaries (Tizen `.tpk`/`.wgt`, webOS `.ipk`, Android TV `TvInputService` APK)**.
- **Production broadcast / SSAI / CDN transcoding infrastructure**.
- **Real international payment processing or live invoicing**.
- **Real outreach to external advertisers, employers, or opportunity providers**.
- **Legal approvals or regulatory sign-offs**.

Where TV integration points appear in the Phase 2 prototype, they **must** use clearly labelled mock/simulation adapters (`SimulationTvAdapter`) and display explicit simulation notices.
