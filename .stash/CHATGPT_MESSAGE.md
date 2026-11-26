EDISON — CHATGPT HANDOVER MESSAGE

Author: ChatGPT
Date: 26 November 2026
Repository: https://github.com/ntomalaba29/EDISON
Target file: ".stash/CHATGPT_MESSAGE.md"

1. PURPOSE

This is the authoritative handover message from ChatGPT for the EDISON Android TV and Google advertising-infrastructure assignment.

Read this entire document before starting. Verify the actual repository state rather than assuming that historical findings or progress reports are still accurate.

2. OPERATING MODE

Use one continuous ACT workflow:

1. Inspect.
2. Implement.
3. Test.
4. Review.
5. Report.

Verify that ACT mode is active before proceeding. If ACT mode cannot be verified, stop and report the issue. Do not silently switch to PLAN mode.

Avoid repeated audits of unchanged code. Reuse valid existing implementation and evidence.

3. MANDATORY STASH-FIRST PROCEDURE

Before implementation or any potentially disruptive operation:

1. Inspect the repository path, branch, full HEAD hash, commit message and working-tree status.
2. Locate ".stash" and read its existing records.
3. Identify existing equivalents of:
   - "WORKPLAN"
   - "TASK_LIST_CURRENT"
   - "WORKFLOW_STATE"
   - "PROGRESS_STATUS"
   - "HANDOVER"
   - "CHATGPT_MESSAGE.md"
4. Reconcile the records with the actual source code and Git state.
5. Check whether GitHub Copilot is actively working in the workspace.
6. Update the existing stash records with the verified baseline, task plan, scope, safety boundaries and next action.
7. Verify that the updates were saved.

Do not create duplicate records unnecessarily.

The stash is the persistent handover mechanism. Keep it updated throughout the assignment. Assume you may run out of context or tokens at any time.

4. PROTECT GITHUB COPILOT WORK

GitHub Copilot may be actively implementing work in the same VS Code workspace.

Its work must be protected.

- Inspect for active Copilot sessions, tasks, terminals, builds, tests and file operations.
- Never interrupt, cancel, terminate, restart or take over Copilot.
- Do not edit files Copilot is actively creating or modifying.
- Do not run conflicting operations.
- Preserve all existing modifications and untracked files, regardless of which agent created them.
- Never reset, revert, clean, overwrite, discard or stash away existing work.
- If a safe working boundary cannot be established, restrict activity to non-invasive inspection, document the conflict and stop the affected operation.

Protect Copilot's work even when doing so delays implementation.

5. OBJECTIVE

Audit and improve EDISON's:

- Native Android TV application.
- Third-party advertising integration.
- Google-centred advertising infrastructure.
- Advertising playback reliability and measurement.
- Security, testing and production-readiness pathway.

The goal is a technically credible implementation supported by verifiable evidence.

6. STRICT SCOPE EXCLUSIONS

EDISON's own paid-advertiser marketplace is OUT OF SCOPE.

Do not build:

- Advertiser self-service registration.
- Advertiser campaign dashboards.
- EDISON commercial advertising sales.
- Advertiser pricing or campaign-management systems.
- Direct advertiser payments or billing.
- TV-owner advertising revenue sharing or payouts.
- Unrequested commercial workflows.

Do not expand the integration into a large collection of advertising providers.

Keep the architecture simple, maintainable and reasonably extensible.

7. GOOGLE ADVERTISING STRATEGY

Evaluate the following Google products separately. Verify current compatibility, eligibility and requirements using official documentation.

7.1 Google IMA SDK

Candidate for supported video-ad playback on Android TV.

Verify:

- Android TV compatibility.
- Supported player integration.
- Supported ad formats.
- Ad request and response handling.
- Playback events.
- Error handling and recovery.
- Current implementation requirements.

Do not claim Android TV support unless official documentation confirms the exact approach.

Official documentation:

https://developers.google.com/interactive-media-ads

