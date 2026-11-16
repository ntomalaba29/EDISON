# EDISON — Stage P6 Physical Hardware & Field Pilot Test Runbook

**Governance Lock (`ADR-014`)**: Zero physical Smart TV hardware tests have been claimed or executed during software development (`hardwareTested: false`, `pilotHardwareExecuted: false`). This single integrated runbook governs the **one comprehensive physical test milestone (`Stage P6`)** prior to controlled cohort pilot approval and Phase 13 commercial readiness.

**Pre-Requisite Software Gates Before Executing Stage P6**:
- `npm test` (23/23 Vitest suites passing)
- `npm run test:e2e` (Playwright Chromium E2E passing)
- `npm run build` & `npm run lint` clean
- `/api/admin/database/verify-pglite` passing (or live PG16 migrations `up` + backfill complete)

---

## Stage P6 — 8-Step Physical Verification Matrix (`P6-01` .. `P6-08`)

| Step ID | Test Area | Physical Procedure & Devices | Pass Threshold (Fail-Closed) | Actual Observed Measurement | Result (`PASS`/`FAIL`/`PENDING`) | Owner Sign-Off |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`P6-01`** | **AURA Discovery, 6-Digit PIN Pairing & TV Tuner Preservation** | Pair real iOS & Android smartphones via AURA (`DIAL/mDNS`) to target Android TV, Samsung Tizen & LG webOS sets watching live OTA/HDMI broadcast. | Pairing succeeds `<= 5s`; live TV video/audio remains uninterrupted during background pairing (`ordinaryTvPreserved: true`). | *(Owner measurement)* | `PENDING` | |
| **`P6-02`** | **Live Channel Switch & `FM-09` Dual Watchdog Return-to-TV** | Trigger controlled break overlay, wait `30s` (and inject forced crash/hang fault), press Remote `Back`/`Exit`, and measure restoration latency to live broadcast. | Normal exit `<= 500ms`; forced watchdog recovery forces live TV restoration `<= 500ms`; zero stuck black screens across 25 cycles. | *(Owner measurement)* | `PENDING` | |
| **`P6-03`** | **Break Detection Latency & Lower-Bound `p10` Predictor Accuracy** | Observe live broadcaster commercial breaks (plus live sports/programme transitions) over >= 4 hours on pilot channel. | Break-entry accuracy meets threshold with zero mid-dialogue programme cutoffs; uncertain breaks cleanly skipped (`FM-05`). | *(Owner measurement)* | `PENDING` | |
| **`P6-04`** | **16:9 TV Playback, Samsung Tizen `H.264 MP4` Transcode & `-23 LUFS` Audio** | Play rendered Commercial (`Text-Only`, still slate, `H.264` transcoded WebM) and Charity Opportunity spots across Android TV, Tizen & webOS. | Zero green frames/decode stalls on Tizen; QR box inside 5%–95% overscan safe zone; measured loudness `-23 ± 1.5 LUFS`. | *(Owner measurement)* | `PENDING` | |
| **`P6-05`** | **Physical Smartphone Camera QR Scan at Living-Room Distance (`2.5m`–`4m`)** | Point real iOS native Camera and Android native Camera at `55"` / `43"` TV screen displaying `edison-demo` & `job-demo` at `2.5m` and `3.5m`. | Native camera locks & opens `/r/:token` within `<= 3.0s`; server issues `HTTP 302`; phone opens direct destination without intermediate ad screen. Log via UI `QR QA Lab`. | *(Owner measurement)* | `PENDING` | |
| **`P6-06`** | **Bundled Consent Withdrawal & Stale Epoch `HTTP 403` Revocation** | Withdraw household consent via AURA / Dashboard, then immediately scan previously displayed TV QR code with smartphone. | Both Commercial & Charity personalised slots halt immediately (`ordinaryTvPreserved: true`); phone receives `HTTP 403` revocation page within `< 1s`. | *(Owner measurement)* | `PENDING` | |
| **`P6-07`** | **Multi-Profile Isolation & Safe TV Greeting** | Switch between Adult Member A & Teen Member B PIN profiles on shared TV and trigger Opportunity highlight card. | Adult private CV/skills never leak onto TV screen; Teen PIN protects preferences cleanly. | *(Owner measurement)* | `PENDING` | |
| **`P6-08`** | **Power Loss, ISP Outage, HDMI-CEC / HDCP Fault & Recovery (`FM-01..FM-20`)** | Unplug router mid-ad, disconnect TV AC power & cycle input during HDMI-CEC test, then restore power/network. | TV boots cleanly to live broadcast (never stuck on ad UI); offline queue drains without duplicate analytics counts; HDCP drop aborts cleanly. | *(Owner measurement)* | `PENDING` | |

---

## Hardware Compatibility Ledger (Blank Until Executed)

| Device Platform | Make / Model / OS Version | Packaging Artefact Installed | Overall Outcome | Notes / Defects Found |
| :--- | :--- | :--- | :--- | :--- |
| Android TV / Google TV | *(To be filled at Stage P6)* | `org.edison.tv.companion.apk` | `PENDING` | |
| Samsung Tizen | *(To be filled at Stage P6)* | `EDISONTv01.wgt` | `PENDING` | |
| LG webOS | *(To be filled at Stage P6)* | `org.edison.webos.tv.ipk` | `PENDING` | |
| Smartphone iOS | *(To be filled at Stage P6)* | Native Camera + AURA iOS | `PENDING` | |
| Smartphone Android | *(To be filled at Stage P6)* | Native Camera + AURA Android | `PENDING` | |

---

## Final Sign-Off Gate

- **Executed By (Project Owner)**: ______________________________
- **Date**: ______________________________
- **Physical Verification Verdict**: `[ ] APPROVED FOR CONTROLLED COHORT PILOT` · `[ ] REQUIRES HARDWARE FIXES`
