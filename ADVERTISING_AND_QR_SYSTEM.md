# EDISON — Advertising & QR Code System

**Document Status**: Updated Specification (`v2.1` — Preserves Verified Phase 1/2 Direct `302` QR Baseline `ADR-002`; Flags Epoch-Bound `403` Revocation & Multi-Profile Mobile Card as **`[PENDING DEC-OPEN-01]`**)

---

## 1. Supported QR Destination Categories

1. Official Website (`https://...`)
2. Product or Service Page (`https://...`)
3. Online Store / Checkout Page (`https://...`)
4. WhatsApp Conversation (`https://wa.me/<e164>?text=...`)
5. Telephone Number (`tel:+<e164>`)
6. Enquiry Form (`https://...`)
7. Job Application (Formal or Verified Informal Employer Contact/Form)
8. Scholarship / School / University Admissions Page (`https://...`)
9. Apprenticeship / Training / Professional Development / Conference Page (`https://...`)
10. Community / Public-Benefit / Grant / Tender Page (`https://...`)
11. Other Approved Legitimate Destinations

---

## 2. Current Verified QR Behaviour (`ADR-002` — Implemented in Blocks 2.1–2.7)

1. **Scheme & Anti-Phishing Validation**: Allow `https://`, `tel:`, and normalised `wa.me` (`http://` flagged/upgraded); reject `javascript:`, `data:`, `vbscript:`, `file:`, raw IP literals, and opaque shorteners unless resolved. Always display exact resolved domain in Pre-Submit and Admin Review.
2. **Direct-to-Destination Routing (`/r/:token`)**: Validates campaign/opportunity active status, records `redirect_requested` and `redirect_issued` separately with bot/prefetch filtering & deduplication, and issues **`HTTP 302`** straight to the advertiser's or opportunity provider's official destination—**never an intermediate EDISON advertising feed**. Never conflates `302` with `destination_opened` or verified conversion.
3. **Campaign/Opportunity Expiry Enforcement**: Expired or suspended campaigns/opportunities fail validation and stop redirecting (`HTTP 410 / 404`).

---

## 3. Proposed Extensions Pending Consent Architecture Decision (`DEC-OPEN-01`)

The following Blueprint `v2.0` proposals are **NOT YET APPROVED OR IMPLEMENTED** and depend on Owner selection in `PRIVACY_SECURITY_AND_COMPLIANCE.md` (`DEC-OPEN-01`):

1. **Household, Consent-Epoch & Expiry Binding (Proposed Option B/C)**:
   - If epoch-scoped QRs are approved under Option B or Option C, TV playback QR tokens will carry server-validated binding to `{ targetId, householdId, consentEpoch, expiresAt }`.
   - Withdrawing household consent increments `consentEpoch`, causing `/r/:token` scans of saved/photographed QR codes from withdrawn epochs to return **`HTTP 403`**, cleanly distinct from expired/removed campaigns (`HTTP 410/404`).
   - Under **Option A** (preserving pure account-free global QRs), `/r/:token` remains purely campaign/expiry-scoped (`302` vs `410/404`) without household accounts or per-household epochs.
2. **Mobile Opportunity Handoff Mode (Direct `302` vs Pure Non-Ad Opportunity Card)**:
   - **Commercial Ads**: Always direct `HTTP 302` to the advertiser's destination regardless of option.
   - **Charity Opportunities**: Either direct `HTTP 302` to the official employer/provider link (**Option A**) OR an authenticated/profile-isolated non-commercial Opportunity Card showing eligibility criteria, verification tier badge, plain-language match summary (`Save` / `Dismiss`), and external Apply link without exposing other household members' data (**Option B/C**).
3. **Absolute Privacy Boundary**: Even if multi-profile QRs are approved, private profile attributes, qualifications, names, and exact household coordinates must **never** appear in QR URLs, token strings, server URL logs, or advertiser reports.