7.2 Google Ad Manager

Assess whether Ad Manager is required or beneficial for:

- Ad serving.
- Inventory management.
- Access to advertising demand.
- Reporting.

Verify account eligibility, inventory setup, approval and technical requirements.

Official website:

https://admanager.google.com/

7.3 Google AdSense

Treat AdSense as a separate website-monetisation product for eligible EDISON web properties.

Do not present it as the Android TV ad-playback SDK.

Official website:

https://www.google.com/adsense/

7.4 Google AdMob

Do not use AdMob as the Android TV advertising solution.

Defer it unless a separate, authorised companion-mobile-app requirement makes it relevant.

Official website:

https://admob.google.com/

7.5 Other advertising providers

Do not integrate Magnite, FreeWheel, PubMatic or other advertising networks during this assignment.

Do not build premature abstractions or microservices for hypothetical future integrations.

Use official Google documentation as the primary authority. Record the exact documentation consulted and date checked.

Never invent APIs, SDK capabilities, account eligibility or approval status.

8. REPOSITORY INVESTIGATION

Inspect the actual implementation before deciding what needs to be built.

Investigate:

1. Whether a real native Android TV application exists.
2. Android project structure.
3. Gradle configuration.
4. Kotlin/Java source.
5. Android manifest.
6. TV launcher and application-category declarations.
7. Device communication.
8. Application navigation.
9. Video playback.
10. Advertising architecture.
11. Actual Google SDK integration.
12. Ad request and response handling.
13. Error handling and recovery.
14. Configuration and credential boundaries.
15. Existing tests and build procedures.

Distinguish real implementations from prototypes, mocks, simulated adapters and placeholder interfaces.

Historical findings requiring verification

Earlier exploratory work raised these possible concerns:

- A potentially malformed TypeScript declaration in "src/server/sharedIntelligencePreview.ts".
- Android TV tasks potentially marked complete without evidence of a native Android project.
- Simulated adapters potentially being treated as real integrations.
- A possible mismatch between simulation flags and simulated records.
- Conflicting progress figures in stash documents.

These are historical leads, NOT confirmed current findings.

Recheck each against the current repository. Record whether it is confirmed, fixed, absent or unresolved.

Do not assume the previously observed branch, commit or working-tree state is current.

9. PRODUCTION IMPLEMENTATION PATHWAY

Maintain the following numbered stages in the workplan and task tracker.

Stage 1 — Baseline and architecture

Establish the actual repository state, architecture, dependencies, existing implementation and blockers.

Identify the smallest safe implementation pathway.

Stage 2 — Native Android TV application

Establish or verify:

- Native Android project.
- Gradle build.
- Kotlin/Java implementation.
- Android manifest.
- Android TV launcher support.
- Device communication.
- Navigation.
- Video playback.

Produce a verifiable build where the environment permits.

Stage 3 — Google IMA

Verify official compatibility and integrate a supported approach.

Handle:

- Ad requests.
- Ad responses.
- Playback.
- Playback events.
- Errors.
- Recovery.

Stage 4 — Google Ad Manager

Determine whether it is necessary and compatible.

Document:

- Account requirements.
- Eligibility.
- Inventory configuration.
- Approval dependencies.
- Technical integration requirements.

Stage 5 — Google AdSense

Assess eligible EDISON websites.

Document:

- Website eligibility.
- Ownership requirements.
- Policy requirements.
- Approval requirements.
- Integration requirements.

Stage 6 — Reliability and measurement

Where supported, implement and verify:

- Ad requests.
- Ad starts.
- Impressions.
- Quartile events.
- Completion events.
- Error events.
- Duplicate-event protection.
- Offline handling.
- Appropriate frequency controls.

Do not report simulated events as real advertising measurements.

Stage 7 — Security

Review:

- Configuration management.
- Credential boundaries.
- Transport security.
- Privacy.
- Data minimisation.
- Trust boundaries.
- Error handling.

