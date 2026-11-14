# EDISON — Opportunity Management & Verification System

**Document Status**: Phase 1 Specification

---

## 1. Covered Opportunity Categories

- **Employment**: Permanent, Temporary, Part-Time, Contract, Informal/Individual Employer Roles (explicitly included when verified).
- **Career & Education**: Internships, Apprenticeships, Scholarships, Education Opportunities, Training Programmes, Workshops & Seminars.
- **Funding & Commerce**: Grants, Tenders, Legitimate Business Opportunities.

---

## 2. Three-Tier Verification Model (Mandatory Separation)

1. **Identity Verified**: Confirms the human submitter's identity (government ID / KYC check in production; structured attestation & ID reference in prototype).
2. **Organisation Verified**: Confirms legal registration or verifiable community/trade presence where submitting on behalf of an entity. (Individual/informal employers can pass Tier 1 + Tier 3 without being auto-rejected for lacking corporate registration.)
3. **Specific Opportunity Verified**: Confirms the *actual vacancy, scholarship, grant, or tender* is real and open—via supporting evidence (official letterhead, published tender/grant notice, company portal URL match, signed employer declaration, or callback verification).

**Non-Transitivity Rule**: Verifying an organisation (`Tier 2`) does **not** automatically mark a specific vacancy (`Tier 3`) as verified.
**Financial Independence Rule**: Paying an advertising fee **never** influences verification status or bypasses moderation.

---

## 3. Moderation, Expiry, Complaints & Appeals

- **Submission Fields**: Category, Employer/Provider, Title, Description, Location, Eligibility Requirements, Closing Date, Application Method, Supporting Evidence attachments, Contact Info, QR Destination, Expiry Date.
- **Automated Expiry**: Opportunities automatically transition to `expired` when `closing_date` or `expiry_date` passes; expired opportunities must never be scheduled for TV playback.
- **Viewer Protection Rules**:
  - Viewers are **never** charged to scan QR codes or apply.
  - Listings must never promise guaranteed employment, funding, or acceptance.
  - Upfront-fee job scams ("pay to apply / pay for uniform processing") trigger immediate rejection/suspension.
- **Complaints, Investigation & Appeals**:
  - Dedicated reporting flow allowing viewers/applicants to flag suspicious, expired, or deceptive opportunities.
  - Admin investigation states (`reported` -> `under_investigation` -> `suspended` / `cleared` / `revoked`).
  - Formal **Appeal** workflow allowing submitters to provide additional evidence if rejected or suspended.
