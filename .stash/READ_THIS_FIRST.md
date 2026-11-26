# EDISON Automatic TV Advertising — Read This First

**Last reconciled:** 2026-11-26

This stash controls Copilot/Cline handoff for the complete automatic television
advertising implementation.

## Objective

EDISON must implement this workflow:

1. AD TRACKER detects an authorized commercial break.
2. SWITCHER receives and validates the event.
3. SWITCHER opens the separate EDISON Android TV application automatically.
4. EDISON plays the selected advertisement.
5. SWITCHER restores the exact previous broadcast channel/input and viewing state.

The workflow is automatic. Viewer-triggered switching is not a substitute.

## Scope

- Android TV / Google TV only.
- Traditional satellite/broadcast television.
- A separate native EDISON Android TV application.
- No overlay on another application.
- No IPTV, general-purpose remote, mobile remote, or remote server.
- No general-purpose ad-network expansion.
- No public API or hardware capability may be represented as available without evidence.

## Authoritative documents

1. `.stash/MASTER_PRODUCTION_ROADMAP.md`
2. `.stash/CLINE_TASK.md`
3. `.stash/CLINE_REPORT.md`
4. `.stash/PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md`

The master roadmap overrides the older Android TV/AdSense queue for the
automatic television advertising project. The older document remains historical
implementation evidence and must not be used to claim real switching or playback.

## Current state

- Repository HEAD: `e95d3ee556f0e01e5056bcc4037634f6c42797d2`
- Working tree was clean before the handoff documents were created; current
  work includes the accepted CL-01 baseline repair and stash updates.
- Stage 1 is complete.
- Stage 2 is active: physical-system architecture and trust boundaries.
- CL-01 is accepted after Copilot repaired the discovered decision-route defect.
- There is no active Cline task. CL-02 remains queued until its Stage 24
  dependencies are eligible; do not start it while Stage 2 is active.
- Current local checks: TypeScript pass, Vitest 36 files/165 passed/1 skipped,
  Playwright 2/2 passed. Android CI and physical-device validation remain open.
- The existing TV platform adapters and watchdogs are software simulations.
- The EDISON Android app exists, but it has no real ad playback or real switcher.
- Physical automatic switching is not established.

## Cline workflow

1. Read this file.
2. Read `.stash/MASTER_PRODUCTION_ROADMAP.md`.
3. Read `.stash/CLINE_TASK.md`.
4. Start only when `.stash/CLINE_TASK.md` names one task as `ACTIVE`; verify the
   worktree and execute only its listed files and commands.
5. If there is no active task, stop without inventing one.
6. Write findings only to `.stash/CLINE_REPORT.md` unless the active task names
   another explicit file.
7. Mark the report `AWAITING_COPILOT_REVIEW`.
8. Do not commit, push, deploy, delete files, change production configuration,
   access secrets, make network calls, or perform payment/billing actions.

## Copilot review workflow

1. Read Cline's report.
2. Inspect the actual diff.
3. Run the report's required tests.
4. Accept or reject each result with evidence.
5. Update the master roadmap and `.stash/CLINE_TASK.md`.
6. Continue the next valid stage.

## Immediate next action

Copilot owns Stage 2 and the automatic-switching feasibility gate. No Cline task
is active; CL-02 is queued behind Stage 24 prerequisites.
