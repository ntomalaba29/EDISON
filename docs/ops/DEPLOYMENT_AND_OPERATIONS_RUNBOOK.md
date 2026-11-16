# EDISON — Production Deployment, PostgreSQL Migration & Operations Runbook

## 1. Deployment Modes

### Mode A — Local / AI Studio Prototype
- Persistence: Atomic JSON (`data/edison-store.json`, `schemaVersion: 8`).
- Start command: `npm run dev` (Express + Vite middlewares on port `3000`).

### Mode B — Production Sovereign Cluster (Docker Compose / Cloud SQL / Kubernetes)
1. Provision PostgreSQL 16+ instance in target sovereign region (`deploy/regions/<region>.json`).
2. Copy `.env.production.example` to `.env` (via secrets manager; never commit `.env`).
3. Set `DATABASE_URL` and `EDISON_STORAGE_BACKEND=postgresql_pg`.
4. Verify migrations and backfill atomically:
   ```bash
   npx tsx src/server/postgres/cli.ts status
   npx tsx src/server/postgres/cli.ts up
   npx tsx src/server/postgres/cli.ts import --file data/edison-store.json
   ```
5. Build & start container stack:
   ```bash
   docker compose -f deploy/docker-compose.yml up -d --build
   ```
6. Verify liveness & worker readiness:
   - `GET /api/health` -> HTTP `200` (`status: "ok"`)
   - `GET /api/media/worker/status` (authenticated) -> `ffmpegAvailable: true`, `ffprobeAvailable: true`
   - `GET /api/admin/database/status` (admin) -> SQL migration count & readiness confirmed.

---

## 2. Backup, Rollback & Disaster Recovery

- **Pre-Deploy Logical Dump**:
  ```bash
  npx tsx src/server/postgres/cli.ts export --out backups/edison-predeploy.json
  ```
- **SQL Down-Migration**:
  ```bash
  npx tsx src/server/postgres/cli.ts down
  ```
- **CDN & Origin Rule**: Never cache `/r/*` or `/api/*` at the CDN edge (`deploy/cdn-static-routing.json`), ensuring Track B consent withdrawal revokes active QR tokens to `HTTP 403` within `< 1s`.
- **Ordinary Live TV Watchdog**: If the origin or CDN suffers a complete outage, Smart TV adapters fall back cleanly to LKG offline bundle or idle without interrupting live broadcast television (`ordinaryTvPreserved: true`).
