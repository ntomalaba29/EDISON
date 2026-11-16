# EDISON — Privacy, Security & Consent Architecture (Pre-Commit Reconciliation)

**Document Status**: Reconciled & Locked (`v2.2` — **`DEC-OPEN-01` LOCKED BY PROJECT OWNER**: **Decision 1 = Scope B Full EDISON Model**; **Decision 2 = Bundled Consent Withdrawal** — Implemented in Track B)

---

## 1. Consent Architecture Conflict & Explicit Owner Decision (`DEC-OPEN-01`)

EDISON's Phase 1/2 baseline established **account-free viewer access** and **direct QR-to-destination `HTTP 302` routing (`ADR-002`)**. Blueprint `v2.0` introduced **household installations, multiple individual profiles, consent epochs, and server-side `HTTP 403` QR revocation**.

Rather than silently overwriting `ADR-002` or assuming viewer accounts are mandatory, this specification records all six required architectural answers and presents the competing options for explicit Project Owner selection.

### 1.1 Exact Comparison of the Six Core Consent Questions

1. **Original Approved QR Behaviour (`ADR-002`, Accepted Phase 1)**:
   - Scanning an EDISON TV QR code hits `/r/:token`, performs fast token validation + fraud/duplicate telemetry filtering, and responds immediately with `HTTP 302` straight to the advertiser's or opportunity provider's official destination—with **zero secondary mobile EDISON ad feed** and **zero viewer login wall**.
2. **Are Viewer Accounts Actually Necessary?**:
   - **Under Original Contextual Delivery**: **NO.** Pure regional/broadcast-contextual `CHARITY ADS` and `COMMERCIAL ADS` require zero viewer or household accounts.
   - **Under Multi-Profile Personalisation (`v2.0` Proposal)**: Global viewer *phone login walls for basic TV watching* are still avoidable, **but** maintaining persistent per-member work/qualification profiles inside one shared TV requires **at least a Household/TV Installation Registration identifier plus per-profile access isolation (PIN or mobile profile session)** so one household member cannot read another member's private profile.
3. **How Household Consent Differs From Individual Personalisation Consent**:
   - **Household / TV Consent**: Applies to the television device/installation as a whole (whether EDISON displays commercial breaks, charity opportunities, and device telemetry).
   - **Individual Personalisation Consent**: Applies per person inside the household (whether EDISON may match `CHARITY ADS` against *their* voluntary profile and show `"Malaba, this is for you!"` on the shared TV screen without shutting down EDISON for other consented household members).
4. **How Consent Withdrawal Affects Charity Ads, Commercial Ads & Opportunities**:
   - **Commercial Ads**: Stops EDISON commercial / ad-network delivery (and ad telemetry) for the withdrawn household/TV immediately.
   - **Individual Personalisation**: Stops named TV greetings and profile-targeted matching for that person immediately (falling back to neutral unpersonalised display).
   - **Generic / Contextual Opportunities (`CHARITY ADS`) — Open Sub-Question (`ADR-006`)**: Should withdrawing commercial advertising consent **also pause all generic `CHARITY ADS` on that TV** (strict bundled household stop), OR should unpersonalised contextual `CHARITY ADS` remain deliverable when only Commercial Advertising consent is withdrawn (`ADR-006` legal/ethical unbundling)?
5. **How QR Links Become Invalid After Withdrawal (`HTTP 403` vs Static `302`)**:
   - **Original `ADR-002` Model**: Campaign/opportunity tokens (`/r/:token`) invalidate only when an ad campaign expires, is suspended, or fails moderation (`410/404`)—a global campaign QR code cannot distinguish individual household withdrawal unless bound per household.
   - **Blueprint `v2.0` Epoch Model**: Every rendered TV QR token embeds/references `{ targetId, householdId, consentEpoch }`. Withdrawing household consent increments `consentEpoch` immediately server-side, causing `/r/:token` requests from previously photographed/saved TV QRs of that epoch to fail with **`HTTP 403`** while leaving live television unaffected.
   - **Technical Trade-Off**: Epoch revocation guarantees previously captured QR links stop resolving after withdrawal, **but requires dynamic per-household/per-epoch QR generation** (or signed TV playback tokens) rather than static campaign-wide QRs.
