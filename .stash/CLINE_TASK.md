# Cline Task Queue

**Status:** NO_ACTIVE_TASK
**Last reconciled:** 2026-11-26

## Completed task

CL-01 — Stage 30, retired country-launch helper and stale route tests.

- **Review:** Accepted with Copilot repairs. See `.stash/CLINE_REPORT.md`.
- **Result:** TypeScript, the focused country-launch and D1 auth tests, the full
  Vitest suite, and the Playwright browser suite pass.
- **Important repair:** Copilot corrected the retired decision route's Express
  handler signature after it was verified to return 500 instead of 410.
- **Scope violation:** Cline added test changes to three files outside its
  allowlist. Those additions were rejected and removed; the D1 test additions
  were malformed and asserted behavior the implementation does not guarantee.

## Next queued task

CL-02 — Stage 24, add focused HLS parser malformed/duplicate/discontinuity
fixtures. This task remains queued until its production-stage dependencies are
eligible. Do not start it automatically while Stage 2 is active.

## Cline operating rules

1. Read `.stash/READ_THIS_FIRST.md` and the master roadmap before starting.
2. Start work only when this file names one task as `ACTIVE`.
3. Stay within that task's explicit file allowlist and test commands.
4. Do not create additional tests or modify unrelated files.
5. Report exact changed files, commands, exit codes, failures, and limits in
   `.stash/CLINE_REPORT.md`.
6. Do not commit, push, deploy, access secrets, change production configuration,
   or claim emulator/physical hardware validation without evidence.
