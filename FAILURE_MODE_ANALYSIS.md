# EDISON — Failure Mode & Effects Analysis (FMEA)

**Core Resilience Rule**: Ordinary television viewing must remain 100% usable whenever any EDISON component fails. When uncertain, skip the advertisement.

| ID | Failure Mode | Trigger / Cause | Immediate Impact if Unhandled | Fail-Safe Mitigation & Recovery | Verification Stage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FM-01` | **Internet Loss** | Home Wi-Fi drop or ISP outage | Ad fails to load mid-break; black screen | Only trigger break if creative + QR are **already preloaded** locally; queue analytics offline or discard safely; never switch without local asset. | Phase 6 / 11 |
| `FM-02` | **Application Crash** | Unhandled exception or OOM on TV | TV freezes on crashed EDISON UI | OS watchdog / external hardware bypass returns focus to live TV tuner/HDMI input; crash log queued locally. | Phase 4 / 11 |
| `FM-03` | **Power Loss** | Household power outage / TV reboot | Stale break state or corrupt local storage | Atomic state writes; on boot, TV starts on ordinary live TV/default input, never mid-ad. | Phase 11 |
| `FM-04` | **False Break Detection** | Programme fade-to-black mistaken for ad break | Interrupts live show/sports | Require multi-signal confirmation; provide instant **Manual Return** button; log false positive to suppress channel model. | Phase 5 / 11 |
| `FM-05` | **Missed Break** | Break signal absent or low confidence | Lost ad impression | **Acceptable fail-safe.** Skipping a break protects viewer trust; log telemetry for model tuning. | Phase 5 |
| `FM-06` | **Failed Ad Loading** | Corrupt file or CDN 503 | Blank ad slot | Pre-verify checksum before break entry; abort switch immediately if asset unverified. | Phase 2 / 6 |
| `FM-07` | **Decoder Failure** | Unsupported codec/profile on TV hardware | Frozen frame / audio stutter | Strict ingest transcoding to baseline H.264/AAC profile; immediate abort-to-TV on `MediaError`. | Phase 8 / 11 |
| `FM-08` | **Failed Source Switching** | CEC/TIF/tvwindow call times out | Partial switch or black screen | Pre-switch readiness check; abort switch if ACK exceeds threshold (`e.g. 500ms`). | Phase 4 / 11 |
| `FM-09` | **Failed Return to TV** | Return callback fails at break end | **CRITICAL**: Viewer stuck off live TV | Dual independent hardware/OS watchdog timers forcing return at `T_ad + buffer`; manual Remote Back/Exit key always mapped to immediate return. | Phase 4 / 11 |
| `FM-10` | **Invalid QR Destination** | Expired domain or malformed URL | Viewer scans dead/unsafe link | Pre-submit & periodic background URL health checks; auto-pause campaign if destination returns 4xx/5xx/malicious flag. | Phase 2 / 6 |
| `FM-11` | **Expired Campaigns** | Clock drift or delayed sync | Outdated promo or closed job shown | Embed `expires_at` inside signed ad manifest; client refuses playback if `now > expires_at`. | Phase 2 / 6 |
| `FM-12` | **Fake Advertisers** | Fraudulent KYC or stolen brand identity | Brand impersonation / scam | Admin advertiser verification queue + audit trail + instant kill-switch. | Phase 2 / 7 |
| `FM-13` | **Fake Vacancies** | Scam job/grant listing | Viewer harm / PII theft | 3-tier verification + evidence checks + complaint/investigation/suspension pipeline. | Phase 2 / 9 |
| `FM-14` | **Payment Disputes** | Chargeback or billing disagreement (Ph 13+) | Financial/service dispute | Immutable delivery/playback audit logs; pause unpaid future flights without altering verification truth. | Phase 7 / 13 |
| `FM-15` | **Consent Withdrawal** | Viewer revokes consent mid-session | Unconsented processing | Instant local flag flip; abort queued personalised ads immediately; ordinary TV remains unaffected. | Phase 10 / 11 |
| `FM-16` | **Data Loss** | Storage failure or accidental deletion | Lost campaign or audit records | Automated backups, write-ahead logging, immutable audit storage (Ph 3+). | Phase 3 / 11 |
| `FM-17` | **Duplicate Analytics Events** | Network retry or rapid QR refresh | Inflated campaign metrics | Idempotency keys + sliding-window deduplication + bot/headless User-Agent filtering. | Phase 2 / 6 |
| `FM-18` | **Service Outages** | Backend API or DB unreachable | Control plane unavailable | Edge-cached ad manifests continue safe preloaded operation or gracefully idle; ordinary TV unaffected. | Phase 6 / 11 |
