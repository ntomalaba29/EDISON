# EDISON — Privacy, Security, and Consent Controls

> **Engineering reference, not a legal opinion or compliance certification.** This document describes intended safeguards and selected repository behavior. It does not show that every requirement is met or that production data flows have been audited. See the draft Privacy Notice, Cookie Policy, Terms, and [Jurisdiction Compliance Considerations](JURISDICTION_COMPLIANCE_REGISTER.md); all require owner and qualified-counsel review before launch.

## Product and geography boundary

EDISON is intended to release as one service at one time, rather than activating countries in sequence. Geographic data selects eligible ad audiences and must not be used as a product-availability switch. The current targeting catalogue is incomplete and is not proof of global coverage.

Regulatory obligations can vary with users, data, vendors, content, and service behavior. They are separate from ad-targeting geography and cannot be removed by choosing a simultaneous release model. No formal legal compliance claim is made by this repository.

## Household consent model

The application supports household installations, optional member profiles, consent status, and consent epochs. The current technical decision (`DEC-OPEN-01`) uses a bundled household withdrawal model: withdrawal suspends the configured household advertising/opportunity behavior and invalidates applicable household QR tokens. Ordinary TV behavior is intended to remain available.

This is an implementation decision, not a determination that bundled consent is legally appropriate in every jurisdiction. Before production, review the consent design, notices, choices, profile use, shared-device risks, and withdrawal behavior with qualified counsel and user research. Do not treat the current settings as a universal default for every product, integration, or territory.

## Data minimization and access

- Account access uses role checks and session controls. Passwords are processed using a password-hashing mechanism; session tokens are hashed in the session store.
- Exact household location and member profile details are private application data. Advertisers should receive only the minimum aggregated targeting information needed for a campaign; they must not receive household addresses, exact coordinates, watch history, qualifications, or profile details.
- Private member education, qualifications, skills, work history, and contact details must not appear on shared TV screens. Use only a chosen display name or neutral text.
- QR tokens and logs must not contain household personal information. Consent withdrawal and privacy deletion should invalidate applicable identifiers.
- Camera and microphone attention tracking are disabled in the current software design. Recheck client, platform, and vendor integrations before repeating this claim publicly.

These are engineering constraints. They do not establish that production systems, third-party SDKs, support processes, or all administrative paths meet them.

## Cookies and session security

The inspected server code sets:

- `edison_proto_session`: HTTP-only authentication session cookie;
- `edison_csrf`: browser-readable CSRF token cookie.

Both use `SameSite=Lax`, are Secure for HTTPS/production requests, and are configured with a seven-day maximum cookie age. Session validation also applies a two-hour idle timeout. Logout clears both. No non-essential analytics cookie or cookie-preference interface was identified in the inspected source. See `docs/legal/COOKIE_POLICY_DRAFT.md`; production configuration and third-party technologies must be inventoried before publication.

## Retention and rights workflows

Code defines a two-hour idle session timeout, seven-day absolute session lifetime, a 30-day setting for expired household QR tokens, and a two-year audit-retention setting. Verify the actual cleanup execution, persistent stores, logs, backups, vendor copies, and exception handling before presenting these as complete retention commitments.

Data export, erasure, consent withdrawal, and QR revocation workflows exist in software. Test them end to end against the production persistence layer, backup policy, and any processors. Document identity verification and applicable exceptions; do not promise a response period until the operator has selected and staffed one.

## Security and operations

The code includes authentication, role-based access, CSRF defenses, request validation, rate limiting, consent auditing, and privacy-oriented response views. The Cloudflare preview is not a production-ready application: it reports application API, media upload, and media processing readiness as false. No external penetration test, complete production threat assessment, incident-response exercise, or backup-restore drill is verified.

The Worker cannot run the repository's Node.js FFmpeg worker. Media processing is disabled in that runtime. R2 is not active and no production media-processing provider is selected.

## Data residency and transfers

The repository includes proposed regional manifests and cross-border restrictions. These are configuration blueprints, not evidence that production data is actually resident in a given country or that remote access and transfers are blocked. Before launch, map hosting, storage, logs, vendor access, support access, backups, and transfer mechanisms.

## Required pre-release review

1. Complete a production data inventory covering accounts, household profiles, precise location, campaigns, QR events, logs, cookies, backups, and support.
2. Verify consent, withdrawal, export, erasure, access controls, retention, and audit behavior against real persistence and integrations.
3. Inventory hosting providers, subprocessors, advertising and payment integrations, and data-transfer paths.
4. Complete qualified jurisdiction-specific review of privacy, cookies, advertising, broadcaster/device, consumer, employment-listing, and tax obligations.
5. Complete external security review, incident-response planning, and restore testing.
6. Publish only approved policy versions that match tested product behavior.
