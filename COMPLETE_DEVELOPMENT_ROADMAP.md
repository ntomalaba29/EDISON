# EDISON — Complete Development Roadmap

Every phase below must progress sequentially based on verified acceptance criteria. Stages must not be skipped to simulate progress.

| Phase | Title | Core Scope & Exit Gate | Current Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Project Definition & Technical Research** | Governance, requirements, business model, Smart TV feasibility research, architecture, risk/failure registers, testing strategy, 28 GitHub docs, Command Centre, Copy Report button. | **COMMITTED** |
| **Phase 2** | **AI Studio Functional Prototype** | Sequential prototype blocks: 2.1 Auth/RBAC/Store/QR -> 2.2 Advertiser & Campaigns -> 2.3 Ad Creation Studio (Options A & B) -> 2.4 16:9 TV Preview & Simulator -> 2.5 Opportunities & 3-Tier QA -> 2.6 Admin Moderation & 7-Stage Analytics -> 2.7 Physical Phone QR Testing & VS Code Handover Package. | **COMMITTED** |
| **Phase 3** | **VS Code Engineering & Architecture Hardening** | Production repository refactor, automated unit/integration/E2E test suite, persistent relational/cloud database migration, RBAC auth hardening, CI/CD, media pipeline workers. | **HANDOVER READY (`TASK-P3-001`)** |
| **Phase 4** | **Smart TV Platform Feasibility & Integrations** | Physical hardware test lab (Android TV, Samsung Tizen, LG webOS, external HDMI/STB); proof-of-concept adapters within documented OEM permissions; latency benchmarking. | NOT STARTED |
| **Phase 5** | **Commercial-Break Detection & Prediction** | Evaluation of SCTE-35, HbbTV/ATSC 3.0 metadata, lawful pattern analysis, per-channel break-length ML predictor, false-positive/missed-break calibration. | NOT STARTED |
| **Phase 6** | **Advertising Delivery Infrastructure** | Low-latency CDN, preloading manifests, high-throughput QR redirect service with abuse filtering, deduplicated event ingestion pipeline. | NOT STARTED |
| **Phase 7** | **Advertiser Management & Campaign Operations** | Production KYC, billing/invoicing integration, automated pacing, SLA support desk, advertiser audit logs. | NOT STARTED |
| **Phase 8** | **Advertisement Creation & Production Rendering** | Server-side 1080p/4K MP4/HLS rendering from Studio JSON compositions, automated broadcast loudness/codec validation, automated QR vision inspection. | NOT STARTED |
| **Phase 9** | **Opportunity Management & Verification** | Dedicated verification operations tooling, document vault encryption, automated expiry & employer re-verification, complaint/investigation/appeal workflows. | NOT STARTED |
| **Phase 10** | **Privacy, Security & Legal Compliance** | Jurisdiction-specific consent flows, DSR/deletion automation, penetration testing, legal sign-off on opportunity-vs-consent decoupling. | NOT STARTED |
| **Phase 11** | **Reliability & Failure Testing** | Chaos/fault injection across all 18+ failure modes (network drop, decoder crash, CEC/HDCP failure, return-to-TV watchdog verification). | NOT STARTED |
| **Phase 12** | **Controlled Hardware & Viewer Pilot** | Opt-in closed pilot using prompt-based or approved linear architecture; physical measurement of switching latency, restoration reliability, and QR scan rates. | NOT STARTED |
| **Phase 13** | **Commercial Readiness** | Production SLAs, real payment processing, broadcaster/OEM commercial agreements, operational runbooks. | NOT STARTED |
| **Phase 14** | **Country-by-Country Launch** | Activation gated strictly by Country Activation Register legal, tax, recruitment, and broadcast sign-offs. | NOT STARTED |
| **Phase 15** | **International Expansion** | Multi-region localization, cross-border compliance scaling, multi-currency billing. | NOT STARTED |
