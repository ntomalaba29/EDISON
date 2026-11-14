# EDISON — Deferred Open-Source Repository Research Plan

**Document Status**: `DEFERRED` (Documentation Record Only)  
**Target Repository**: `Malaba29/EDISON-International-Smart-TV-Advertising-Network-`  
**Applicable Future Phases**: Phase 4 (Smart TV Feasibility and Integrations) & Phase 5 (Commercial-Break Detection and Prediction)  
**Recorded Date**: 2026-11-14

> **DEFERRED RESEARCH NOTICE — STRICT EXECUTION BOUNDARY**
>
> - **Status**: `DEFERRED`
> - **No cloning now**
> - **No implementation now**
> - **No repository modifications beyond this documentation record**
> - **No integration now**
> - **Trigger Condition**: Research begins **only** when the relevant EDISON development phase (Phase 4 / Phase 5) is formally reached and explicitly authorised by the Project Owner.

---

## 1. Purpose

This document permanently records EDISON's deferred open-source repository research shortlist covering:

1. **TV remote-control communication and switching approaches** (Category A — 9 repositories).
2. **Advertising intelligence and commercial-break detection approaches** (Category B — 5 repositories).

This record preserves the research scope across accounts and sessions without initiating premature cloning, testing, code modification, or architectural rework during Phase 2 prototype delivery.

---

## 2. Candidate Repositories (14 Total Entries)

### A. TV Remote-Control Repositories (9 Entries)

| # | Repository Name | Repository URL | Research Priority | Notes |
| :-: | :--- | :--- | :--- | :--- |
| 1 | **OpenTV-Remote** | https://github.com/levhakobyan/OpenTV-Remote | **Primary Shortlist** | Remote-control protocol / communication study |
| 2 | **Webmote** | https://github.com/maxhayim/webmote | Secondary | Remote-control architecture study |
| 3 | **Remo** | https://github.com/FlyingCow/remo | **Primary Shortlist** | Remote-control communication study |
| 4 | **Smart-TV-Remote-Control** | https://github.com/mazen-salah/Smart-TV-Remote-Control | **Primary Shortlist** | Smart TV remote-control study |
| 5 | **Legvan TV Remote** | https://github.com/Legvan/tv-remote | Secondary | TV remote control study |
| 6 | **AltRemote** | *(URL not supplied in brief — verify during authorised research phase)* | Secondary | Included per owner research list |
| 7 | **Open TV Remote — multi-brand reference** | *(URL not supplied in brief — verify during authorised research phase)* | Secondary | Multi-brand reference study |
| 8 | **LG WebOS Remote Control** | *(URL not supplied in brief — verify during authorised research phase)* | Secondary | LG webOS remote protocol reference |
| 9 | **PK Remote** | *(URL not supplied in brief — verify during authorised research phase)* | Secondary | Included per owner research list |

#### Primary Research Shortlist (Category A)

1. **Smart-TV-Remote-Control** (`https://github.com/mazen-salah/Smart-TV-Remote-Control`)
2. **OpenTV-Remote** (`https://github.com/levhakobyan/OpenTV-Remote`)
3. **Remo** (`https://github.com/FlyingCow/remo`)

---

### B. Advertising Intelligence and Commercial-Break Detection Repositories (5 Entries)

| # | Repository Name | Repository URL | Focus Area |
| :-: | :--- | :--- | :--- |
| 10 | **AdHush** | https://github.com/socrtwo/adhush | Commercial/ad detection and muting/suppression patterns |
| 11 | **TV Commercial Break Detector** | https://github.com/nicolasrondan/tv_commercial_break_detector | Television commercial-break detection pipeline |
| 12 | **Sports Broadcast Commercial Detector** | https://github.com/scottn12/Sports-Broadcast-Commercial-Detector | Broadcast stream commercial boundary detection |
| 13 | **Audio Ad Detection** | https://github.com/abdullaabdullazade/audio-ad-detection | Audio-based advertisement detection approach |
| 14 | **HLS SCTE-35 Monitoring** | https://github.com/ggouzi/HLS-SCTE35-monitoring | HLS SCTE-35 cue/marker inspection and monitoring |

