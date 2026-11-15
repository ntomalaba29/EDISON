# EDISON — Privacy, Security & Consent Architecture (Pre-Commit Reconciliation)

**Document Status**: Reconciled Specification (`v2.1` — Explicitly Exposes Consent Architecture Conflict as **`[UNRESOLVED OWNER DECISION: DEC-OPEN-01]`** — **DO NOT IMPLEMENT CONSENT/PROFILE/EPOCH-403 FEATURES UNTIL OWNER APPROVES AN OPTION**)

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

### 1.2 Competing Design Options for Owner Selection (`[UNRESOLVED — DO NOT IMPLEMENT UNTIL APPROVED]`)

| Option | Architecture Summary | Consequences & Trade-Offs | Consent / Profile Impact |
| :--- | :--- | :--- | :--- |
| **Option A — Pure Account-Free Contextual Baseline (`ADR-002` + `ADR-006`)** | Zero household registrations, zero individual TV profiles, global/regional contextual breaks (`CHARITY -> COMMERCIAL`), device-local opt-out toggle, direct `HTTP 302` on all QR scans. | Fastest, simplest, zero intra-household privacy/account liability; **cannot** address individuals by name (`"Malaba, this is for you!"`), cannot store multi-member CV/skills on TV, and cannot selectively return `HTTP 403` for a withdrawn household's old photo of a shared QR. | **Lowest complexity / Zero viewer accounts** |
| **Option B — Full Dual-Layer Household + Profiles + Epoch `HTTP 403` (`Blueprint v2.0` Full Proposal)** | Household TV registration (7-level private geo) + multi-member voluntary profiles + separated Household vs Individual consent + per-household `ConsentEpoch` QR binding (`403` on withdrawal) + isolated mobile Opportunity Card (`Save`/`Dismiss`). | Delivers full personalised TV opportunity matching, strong post-withdrawal `HTTP 403` QR enforcement, and strict household data isolation; introduces household registration state, profile PIN/session security, dynamic per-epoch QR signing, and slightly higher UX setup on mobile/TV. | **Highest personalisation & post-withdrawal control; requires household/profile state** |
| **Option C — Hybrid Two-Tier Opt-In (Contextual Direct `302` Default + Optional Opt-In Household/Profiles)** | Default TV mode remains 100% account-free contextual with pure `ADR-002` direct `HTTP 302`; households that **explicitly opt in** unlock Household + Multi-Profile Personalisation with epoch-scoped QR validation (`HTTP 403` on withdrawal). | Preserves frictionless `ADR-002` zero-account onboarding while supporting full Blueprint `v2.0` personalisation & epoch revocation for opt-in households; doubles branching in break scheduler & QR endpoint (contextual vs epoch-bound paths). | **Preserves `ADR-002` baseline + adds opt-in profiles (`Moderate complexity`)** |

> **Governance Lock**: Implementation of **household registrations, 7-level private household coordinates, multi-profile personalisation matching, named TV greetings, consent epochs, and `HTTP 403` QR invalidation** is **`BLOCKED`** until the Project Owner explicitly chooses Option A, B, or C under **`DEC-OPEN-01`**.

---

## 2. Non-Negotiable Privacy & Security Rules (Apply Regardless of Option Chosen)

1. **On-TV Screen Safety**: Even if Option B or C is approved, **never** render qualifications, employment history, trade credentials, exact age, or private contact details on TV screens.
2. **Zero Advertiser Access to Viewer/Household Data**: Advertisers and opportunity submitters **must never** browse household profiles or obtain exact residential addresses/coordinates; advertisers receive **aggregate campaign metrics only**.
3. **Zero PII in URLs, QR Tokens, Logs & Analytics**: Private profile attributes and exact household coordinates must never be embedded in QR query strings, server access logs, or analytics payloads.
4. **No Camera / Microphone Attention Tracking**: Prohibited by default.
5. **Core Technical Security Controls**: RBAC (`admin`, `advertiser`, `opportunity_submitter`), magic-byte upload inspection, SVG/HTML XSS upload blocking, SSRF-safe HTTP fetchers, `Secure` production cookies, CSRF/Origin guards, and immutable audit logs.