6. **How Consent Is Maintained Without Creating an Unwanted Intermediate Advertising Feed**:
   - Consent toggling lives strictly inside the **TV Settings / Household Companion Settings portal** (or an explicit *Manage TV Privacy* QR/menu entry)—**never** injected ahead of commercial or opportunity QR scans.
   - Commercial QRs continue direct `HTTP 302` passthrough (`ADR-002`). For `CHARITY ADS`, either direct `HTTP 302` to the verified application URL continues, **or** (only if multi-profile Save/Dismiss is approved) a strictly non-commercial **pure Opportunity Card** (`Apply + Save + Dismiss`, zero ads) opens before tapping Apply.

---

### 1.2 Locked Owner Decision (`DEC-OPEN-01`: Scope B Full Model + Bundled Withdrawal)

| Option | Architecture Summary | Consequences & Trade-Offs | Consent / Profile Impact |
| :--- | :--- | :--- | :--- |
| **Option A — Pure Account-Free Contextual Baseline (`ADR-002` + `ADR-006`)** | Zero household registrations, zero individual TV profiles, global/regional contextual breaks (`CHARITY -> COMMERCIAL`), device-local opt-out toggle, direct `HTTP 302` on all QR scans. | Fastest, simplest, zero intra-household privacy/account liability; cannot address individuals by name or selectively return `HTTP 403` per withdrawn household. | Not selected |
| **Option B — Full Dual-Layer Household + Profiles + Epoch `HTTP 403` + Bundled Withdrawal (`LOCKED` / `IMPLEMENTED`)** | Household TV registration (Zimbabwe-first + international 7-level private geo hierarchy) + multi-member voluntary profiles with optional `scrypt` PIN isolation + separated Household vs Individual consent + per-household `consentEpoch` QR binding (`HTTP 403` on withdrawal or stale epoch) + bundled withdrawal suspending commercial ads, charity ads, opportunities & personalisation while keeping ordinary TV usable. | Delivers personalised TV opportunity matching (`required`/`preferred`/`optional` criteria), strong post-withdrawal `HTTP 403` enforcement with `Cache-Control: no-store, private`, and strict advertiser privacy isolation (`403` on `/api/households*`, aggregate counts only). | **LOCKED & IMPLEMENTED IN TRACK B** |
| **Option C — Hybrid Two-Tier Opt-In** | Account-free contextual default plus explicit opt-in households/profiles. | Doubles branching across scheduler and QR endpoints. | Not selected |

> **Locked Implementation Controls (`DEC-OPEN-01`)**:
> 1. Withdrawing household commercial advertising consent increments `consentEpoch`, sets `commercialConsentStatus: 'withdrawn'` and `charityAndOpportunityStatus: 'suspended_by_bundled_withdrawal'`, disables affected personalisation, revokes active `hqr_*` tokens so `/r/:token` responds with **`HTTP 403`** and `Cache-Control: no-store, private`, suspends break scheduling (`adDeliverySuspended: true`) and preload delivery manifests, and preserves ordinary TV & `AURA` remote operation (`ordinaryTvPreserved: true`).
> 2. Explicit restoration requires `explicitConfirmation: true` plus an audited reason, increments `consentEpoch` again so pre-withdrawal QR tokens remain permanently blocked (`HTTP 403`), and writes immutable entries to `consentAuditEvents` and `auditLogs`.

---

## 2. Non-Negotiable Privacy & Security Rules

1. **On-TV Screen Safety**: **Never** render qualifications, employment history, trade credentials, exact age, or private contact details on TV screens—TV banners display only preferred first/display names (`single_named`, `multi_named`) or neutral household prompts (`neutral_shared`).
2. **Zero Advertiser Access to Viewer/Household Data**: Advertisers and opportunity submitters **must never** browse household profiles or obtain exact residential addresses/coordinates (`HTTP 403` on household/member routes); advertisers receive **aggregate consented counts by coarse area only** (`/api/advertiser/targeting-aggregates`).
3. **Zero PII in URLs, QR Tokens, Logs & Analytics**: Private profile attributes and exact household coordinates must never be embedded in QR query strings, server access logs, or analytics payloads.
4. **No Camera / Microphone Attention Tracking**: Prohibited by default.
5. **Core Technical Security Controls**: RBAC (`admin`, `advertiser`, `opportunity_submitter`, `household_viewer`), optional per-member `scrypt` PIN isolation, magic-byte upload inspection, SVG/HTML XSS upload blocking, SSRF-safe HTTP fetchers, `Secure` production cookies, CSRF/Origin guards, and immutable audit logs.
