# EDISON — Advertising & QR Code System

**Document Status**: Updated Specification (`v2.2` — preserves direct `302` for commercial destinations and records owner-approved Track B consent/epoch behavior; current implementation evidence is in [`EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md`](EDISON_AI_STUDIO_HANDOFF_AND_EXECUTION_PLAN.md))

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

## 3. Owner-Approved Consent-Epoch Extension (`DEC-OPEN-01 — RESOLVED`)

The Project Owner selected Scope B and bundled withdrawal on 2026-11-16. The following behavior is implemented in the software prototype; it is not a production or legal-compliance certification:

1. **Household, Consent-Epoch & Expiry Binding**: QR validation checks the approved target/household/epoch binding. Withdrawal revokes prior epoch-bound tokens with `HTTP 403`; expiry/removal remains a distinct inactive-resource response.
2. **Bundled Withdrawal**: Withdrawing commercial advertising consent also suspends charity advertising, opportunity access, personalisation, and active QR tokens while preserving ordinary TV operation. Restoration requires explicit opt-in.
3. **Direct Destination and Privacy Boundary**: Commercial QR scans continue to route directly to the advertiser's destination. Private profile attributes and exact household coordinates must never appear in QR URLs, token strings, server URL logs, or advertiser reports.
4. **Open detail**: Preserve any separately unresolved viewer-facing opportunity-card details in `DECISIONS_LOG.md`; do not infer them from the consent decision.
