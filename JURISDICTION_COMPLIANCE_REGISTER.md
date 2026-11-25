# Jurisdiction Compliance Considerations Register

> **Internal working register — not legal advice, a legal opinion, or a compliance certification.** The entries below are issue-spotting notes carried forward from the project. They are not a complete or current analysis of any jurisdiction. The owner must have qualified counsel verify applicable law, regulator requirements, product classification, and required registrations before offering the service.

## Release and geography model

EDISON is intended to become available in one simultaneous product release, rather than a sequence of country or region launches. Campaign geography is a separate ad-targeting input. It selects the locations for which a campaign is eligible; it does not activate or disable the EDISON service in a location.

The current geographic data is limited to representative profiles for Zimbabwe, South Africa, the United Kingdom, the European Union as a grouped profile, the United States, and a combined Kenya/Nigeria profile. It is not a complete world-country dataset, a legal map, or verified global ad-targeting coverage.

## Topics requiring qualified review

The following is a starting checklist drawn from the existing project architecture. References are prompts for verification, not conclusions that a particular rule applies or that EDISON complies.

| Jurisdiction profile | Topics counsel and the owner must verify |
|---|---|
| Zimbabwe | Data-protection obligations and any controller registration; broadcast/service classification; advertising and consumer rules; employment-listing responsibilities; tax treatment; consent and household-location handling. Existing code references the Cyber and Data Protection Act, Broadcasting Services Act, Labour Act, Consumer Protection Act, POTRAZ, BAZ, and ZIMRA. |
| South Africa | POPIA roles and cross-border processing; advertising standards; employment-services requirements; consumer rules; broadcast classification; tax treatment. Existing code references POPIA, the ARB, Employment Services Act, CPA, ICASA, and SARS. |
| United Kingdom | UK GDPR and PECR analysis for TV/browser identifiers; advertising and broadcast rules; employment-listing responsibilities; consumer and tax obligations. Existing code references ASA/CAP/BCAP, Ofcom, and HMRC topics. |
| European Union | GDPR and ePrivacy analysis; applicable national media and advertising rules; platform transparency; employment and consumer rules; country-specific tax obligations. The current EU grouping is not a substitute for country-level analysis. |
| United States | State privacy laws and opt-out signals; VPPA applicability; advertising, employment, messaging, consumer, and broadcast rules; state-by-state variations. Existing code references CCPA/CPRA, VPPA, FTC, TCPA, FCC, and ATSC topics. |
| Kenya and Nigeria | Separate privacy, advertising, communications, employment, consumer, and tax analysis for each country. The combined software profile must not be treated as equivalent law or approval for either country. Existing code references Kenya's Data Protection Act, Nigeria's NDPA, ARCON, CA Kenya, and NCC Nigeria. |

## Controls represented in software

The repository includes consent and withdrawal workflows, QR revocation, privacy-oriented household views, non-guarantee messaging for opportunities, zero applicant-fee controls, and restrictions against broadcaster signal hijacking and camera/microphone attention tracking. These controls are software implementations and tests, not evidence that all legal requirements are met or that every production data flow has been reviewed.

Geographic targeting data and regulatory obligations must remain separate. Do not use a jurisdiction list or a legal review checklist as a country-by-country product launch switch. A global launch still requires the owner to resolve applicable legal and safety obligations before operating.

## Evidence required before release

- Confirm the legal operator, controller/processor roles, privacy contact, and service classification.
- Obtain current, jurisdiction-specific advice on privacy, cookies, advertising, TV/broadcast, employment listings, consumer protection, taxes, and required registrations.
- Verify production data flows, consent and withdrawal behavior, data retention, subprocessor contracts, data residency, and cross-border transfers.
- Confirm moderation, disclosures, complaint handling, age policy, incident response, and product safety.
- Record decisions and evidence without claiming certification unless a qualified authority has actually provided it.
