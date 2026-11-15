# EDISON — System Architecture

**Document Status**: Reconciled Architecture (`v2.2` — Adds Mandatory Core Network-Wide Shared Ad Intelligence Loop Alongside Existing `v2.1` Domains; Cleanly Separates Implemented Baseline, Unblocked Work & Consent-Blocked `DEC-OPEN-01` Proposals)

---

## 1. Bounded Domain Matrix & Current Readiness

| # | Bounded Domain Responsibility | Current Prototype State | Target / Blocker Status |
| :-: | :--- | :--- | :--- |
| 1 | **Charity Advertisement Management** | Partial (`OpportunityView` / `store.ts` v6) | **UNBLOCKED** (`$0.00` Charity billing lock + extended job/community categories ready to implement post-commit) |
| 2 | **Commercial Campaign Management** | Partial (10-state campaigns + Banner/Video Option A/B) | **UNBLOCKED** (`Text-Only` commercial format ready to implement post-commit) |
| 3 | **Inventory & Alternating Break Scheduler** | Not yet implemented (`TvPreviewView` runs single-ad sim) | **PARTIALLY UNBLOCKED** (Core `CHARITY -> COMMERCIAL` alternation + Direct-Paid priority unblocked; personalised profile inputs wait on `DEC-OPEN-01`) |
| 4 | **Advertising-Network Adapters** | Not yet implemented (Google CTV docs researched) | **INTERFACE UNBLOCKED / LIVE GAM ACCOUNT UNRESOLVED** (`AdNetworkAdapter` mockable in P2; GAM CTV account & non-video format support `[UNRESOLVED DEC-OPEN-03]`) |
| 5 | **Analytics & Financial Reconciliation** | Partial (7-stage funnel in `store.ts`) | **UNBLOCKED** (Charity / Direct / Network Estimated vs Confirmed vs Received ledger separation ready) |
| 6 | **TV Playback Simulation & Restoration** | Simulator only (`SimulationTvAdapter`) | **SOFTWARE-FIRST ACTIVE** (Physical TV verification locked to **single final `Stage P6` test** after completion) |
| 7 | **Network-Wide Shared Ad Intelligence (`v2.2`)** | **NOT STARTED** (`v2.2` Approved Core Requirement) | **APPROVED CORE REQ / NOT STARTED** (Targeted for Phase 5 software implementation: Central Shared Intelligence Service + Sync + Scoped Local Intelligence Cache) |
| 8 | **Household & 7-Level Private Geo Registry** | Not yet implemented | **`BLOCKED — AWAITING DEC-OPEN-01`** (Owner must choose Option A / B / C before implementation) |
| 9 | **Individual Profiles per TV** | Not yet implemented | **`BLOCKED — AWAITING DEC-OPEN-01`** |
| 10 | **Personalised Opportunity Matching Engine** | Not yet implemented | **`BLOCKED — AWAITING DEC-OPEN-01`** |
| 11 | **Dual-Layer Consent & Epoch `403` QR Gate** | Not yet implemented (`ADR-002` `302` active now) | **`BLOCKED — AWAITING DEC-OPEN-01`** |

---

## 2. Network-Wide Shared Ad Intelligence Topology (`v2.2` Approved Requirement — `NOT STARTED`)

```text
+-----------------------------------------------------------------------------+
|                    CENTRAL SHARED INTELLIGENCE SERVICE                      |
|  * Ingests authenticated non-PII technical break observations               |
|  * Validates channel/broadcaster/country/platform/config metadata           |
|  * Enforces multi-TV corroboration (single TV NEVER auto-promotes)          |
|  * Detects conflicts/anomalies, computes confidence & freshness TTL         |
|  * Publishes signed, versioned intelligence bundles & rollback pointers     |
+--------------------------------------+--------------------------------------+
                                       | Network Synchronisation
                                       | (Device-Attested TLS · Background Pull/Push · Offline Queue)
+--------------------------------------v--------------------------------------+
|                         PARTICIPATING SMART TV NODE                         |
|                                                                             |
|  +---------------------------+     +-------------------------------------+  |
|  | Local Intelligence Cache  |<--->| Local Commercial-Break Intelligence |  |
|  | * Compatibility-filtered  |     | * Break cues, timing & A/V features |  |
|  | * Offline-capable         |     | * Queues observations while offline |  |
|  | * Atomic swap & rollback  |     | * Measures prediction accuracy       |
|  +-------------+-------------+     +------------------+------------------+  |
|                |                                      |                     |
|                +------------------+-------------------+                     |
|                                   v                                         |
|                     +---------------------------+                           |
|                     |   EDISON Control Engine   |                           |
|                     |  * Safety budget math     |                           |
|                     |  * Break Scheduler & Skip |                           |
|                     +-------------+-------------+                           |
|                                   |                                         |
|                                   v                                         |
|                     +---------------------------+                           |
|                     |    TV Platform Adapters   |                           |
|                     | * SimulationTvAdapter (P2)|                           |
|                     | * Android TV / Tizen/webOS|                           |
|                     +---------------------------+                           |
+-----------------------------------------------------------------------------+
```

### Component Interaction Responsibilities
1. **Local Commercial-Break Intelligence**: Detects lawful cues/patterns locally, logs transition outcomes & errors cleanly without PII, and supplies real-time break predictions to the **EDISON Control Engine**.
2. **Central Shared Intelligence Service**: Corroborates independent device reports across the fleet, filters out bad actors/false positives, versions verified rules, and tracks decay/reliability.
3. **Network Synchronisation**: Uploads queued non-PII observations and fetches compatible signed delta updates strictly in the background so playback never pauses or drops frames.
4. **Local Intelligence Cache**: Persists versioned rules scoped strictly by `(country, broadcaster, channel, platform, broadcastConfig)`, serves offline breaks safely, and automatically rolls back to the prior verified version if post-update accuracy degrades or signatures fail.
5. **EDISON Control Engine**: Evaluates break safety equations (`ADR-005`), invokes the Alternating Scheduler (`CHARITY -> COMMERCIAL`), and guarantees immediate return to live TV.
6. **TV Platform Adapters**: Encapsulates platform-specific playback, switch latency reporting, and decoder capabilities (`SimulationTvAdapter` during software development; single `Stage P6` check on real hardware).

---

## 3. Verified Google Ad Manager / CTV Format Findings (`[VERIFIED FROM DOCS + UNRESOLVED GAPS]`)

- `[VERIFIED FROM OFFICIAL GOOGLE DOCS]`: Standard **Google AdSense** and **AdSense for Video (AFV)** are not compliant native Smart TV solutions. Compliant Google CTV integration requires **Google Ad Manager (GAM)** + **Google IMA SDK** (`Android TV` native; `Tizen/webOS` HTML5/DAI).
- **`[UNRESOLVED — GAM CTV FORMAT & ACCOUNT ELIGIBILITY]`**:
  1. EDISON does not yet have an approved GAM CTV publisher account.
  2. Standard CTV VAST video players typically ignore companion HTML display banners and do not support native text-only third-party network units without custom wrappers (`DEC-OPEN-03`).

---

## 4. Architectural Separation Guarantees

- Keep all campaign, opportunity, moderation, and profile management in web/mobile/admin interfaces; keep the Smart TV layer thin (`TvPlaybackAdapter`).
- Never schedule two consecutive same-category ads in a break.
- Direct-Paid commercial campaigns always outrank `AdNetworkAdapter` backfill.
- Never leak household member names, credentials, personal viewing histories, or coordinates to advertiser endpoints, Shared Intelligence payloads, QR URLs, or logs.
