# EDISON

EDISON is being developed as an interactive Smart TV advertising and community-opportunity service. The repository contains campaign and opportunity workflows, QR-code redirects, household consent controls, and software-tested TV-break behavior; it is not yet a production service.

> **Project status:** Pre-production. The Cloudflare preview is a limited app shell backed by D1. Its compatibility endpoint reports `applicationApiReady: false`, `mediaUploadReady: false`, and `mediaProcessingReady: false`. R2 is declared as a future binding but no bucket is active. Real TV remote transports, broadcaster/ad-network integrations, payments, and physical-device validation are not complete.

## What is in this repository

- React 19 and TypeScript single-page application built with Vite.
- Express application API used by local development, with validation, authentication/session controls, and application workflows.
- Cloudflare Worker adapter with D1-backed auth/domain repositories and static assets.
- PostgreSQL migrations and local PGlite integration coverage.
- Local Node.js media validation and FFmpeg/ffprobe worker code. This is not available in the deployed Worker.
- Software simulations and tests for TV break scheduling, AURA remote commands, shared break intelligence, consent, QR flows, reliability, and readiness reporting.

Simulated and software-tested behavior must not be interpreted as verified TV hardware support, a live ad network, or commercial readiness.

## Availability and ad targeting

The product direction is a single simultaneous release, not country-by-country rollout waves. Campaign geography is used to select eligible ad audiences and does not control whether EDISON is available. The current geographic catalogue represents six grouped market profiles only; it is not complete worldwide targeting coverage. A worldwide product release and worldwide ad-targeting coverage are separate claims, and neither is currently production-ready.

## Deployed preview

The current preview is [edison.ntomalaba29.workers.dev](https://edison.ntomalaba29.workers.dev). It serves the frontend and exposes Worker health and compatibility endpoints. The preview is not full staging: application API readiness is reported as false, user uploads are unavailable, and media processing is disabled in the Worker runtime.

The Worker uses the `edison-staging` D1 database. Wrangler also declares the future `EDISON_R2_BUCKET` binding, but the R2 subscription and `edison-staging-media` bucket have not been activated or created. Do not expect uploads to work until the owner enables R2, creates the bucket, and deploys with the binding.

## Requirements

- Node.js 22 (the GitHub Actions workflow uses Node.js 22)
- npm
- Optional for Cloudflare deployment: Wrangler authentication to the configured Cloudflare account
- Optional for local media-worker tests: `ffmpeg` and `ffprobe`

## Local development

```powershell
npm ci
npm run dev
```

The Express development server listens on `http://localhost:3000`. To run the Cloudflare Worker locally instead:

```powershell
npm run dev:cloudflare
```

This command builds the frontend first, then starts Wrangler on `http://localhost:8787` with local bindings. Local Worker testing does not change or deploy Cloudflare resources.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Vitest unit and integration suite |
| `npm run test:e2e` | Playwright browser end-to-end tests |
| `npm run build` | Vite production build and governance-document packaging |
| `npm run progress` | Report the execution-ledger completion count |
| `npm run migrate:status` | Check local PostgreSQL/PGlite migration status |
| `npx wrangler d1 migrations list edison-staging --remote` | Inspect remote Cloudflare D1 migrations |

CI is defined in [`.github/workflows/edison-ci.yml`](.github/workflows/edison-ci.yml). The latest verified Linux workflow run is [45454484004](https://github.com/ntomalaba29/EDISON/actions/runs/45454484004); it passed on published commit `a7d86df`. It does not validate uncommitted work.

## Cloudflare deployment

The current Wrangler configuration targets the EDISON Cloudflare account, the existing D1 database, static assets in `dist/`, and a future R2 bucket binding. It does not activate R2 billing or create that bucket.

After enabling R2 in the Cloudflare dashboard and reviewing its billing terms, the owner can run this from Windows PowerShell:

```powershell
npm run deploy:cloudflare:create-bucket
```

The script checks the authenticated account and D1 migration status, asks for the literal confirmation `CREATE` before creating the bucket, runs the TypeScript check, focused Worker media tests and production build, then deploys and verifies health and media readiness. It stops if R2 is not enabled. The ordinary `npm run deploy:cloudflare` command expects the bucket to exist already. Neither command changes billing settings.

Do not run either deployment command while intending to keep the current free-only preview.

## Repository layout

```text
src/
  components/       React UI
  cloudflare/       Cloudflare Worker entry point
  server/           Express app, domain logic, D1/R2/PostgreSQL adapters
  types/            Shared TypeScript types
migrations/         PostgreSQL and Cloudflare D1 migrations
tests/              Vitest and Playwright tests
scripts/             Build, migration, and deployment utilities
deploy/              Deployment manifests and packaging notes
docs/                 Research, runbooks, security, and hardware test plan
public/               Static files copied into the Vite build
wrangler.jsonc        Cloudflare Worker, D1, assets, and future R2 config
```

## Current completion and remaining work

The project ledger records **77 of 99 executable substages complete (77.8%)**. This is task completion, not a measure of product or launch readiness. See the [execution plan](EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md) and [progress tracker](PROGRESS_TRACKER.md) for acceptance evidence and current blockers.

Major work still outstanding includes:

- Activate R2 and deploy the future media bucket binding if durable uploads are required; video transcoding is a separate, unresolved service decision.
- Complete Cloudflare application API readiness, staging backup/restore, monitoring, and recovery verification.
- Select and implement authorized TV command transports; test on physical Android/Google TV, Samsung Tizen, and LG webOS devices.
- Resolve ad-network, publisher, global geographic-data coverage, and editorial-policy decisions before live integrations.
- Complete external security, privacy, safety, and operational review before any commercial release. Payment collection remains off.

The final physical TV-and-phone procedure is documented in [`docs/testing/STAGE_P6_PHYSICAL_TEST_RUNBOOK.md`](docs/testing/STAGE_P6_PHYSICAL_TEST_RUNBOOK.md). No physical device results are claimed.

## Project documentation

- [Product requirements](PRODUCT_REQUIREMENTS.md)
- [System architecture](SYSTEM_ARCHITECTURE.md)
- [Technical requirements](TECHNICAL_REQUIREMENTS.md)
- [Known limitations](KNOWN_LIMITATIONS.md)
- [Privacy, security, and compliance boundaries](PRIVACY_SECURITY_AND_COMPLIANCE.md)
- [Jurisdiction compliance considerations](JURISDICTION_COMPLIANCE_REGISTER.md)
- Draft policies — [Privacy Notice](docs/legal/PRIVACY_POLICY_DRAFT.md), [Cookie Policy](docs/legal/COOKIE_POLICY_DRAFT.md), and [Terms and Conditions](docs/legal/TERMS_AND_CONDITIONS_DRAFT.md). These are not approved for publication.
- [Testing strategy](TESTING_STRATEGY.md)
- [Execution plan and status ledger](EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md)
- [Physical device test runbook](docs/testing/STAGE_P6_PHYSICAL_TEST_RUNBOOK.md)

## License

No license file is currently included. Unless and until the repository owner adds a license, no reuse rights are granted by this README.
