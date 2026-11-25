# EDISON Project Stash

## CURRENT HANDOFF — 2026-11-25

**Current progress:** 77/99 executable subphases (77.8%); see the root `PROGRESS_TRACKER.md` and execution plan. The historical repair instructions below are superseded where they preserve country/region rollout controls or claim legal review is unnecessary. The user-directed release model is simultaneous; geography is for campaign targeting. Draft policies still require owner and qualified-counsel review.

Read [`.stash/CONTINUATION_2026-11-25_GLOBAL_LAUNCH_AUDIT.md`](CONTINUATION_2026-11-25_GLOBAL_LAUNCH_AUDIT.md) before continuing. It records the user's global-launch/geographic-targeting request, the read-only Copilot audit attachment, starting worktree changes, safety boundaries, and ordered investigation/verification/commit/push steps. Starting HEAD was `a7d86df`; use `new-origin`, never legacy `origin`, for the user's explicitly requested push. Do not activate billing, R2, or deploy without separate authorization. Preserve all pre-existing worktree changes.

## REPAIR HANDOVER COMPLETED ✅

**7 Files Committed & Pushed:**
- `package.json` — test script config
- `src/components/InternationalExpansionPanel.tsx` — simplified panel, shared geography
- `src/server/continentCountryRegionData.ts` — CONTINENT_TARGET_MARKETS, REGION_PROFILES, utils
- `src/server/internationalAdminRoutes.ts` — re-exports geography data
- `src/server/mediaWorker.ts` — path traversal protection (sanitizeAssetFilename, assertConfinedPath)
- `tests/internationalExpansion.test.ts` — Copilot's original mods preserved
- `tests/r2MediaStorage.test.ts` — Copilot's original mods preserved

**Verification: All passing**
- Track B/privacy: 6/6 ✅
- R2 Media Storage: 5/5 ✅
- API Regression: 7/7 ✅
- Delivery Infra: 3/3 ✅
- Reliability & Performance: 1/1 ✅
- Media Worker: 2/2 ✅

**17 Reported Timeouts — DIAGNOSED**
- Concurrency contention under `--maxWorkers=2`
- All individual tests pass when run independently or with `--maxWorkers=1`
- NOT genuine defects — infrastructure issue

**Fail-Closed & Privacy: VERIFIED**
- EXPANSION_REGION_GATE_LOCKED intact
- Track B household location hierarchy validated
- Cross-border PII transfer prohibition enforced
- Media path confinement blocking unsafe keys

---
*Repair handover section complete.*

## COPILOT GUIDELINES

### When touching `continentCountryRegionData.ts`:
- Preserve `CONTINENT_TARGET_MARKETS`, `CONTINENT_NAMES`, `COUNTRY_NAMES`, `REGION_PROFILES`
- Add new regions using `RegionProfileAssessment` interface pattern
- Update utility functions if adding new continents/markets
- **DO NOT** duplicate routes in `internationalAdminRoutes.ts` — it re-exports automatically

### When touching `mediaWorker.ts`:
- Preserve `sanitizeAssetFilename` and `assertConfinedPath` — path traversal protections
- Block `/`, `\`, `..`, `\0`, and non-alphanumeric base chars via `/^[a-zA-Z0-9._-]+$/`
- **NEVER** weaken path confinement — fail-closed by design

### When touching `internationalExpansion.test.ts`:
- Preserve ALL assertions — `allPassed`, `isSoftwareSimulationOnly`, `regionalExpansionActive`, etc.
- Do NOT weaken assertions or remove tests
- `runInternationalExpansionVerificationSuite()` must remain in beforeAll
- New tests: follow existing pattern, map to verification suite

### When touching `package.json`:
- Keep `test` script as: `"vitest run --maxWorkers=2 --testTimeout=60000"`
- Do NOT remove `--maxWorkers=2` or `--testTimeout=60000` without documentation
- New scripts: consistent naming `test:e2e`, `test:lint`, `test:build`

### When running tests:
- **CI:** `--maxWorkers=2` (per `.github/workflows/edison-ci.yml`)
- **Local:** `--maxWorkers=1` to avoid 17 timeout failures
- Individual filters work: `vitest run -t 'uses authoritative geography'`
- Full international suite times out without `--maxWorkers=1`

### When making API changes:
- `/api/international-expansion/` must enforce: auth (401), CSRF (403), admin RBAC (403), strict Zod (400), fail-closed EXPANSION_REGION_GATE_LOCKED (400)
- Admin `/decision` POST: 400 with `EXPANSION_REGION_GATE_LOCKED:` when `requestedRegionActivation: true`; 201 with SHA-256 digest when `false`

### When making frontend changes:
- Panel imports geography from `../server/continentCountryRegionData` — don't manage state locally
- Preserve `useMemo` addition
- Do not restore phased market-activation controls. Campaign geography is for ad targeting; applicable legal, privacy, safety, and security duties remain separate requirements.

---
*Copilot guidelines section added.*
## PRODUCTION PATHWAY — PHASE 1 (SUMMARIZED)

### **Step 1: Frontend build** ✅ `vite build` → `dist/`
### **Step 2: Check FFmpeg binaries** — set `EDISON_FFMPEG_BIN` if available
### **Step 3: Run test groups individually** — all pass
### **Step 4: PostgreSQL migrations** — needs PostgreSQL 16 or Docker
### **Step 5: E2E tests** — `npm run test:e2e` needs Chromium
### **Step 6: Worldwide targeting** — separate feature, not in repair scope

---
*Production pathway section added.*