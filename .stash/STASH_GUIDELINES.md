# EDISON Stash — Copilot Guidelines

*Read this file first when continuing work in VSCode.*

> Historical handoff; current branch state, project progress, and release direction are documented in `.stash/PROJECT_STATUS.md`, `PROGRESS_TRACKER.md`, and `EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md`. Older rollout gates and instructions below are superseded.

---

## KEY CONTEXTS

**Current HEAD:** `6cd3b29` — EDISON repair: intl expansion route architecture geography privacy tests
**Remote (new-origin/main):** `6cd3b29` — **IN SYNC**
**Remote (origin/main):** `c4c20c6` — original base

**Repair 7 files committed:**
1. `package.json` — test script config
2. `InternationalExpansionPanel.tsx` — simplified, shared geography
3. `continentCountryRegionData.ts` — geography data module
4. `internationalAdminRoutes.ts` — re-exports geography
5. `mediaWorker.ts` — path traversal protection
6. `tests/internationalExpansion.test.ts` — preserved
7. `tests/r2MediaStorage.test.ts` — preserved

**All verified test groups PASS:**
- Track B/privacy: 6/6 ✅
- R2 Media Storage: 5/5 ✅
- API Regression: 7/7 ✅
- Delivery Infra: 3/3 ✅
- Reliability & Performance: 1/1 ✅
- Media Worker: 2/2 ✅

**17 reported timeouts = concurrency contention only** (not defects). Run with `--maxWorkers=1` locally.

---

## COPILOT RULES

### `continentCountryRegionData.ts`
- Preserve `CONTINENT_TARGET_MARKETS`, `CONTINENT_NAMES`, `COUNTRY_NAMES`, `REGION_PROFILES`
- Add new regions via `RegionProfileAssessment` interface
- Update utility functions if adding new continents
- **DO NOT** duplicate routes in `internationalAdminRoutes.ts` — it re-exports automatically

### `mediaWorker.ts`
- Preserve `sanitizeAssetFilename` and `assertConfinedPath` — path traversal protections
- Block `/`, `\`, `..`, `\0`, non-alphanumeric base chars via `/^[a-zA-Z0-9._-]+$/`
- **NEVER** weaken path confinement — fail-closed by design

### `internationalExpansion.test.ts`
- Preserve ALL assertions — `allPassed`, `isSoftwareSimulationOnly`, `regionalExpansionActive`, etc.
- Do NOT weaken assertions or remove tests
- `runInternationalExpansionVerificationSuite()` must remain in beforeAll
- New tests: follow existing pattern, map to verification suite

### `package.json`
- Keep `test` script: `"vitest run --maxWorkers=2 --testTimeout=60000"`
- Do NOT remove `--maxWorkers=2` or `--testTimeout=60000` without documentation
- New scripts: consistent naming `test:e2e`, `test:lint`, `test:build`

### Running tests
- **CI:** `--maxWorkers=2` (per `.github/workflows/edison-ci.yml`)
- **Local:** `--maxWorkers=1` to avoid 17 timeout failures
- Individual filters work: `vitest run -t 'uses authoritative geography'`
- Full international suite times out without `--maxWorkers=1`

### API changes
- `/api/international-expansion/` must enforce: auth (401), CSRF (403), admin RBAC (403), strict Zod (400), fail-closed EXPANSION_REGION_GATE_LOCKED (400)
- Admin `/decision` POST: 400 with `EXPANSION_REGION_GATE_LOCKED:` when `requestedRegionActivation: true`; 201 with SHA-256 digest when `false`

### Frontend changes
- Panel imports geography from `../server/continentCountryRegionData` — don't manage state locally
- Preserve `useMemo` addition
- Do not restore phased market-activation controls. Campaign geography is for ad targeting; applicable legal, privacy, safety, and security duties remain separate requirements.

---

## WHEN ASKING COPILOT

**Always start with:** `Read the stash file: .stash/PROJECT_STATUS.md`

**Examples:**
- `Read the stash file: .stash/PROJECT_STATUS.md Now help me run PostgreSQL migrations.`
- `Read the stash file: .stash/PROJECT_STATUS.md I need to add Asia market codes.`
- `Read the stash file: .stash/PROJECT_STATUS.md The 17 timeouts are re-occurring.`

---

## PROJECT CONTEXT

**EDISON** — Smart TV Advertising Network
**Repository:** `ntomalaba29/EDISON` (GitHub)
**Branch:** `main`
**Repair Commit:** `6cd3b29` — "EDISON repair: intl expansion route architecture geography privacy tests"
**Base Commit:** `c4c20c6` — before repair work
**Safety Rules:** No .env/Secrets, No dependency install, No network, No deploy, No push to original origin, No destructive Git, No commit without verification

**Repair Scope:** International Expansion only. Other EDISON subsystems documented but out of scope.