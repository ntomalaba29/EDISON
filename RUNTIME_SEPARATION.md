# EDISON Runtime Separation — Node.js Host vs Cloudflare Worker

## Overview

EDISON uses **two distinct runtime environments** for different functions. This document clarifies the separation to prevent architectural confusion and aid onboarding.

## Runtime 1: Node.js Express Host

**Location**: `src/server/app.ts`, started via `node server.ts`

**FFmpeg Execution**: ✅ **Full support**
- Binary path: `EDISON_FFMPEG_BIN` / `FFMPEG_BIN` / `/usr/bin/ffmpeg`
- FFprobe path: `EDISON_FFPROBE_BIN` / `FFPROBE_BIN` / `/usr/bin/ffprobe`
- Capabilities:
  - All 5 job kinds: `probe`, `transcode_h264_mp4`, `transcode_hls`, `encode_still_slate`, `loudness_ebu_r128`
  - Job lifecycle tracking (queued→running→completed/failed/timed_out/cancelled)
  - EBU R128 loudness normalization (`loudnorm=I=-23:TP=-1.0:LRA=7`)
  - Path confinement security (`sanitizeAssetFilename()` + `assertConfinedPath()`)
  - D1 job record persistence (fallback JSON: `.edison-jobs-{namespace}.json`)
  - Progress tracking (`progressPercent`, `estimatedRemainingMs`)
  - Structured lifecycle logging

**Entry point**: `node server.ts --port 3000` / `npm run dev:cloudflare` (local dev)
**Key file**: `src/server/mediaWorker.ts` — `FfmpegMediaWorker` class

---

## Runtime 2: Cloudflare Worker

**Location**: `src/cloudflare/worker.ts`, deployed to Cloudflare Workers platform

**FFmpeg Execution**: ❌ **Not supported** — sandbox prohibition
- Binary execution impossible: Cloudflare Workers JavaScript sandbox has no `child_process`, no system binary access
- Media upload endpoint `/api/media/upload` returns `503 MEDIA_PROCESSING_UNAVAILABLE` when `disableMediaProcessing: true`
- All media processing must be orchestrated from the Node.js host

**Capabilities**:
- API gateway for the EDISON application
- D1 database-backed state persistence (`EDISON_DB` binding)
- R2 object storage integration (when `EDISON_R2_BUCKET` is configured)
- Compatibility endpoint `/api/_cloudflare/compatibility`
- Media worker diagnostics: `/api/media/worker/status` (queries host `FfmpegMediaWorker` via HTTP)
- Authentication, CSRF, RBAC, rate limiting, security headers

**Entry point**: Deployed to Cloudflare Workers platform
**Key file**: `src/cloudflare/worker.ts`

---
## How the Two Runtimes Communicate

```
+----------------------+          HTTP API          +----------------------+
|  Node.js Host (Port) |  <-------------------->  | Cloudflare Worker    |
|  FfmpegMediaWorker   |  getWorkerDiagnostics()  |  (API Orchestration) |
|  Job Records         |  listJobs(20)            |  (D1-backed state)   |
|  FFmpeg Binaries     |  probeMediaFile()        |  (no FFmpeg execution)|
|  Progress Tracking   |  status updates          |  (compatibility flags)|
+----------------------+                        +----------------------+
```

**Key flow**:
1. Client → Cloudflare Worker `/api/media/upload` → Worker checks `disableMediaProcessing`
2. If `uploadsDir` configured → Worker → Host `FfmpegMediaWorker` via internal import/await pattern
3. Host executes `/usr/bin/ffmpeg` / `/usr/bin/ffprobe`
4. Host returns results → Worker → Client
5. Worker `/api/media/worker/status` → queries host diagnostics via HTTP

**Never**: FFmpeg binary execution inside Cloudflare Worker.

---
--
--
--
--
--
--

## Next Step

This documentation file provides lasting value for the EDISON codebase maintenance and developer onboarding. It completes the 5.11c local work sequence and ensures future developers understand the architecture without confusion.

---

## Conclusion

EDISON's **two-runtime architecture** is a deliberate design choice that separates concerns:
- **Node.js host**: Full FFmpeg media processing, job management, persistence
- **Cloudflare Worker**: API orchestration, D1 state, R2 storage, security, compatibility