*Total Recorded Repositories*: **14** (9 TV remote-control entries + 5 advertising intelligence and commercial-break detection entries).

---

## 3. Future Research Requirements (When Authorised)

When EDISON reaches the appropriate authorised development phase (Phase 4 for Smart TV control / switching feasibility and Phase 5 for commercial-break detection), inspect each repository systematically across all seven criteria below:

1. **Actual source code and detection/control methods**: Read the implementation directly (protocols, pairing/authentication handshakes, input/channel state queries, audio/video/SCTE-35 classifiers, latency characteristics).
2. **Licence and legal reuse permissions**: Identify open-source licences (MIT, Apache-2.0, GPL/AGPL copyleft obligations, undocumented proprietary protocol reverse-engineering risks, patent/DMCA considerations).
3. **Maintenance, contributors and recent activity**: Check commit history, active maintainers, issue backlog, deprecation notices, and target OS/runtime age.
4. **Technical compatibility with EDISON**: Evaluate fit against EDISON's target Smart TV environments, timing budgets, safety buffers, and restoration reliability rules.
5. **Dependencies and security considerations**: Audit third-party packages, network exposure (e.g., LAN pairing tokens, TLS/WS auth, unencrypted TV sockets), and privilege requirements.
6. **Potential integration or adaptation**: Determine whether concepts, protocols, or standalone modules can inform EDISON's architecture cleanly or whether legal/technical reuse is unsuitable.
7. **Limitations and independent development scope**: Document gaps that must be engineered independently inside EDISON (including fail-safe recovery, safety-buffer verification, multi-TV reliability, and privacy compliance).

> **Evidence Rule**: Do **not** assume that a repository's README, title, or description proves its functionality. Every claim must be verified against actual source code and, later, physical hardware testing.

---

## 4. EDISON's Intended Workflow & Target Architecture Context

### 4.1 Intended Core Control Workflow

```text
Detect opportunity -> Switch to EDISON -> Display advertisement -> Restore original programme
```

- The TV control layer must support the intended EDISON advertising experience and **restore the viewer's previous programme, channel, or input wherever technically supported**.
- Consistent with `FAILURE_MODE_ANALYSIS.md` and `DECISIONS_LOG.md` (`ADR-005`), ordinary television viewing must remain protected and recoverable if detection is uncertain or switching fails.

### 4.2 Target Smart TV Categories

- **Android TV / Google TV**: Intelligence and control.
- **Samsung Tizen**: Advertising display and supported switching.

### 4.3 Aura Integration Intent

- **Aura** is intended to be integrated into EDISON's remote/control layer. Specific integration mechanics remain deferred until the authorised TV-control research and architecture design phase.

---

## 5. Architectural Restrictions

The following constraints govern this deferred research plan:

1. **Preserve existing EDISON architecture and decisions**: Keep Phase 1/2 specifications, `DECISIONS_LOG.md`, and sequential prototype/production governance intact.
2. **Do not introduce manufacturer APIs as the foundation**: The established direction is to investigate existing open-source projects and remote-control communication approaches rather than building EDISON's core foundation on manufacturer APIs.
3. **Do not conflate remote apps with TV controllers**: Do **not** assume that phone-to-TV remote-control software automatically provides a TV-side advertising controller, input-state guarantor, or broadcast-safe switch engine.
4. **Strict scope containment**: Do **not** expand this documentation record into software implementation, cloning, prototyping, or architectural redesign.

---

## 6. Deferred Execution Governance Checklist

- [x] Research plan permanently recorded in `docs/research/EDISON_OPEN_SOURCE_REPOSITORY_RESEARCH_PLAN.md`
- [x] All 14 candidate repositories recorded with exact supplied URLs and Category A shortlist
- [x] Future source-code/licence/compatibility/security research criteria defined
- [x] Intended workflow (`Detect opportunity -> Switch to EDISON -> Display advertisement -> Restore original programme`), target TV categories, and Aura role documented
- [x] Architectural restrictions explicitly preserved
- [x] Status explicitly locked as **DEFERRED** (no cloning, no code implementation, no integration, no unrelated repository edits)
