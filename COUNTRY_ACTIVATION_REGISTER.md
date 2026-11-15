# EDISON — Country Activation Register

**Independent Legal Research Policy (`[NO LEGAL COUNSEL DEPENDENCY]`)**:
- EDISON **independently researches applicable country legal, privacy, broadcasting, advertising, recruitment, and tax requirements using official public legislation, statutory texts, and published government/regulator guidance**.
- **Lawyers, external legal consultations, and third-party legal sign-offs are NOT a development dependency.** Development, testing, and architectural engineering proceed based on documented public statutory obligations and strict technical risk-minimisation controls.
- **Honesty & Boundary Rule**: Technical safeguards and public regulatory research do **not** constitute formal legal advice or a claim of verified legal compliance (`ZERO LEGAL COMPLIANCE CLAIMED`). Production commercial activation in any jurisdiction remains explicitly marked `NOT ACTIVATED` until all technical restrictions and public statutory requirements for that market are resolved.

---

## Representative Country Statutory & Technical Matrix

| Jurisdiction (Baseline) | Identified Public Statutory Requirements *(Official Government / Regulator Sources)* | Technical Restrictions Implemented / Planned | Unresolved Regulatory Uncertainty *(Zero Legal Compliance Claimed)* | Activation Status |
| :--- | :--- | :--- | :--- | :--- |
| **United Kingdom** | UK GDPR & PECR (Reg. 6 terminal-equipment storage consent), ASA/CAP/BCAP Codes, Employment Agencies Act 1973 (ban on job-seeker placement fees), DMCC Act 2024, Ofcom broadcasting rules, HMRC VAT. | `$0.00 / FREE` viewer & employer Charity rules, explicit upfront-fee scam rejection (`Tier 3 QA`), `ADR-002` direct QR routing, country-level consent-policy flags (`CMP/TCF` support planned). | Exact Ofcom/PECR classification for HbbTV vs Android TV linear break insertion (`ADR-001`); whether PECR permits unbundled non-personalised `CHARITY ADS` after commercial consent withdrawal (`DEC-OPEN-01` / `ADR-006`). | **NOT ACTIVATED** |
| **European Union (Representative: DE / FR / IE)** | GDPR & ePrivacy Directive Art. 5(3) (TV storage/identifier access), Digital Services Act (DSA), AVMSD (signal integrity & split-screen rules), national labour placement laws, UCPD, EECC, EU OSS VAT. | Pseudonymous identifier treatment (never framed as anonymous), explicit ad vs editorial labelling, strict Ban on modifying/covering third-party broadcaster feeds (`ADR-001`), per-country policy toggle hooks. | National media authority interpretation of broadcaster signal-integrity rules under AVMSD Art. 7b; GDPR strict unbundling of free opportunities from commercial consent (`DEC-OPEN-01`). | **NOT ACTIVATED** |
| **United States** | State privacy statutes (e.g. CCPA/CPRA opt-out signals), Video Privacy Protection Act (**VPPA** — 18 U.S.C. § 2710 video-viewing disclosure limits), FTC Truth-in-Advertising, federal/state EEO employment rules, TCPA (for `tel:`/`wa.me:` follow-ups), FCC / ATSC 3.0 rules. | Prohibition on exposing viewer/household watch history, qualifications, or coordinates to advertisers/third parties; explicit EEO/non-guarantee disclaimers on all opportunity listings. | State-by-state opt-out mechanisms vs VPPA consent semantics if any third-party ad network SDK (`GAM/IMA`) receives content context metadata. | **NOT ACTIVATED** |
| **South Africa** | **POPIA** (lawful processing conditions & cross-border controls), ARB Code of Advertising Practice, Employment Services Act 2014 (private employment agency duties / zero worker fee ban), CPA, ECA / ICASA broadcasting rules, SARS VAT. | Zero applicant fees (`$0.00`), transparent 3-tier verification separation, regional data-minimisation controls, private household geo coordinates isolated from advertisers. | Scope of Employment Services Act registration thresholds for free broadcast opportunity intermediaries vs employers. | **NOT ACTIVATED** |
| **Kenya / Nigeria (Representative Expansion)** | Kenya Data Protection Act 2019 / Nigeria NDPA 2023, ARCON (Nigeria advertising pre-vetting rules) / Kenyan advertising rules, national labour-ministry recruitment notices, CA Kenya / NCC Nigeria, VAT / Digital Service Tax. | Mandatory admin pre-approval queue before broadcast, verified physical QR destination preview, `$0.00` Charity tier, explicit `UNVERIFIED` / `Tier 1–3` badges. | Statutory pre-vetting rules (e.g. Nigeria ARCON) for third-party TV ad networks (GAM/VAST) vs direct-moderated EDISON spots. | **NOT ACTIVATED** |

---

## Mandatory Pre-Launch Verification Rule (Software & Governance)

1. Identify applicable public statutes and official regulator publications for the target country.
2. Map each statutory constraint to concrete software restrictions (`Privacy by Design`, `$0` Charity guarantees, direct QR routing, signal-integrity prohibition, fraud/scam filters).
3. Record any remaining interpretive ambiguity transparently under **Unresolved Regulatory Uncertainty**—never mark a market compliant prematurely and never block software engineering waiting on external legal opinions.