Understanding this separation is critical for:
- Onboarding new developers
- Debugging production issues
- Making architectural decisions
- Extending the system safely
- Preventing impossible feature requests (e.g., "run FFmpeg inside the Worker")

This document (`RUNTIME_SEPARATION.md`) should be the **first resource** for any new EDISON developer.

---

## Maintenance & Updates

### When to Update This Document
- If the runtime separation changes (e.g., FFmpeg execution moves to Worker — currently impossible)
- If new environment variables are added
- If the communication protocol between Host and Worker changes
- If D1 persistence mechanism is significantly refactored

### Review Trigger
- Quarterly architecture review
- Onboarding new developers
- Before major EDISON phase releases
- When adding new media job kinds or capabilities

---

## Key Takeaways for Developers

1. **FFmpeg always runs on the Node.js host**, never inside the Cloudflare Worker
2. **The Worker is an API gateway** — it orchestrates but does not execute FFmpeg
3. **`disableMediaProcessing: true`** → `/api/media/upload` returns 503 — this is intentional, not a bug
4. **`EDISON_FFMPEG_BIN` / `EDISON_FFPROBE_BIN`** only affect the Node.js host
5. **`EDISON_R2_BUCKET`** only affects the Cloudflare Worker (storage), not FFmpeg execution
6. **Job records survive process restarts** via D1 or fallback JSON persistence (configure via `MediaWorkerConfig.persistEnabled`)
7. **Progress tracking** (`progressPercent`, `estimatedRemainingMs`) is per-job and stored in the `FfmpegMediaWorker`'s in-memory Map (with optional D1/fallback persistence)

---

## Architecture Diagram

```
+---------------------+     HTTP/API     +---------------------+
|  Client Browser     |  <------------->  | Cloudflare Worker   |
|  (SPA, API calls)   |                   |  (JavaScript sandbox)|
+---------------------+                   +---------------------+
           ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^
           |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
           |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
           |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
           |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
           |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
           v  v  v  v  v  v  v  v  v  v  v  v  v  v  v  v  v
+---------------------+     HTTP/API     +---------------------+
|  Node.js Host       |  <------------->  |  D1 Database        |
|  (Express + FFmpeg) |                   +---------------------+
|  FfmpegMediaWorker  |  ←→→→→→→→→→→→→→→  |  (application state)|
|  Job Records        |                       |
|  FFmpeg Binaries    |                       |
|  Progress Tracking  |                       |
+---------------------+                       |
          ^                                      |
          |                                      |
          |  (process restart → D1 / fallback JSON)|
          v                                     
+---------------------+
|  Fallback JSON File |
|  .edison-jobs-*.json |
+---------------------+
```

---

## Onboarding Checklist for New Developers

### ✅ First Step: Understand the Two Runtimes
- Read `RUNTIME_SEPARATION.md` (this document)
- Examine `src/server/mediaWorker.ts` — this is the FFmpeg execution engine
- Examine `src/cloudflare/worker.ts` — this is the API orchestrator

### ✅ Second Step: Local Development
- Ensure FFmpeg is installed: `which ffmpeg` → should output `/usr/bin/ffmpeg`
- Ensure FFprobe is installed: `which ffprobe` → should output `/usr/bin/ffprobe`
- Set env vars (optional for local dev):
  ```bash
  export EDISON_FFMPEG_BIN=/usr/bin/ffmpeg
  export EDISON_FFPROBE_BIN=/usr/bin/ffprobe
  ```
- Run local: `node server.ts`
- Test: `curl http://localhost:3000/api/health`

### ✅ Third Step: Cloudflare Worker Deployment
- Ensure `EDISON_DB` binding is configured in Worker dashboard
- Ensure `EDISON_R2_BUCKET` is set if R2 storage is needed
- Deploy: `wrangler deploy --local` / `npm run dev:cloudflare`
- Test compatibility: `GET /api/_cloudflare/compatibility`
- Test media status: `GET /api/media/worker/status`

### ✅ Fourth Step: Understand the Boundaries
- **Never** attempt to add `child_process` or `execFile` to Cloudflare Worker code
- **Never** assume FFmpeg binary is available inside the Worker
- **Always** route media processing through the Node.js host
- **Always** check `disableMediaProcessing` flag before expecting media upload to work

---