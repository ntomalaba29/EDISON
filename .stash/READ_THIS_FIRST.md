# EDISON Automatic TV Advertising — Read This First

**Last reconciled:** 2026-11-27

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
4. `.stash/STAGE2_PHYSICAL_ARCHITECTURE.md`
5. `.stash/STAGE3_FEASIBILITY_RESEARCH.md`
6. `.stash/PRODUCTION_PATH_ANDROID_TV_GOOGLE_ADS.md`
7. `.stash/NEXT_PC_SETUP.md` — setup and cleanup record for moving to another PC

The master roadmap overrides the older Android TV/AdSense queue for the
automatic television advertising project. The older document remains historical
implementation evidence and must not be used to claim real switching or playback.

## Current state

- The setup record was created from a worktree based on
  `9c2ba4d237488b90041a166fc329e18a68e1c790`; verify current HEAD and worktree
  before starting further work.
- CL-01 was committed and pushed; the Stage 2 update is documentation-only.
- Stage 1 is complete.
- Stage 2 is complete: architecture and trust boundaries are in
  `.stash/STAGE2_PHYSICAL_ARCHITECTURE.md`.
- Stage 3 is blocked pending a named, owner-authorized TV/STB target and access
  evidence for feasibility testing.
- Owner confirmed no target is currently available or selected.
- `.stash/STAGE3_FEASIBILITY_RESEARCH.md` explains why a standard retail streamer
  is not evidence for the full switching workflow.
- CL-01 is accepted after Copilot repaired the discovered decision-route defect.
- There is no active Cline task. CL-02 remains queued until its Stage 24
  dependencies are eligible.
- Latest local checks: TypeScript and web build pass; Vitest 37 files/171
  passed/1 skipped; Playwright 2/2; Android unit tests and APK assembly pass.
  Stage 24 CI/baseline reconciliation is complete; physical-device validation
  remains open.
- Android `testDebugUnitTest` and `assembleDebug` pass locally and in
  [GitHub Actions run 45903131145](https://github.com/ntomalaba29/EDISON/actions/runs/45903131145).
  The run also passed the existing Node/Playwright job. Checkout reports a
  non-blocking warning for the existing `research/study/adhush` gitlink without
  a `.gitmodules` entry. Android emulator and physical-device validation remain
  separate and incomplete.
- The existing TV platform adapters and watchdogs are software simulations.
- The EDISON Android app exists, but it has no real ad playback or real switcher.
- Physical automatic switching is not established.
- APP-03 local enrollment and credential-rotation code exists, but it is not
  end-to-end verified against staging. A lost rotation response can invalidate
  the old token before the TV saves the new one; recovery may require
  owner-assisted re-enrollment.

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

Continue from the authoritative production ledger. Before staging enrollment,
review the credential-rotation lost-response recovery limitation and complete
APP-04 only with explicit owner authorization. No Cline task is active.