Never inspect, expose or copy secrets or ".env" contents.

Stage 8 — Automated testing

Run relevant:

- Unit tests.
- Integration tests.
- Static analysis.
- Type checks.
- Lint checks.
- Android builds.

Distinguish genuine integration tests from mocked or simulated tests.

Stage 9 — Physical Android TV verification

Verify actual installation, launch, navigation, playback and advertising behaviour on a physical Android TV device where available.

Test network failure and recovery.

Do not claim physical-device verification without evidence.

Stage 10 — Production readiness

Document:

- Google account eligibility.
- Required approvals.
- Policy compliance.
- Monitoring.
- Operational procedures.
- Deployment prerequisites.
- Remaining risks.

Do not deploy or modify production systems.

10. TASK STATUS AND EVIDENCE

Use these statuses consistently:

- "NOT STARTED"
- "IN PROGRESS"
- "BLOCKED"
- "COMPLETED"
- "VERIFIED"

Writing code does not automatically mean a task is complete.

Use "VERIFIED" only when the acceptance criteria have been met and the relevant test evidence is recorded.

For every meaningful task or milestone, update the stash with:

- Task ID and status.
- Completed work.
- Remaining work.
- Files created or changed.
- Implementation details.
- Exact commands executed.
- Test results and exit codes.
- Build results.
- Whether evidence is real, mocked, simulated or unavailable.
- Official documentation consulted.
- Limitations and blockers.
- Production dependencies.
- Updated progress.
- Exactly one next task.

Keep all progress figures mathematically consistent.

Clearly distinguish:

1. Repository implementation completion.
2. Automated verification.
3. Emulator verification.
4. Physical Android TV verification.
5. Google account eligibility and approval.
6. Production readiness.

Do not count planned, blocked, simulated or merely coded work as verified completion.

11. SAFETY AND AUTHORISATION

Without separate explicit authorisation, do not:

- Perform destructive Git operations.
- Commit or push changes.
- Deploy.
- Modify production systems.
- Access, print, copy or expose secrets or ".env" contents.
- Create external accounts.
- Submit commercial registrations.
- Make payments or incur charges.
- Perform unrelated network activity.
- Perform unrelated refactoring.
- Interrupt active Copilot work.

Preserve all user changes and untracked files.

If an action crosses these boundaries, document the dependency and stop for authorisation.

12. COMPLETION CRITERIA

This assignment is complete only when:

- In-scope repository work has been implemented.
- Changes have been reviewed.
- Applicable automated tests and builds have been run.
- Results and limitations have been recorded.
- The persistent stash records are current.
- The next production-readiness steps are documented.

Do not describe the entire EDISON product as complete merely because this assignment is complete.

Do not describe the system as production-ready while physical-device verification, Google approvals, operational controls or other required evidence remain outstanding.

If a dependency prevents completion, mark the affected task "BLOCKED", explain why and identify the next safe action.

13. FINAL REPORT FORMAT

The final report must contain exactly three lines inside one fenced code block. No explanatory text outside the block.

STATE — repository path; branch; full HEAD hash and commit message; working-tree status; files changed; verified findings.
VERIFICATION — exact commands; tests/builds and results with exit codes; Android emulator/device evidence; official documentation checked; network activity or none.
VERDICT — completion state; risks, blockers and production restrictions; exactly one next action.

Never invent repository state, test results, documentation checks, device evidence or completion claims.

14. IMMEDIATE INSTRUCTION

Begin by verifying ACT mode.

Then:

1. Perform non-invasive repository baseline checks.
2. Check for active Copilot work and establish a safe working boundary.
3. Read and reconcile existing ".stash" records.
4. Update the persistent workplan, task list, workflow state, progress status and handover records, reusing existing files where possible.
5. Verify that the stash updates were saved.
6. Proceed with safe, non-conflicting work under this assignment.

This document is the starting handover. The actual repository state must always be verified before implementation.