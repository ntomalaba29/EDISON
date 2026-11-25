# About EDISON

EDISON is being developed as an interactive Smart TV advertising and community-opportunity service. Its React/TypeScript application includes campaign and opportunity workflows, QR-code routing, household consent controls, and software-tested TV-break and remote-control behavior. It is not yet production-ready.

The project is designed around fail-safe behavior and privacy boundaries: payment does not determine opportunity verification, consent withdrawal must revoke applicable QR links, and uncertain TV-break behavior should not interrupt ordinary viewing.

## Current implementation

- A React 19 and TypeScript frontend built with Vite.
- An Express application used for local development and application workflows.
- A Cloudflare Worker shell serving static assets and using D1-backed authentication and domain repositories.
- PostgreSQL migrations, local PGlite testing, and a local FFmpeg/ffprobe media worker.
- Automated Vitest and Playwright coverage, plus software simulations for TV controls, break scheduling, shared intelligence, privacy, and readiness.

## Current deployment boundary

The public preview is [edison.ntomalaba29.workers.dev](https://edison.ntomalaba29.workers.dev). It is not a complete production or staging deployment. The Worker compatibility response reports `applicationApiReady: false`, `mediaUploadReady: false`, and `mediaProcessingReady: false`.

The local R2 adapter and future Wrangler binding are prepared, but R2 has not been activated and the remote media bucket does not exist. Uploaded media and video processing are therefore unavailable in the deployed preview. Software TV adapters and remote controls have not been verified against physical devices.

## Product and operational limits

- No live broadcaster, ad-network, or payment-provider integration is active.
- Payment collection is disabled; the intended product release is simultaneous, with geography used only for campaign targeting.
- Shared ad intelligence is a software prototype, not a deployed fleet service.
- Physical hardware testing has not been completed.
- The project ledger reports 77/99 executable substages complete (77.8%). This is task completion, not product or launch readiness; consult the [execution plan](EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md) for evidence and blockers.

See the [README](README.md) for setup and commands, and [Known Limitations](KNOWN_LIMITATIONS.md) for the detailed boundary between implemented software and external or physical work.
