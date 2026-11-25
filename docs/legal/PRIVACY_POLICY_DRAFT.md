# EDISON Privacy Notice — Draft for Review

> **DRAFT — NOT APPROVED OR FOR PUBLICATION.** This working draft is based on the current repository and preview configuration as inspected on 25 November 2026. It is not legal advice and does not establish that EDISON complies with any law. The service owner and qualified privacy counsel must complete the highlighted facts, confirm actual production data flows, and approve a final notice before collecting real customer data.

## 1. Who operates EDISON

EDISON is operated by **[legal entity name]**, of **[registered address]** (“EDISON”, “we”, “us”). Contact the privacy team at **[privacy contact email or form]**. The person responsible for privacy questions is **[name/role, if applicable]**.

Before publication, confirm which entity determines the purposes and means of processing, whether any joint controllers or representatives apply, and whether a data protection officer must be appointed.

## 2. Service status and scope

EDISON is being developed as a Smart TV advertising and community-opportunity service. The public Cloudflare preview is a limited application shell; it is not the complete production service. Live advertising-network, broadcaster, payment-provider, and physical-TV integrations have not been verified. This notice must be revised to describe the actual production service before launch.

## 3. Information the current application is designed to handle

Depending on features used and enabled in the final service, EDISON may process:

- **Account data:** name, email address, account role, organization name, and password verifier. Passwords are processed by the authentication service and stored as password hashes, not as readable passwords.
- **Business and listing data:** organization and contact details, business identity or tax fields, website, campaign and creative content, opportunity descriptions, verification submissions, moderation decisions, and support or dispute messages.
- **Household and profile data:** household and device labels; user-entered country, region, city, district and area; household consent state; and optional member display names, PIN verifier, education, qualifications, skills, experience, occupation, interests, and career preferences.
- **Advertising and QR activity:** campaign targeting areas, QR tokens and destination metadata, QR validation and redirect events, and delivery or impression events where the relevant feature is enabled.
- **Security and operations data:** authentication/session identifiers, consent and administrative audit events, request and error metadata needed to operate and protect the service. Confirm the exact fields collected by Cloudflare, hosting providers, application logs, and support systems before publication.

The application has technical controls intended to limit advertiser access to household details and to avoid exposing exact household locations in public views. Do not interpret these design controls as a guarantee that every production integration or data flow has been independently audited.

The current code disables camera and microphone attention tracking. Confirm this remains true in the shipped client, TV integrations, SDKs, and any third-party advertising technology before making a broader public claim.

## 4. How information may be used

The application is designed to use information to:

- create and secure accounts and provide account features;
- manage campaigns, creatives, opportunities, verification, moderation, and support;
- select eligible campaigns using advertiser-selected geographic targeting;
- generate and validate QR links and record relevant delivery or redirect events;
- record consent choices, process withdrawal, support privacy requests, prevent abuse, and maintain security;
- diagnose service errors, test and improve reliability, and meet applicable legal obligations.

The legal basis or other authorization for each purpose must be determined for each applicable jurisdiction and documented by the operator. Do not publish a blanket legal-basis claim based on this draft.

## 5. Geographic targeting and household location

Campaign geography is intended to select where an advertisement may be eligible to appear. It is separate from product availability: EDISON's intended release model is one simultaneous service launch, not a sequence of country or region launches. Geography must not be used as a disguised country activation gate.

The current repository contains only representative geographic profiles and does not establish complete global boundary coverage, precise-radius targeting, verified device location, or a production location provider. Do not claim global targeting coverage until the dataset, matching behavior, data source, accuracy, and privacy impact have been verified.

Exact household location is sensitive. The operator must confirm whether it is collected in production, whether it is required, the precision retained, access restrictions, deletion behavior, and whether any location is shared with vendors or advertisers. The design intent is to provide advertisers only appropriately aggregated or coarse targeting information, not household addresses or exact coordinates.

## 6. Cookies and similar technologies

The current application sets an authentication session cookie named `edison_proto_session` and a CSRF cookie named `edison_csrf`. The session cookie is HTTP-only; the CSRF cookie is readable by the browser client. Both use `SameSite=Lax`, are marked Secure for HTTPS/production requests, and are configured with a seven-day cookie lifetime. Application session checks also use a two-hour idle timeout. These implementation details must be rechecked against production configuration.

No analytics or advertising cookie was identified in the inspected application code. Hosting, embedded media, analytics, consent-management, and advertising integrations may add technologies; inventory them before release and update the Cookie Policy and consent behavior as required.

## 7. When information may be shared

Information may be processed by service providers needed to operate the service, such as hosting, database, storage, security, and support providers, subject to verified contracts and instructions. The current preview uses Cloudflare Workers and D1. No complete production subprocessor list or production data-transfer assessment was verified during this review.

The application does not currently have a verified live third-party ad-network or payment-provider integration. If one is added, identify the recipient, role, data fields, purposes, controls, and applicable transfer mechanism before enabling it.

We may also disclose information when legally required or necessary to protect people, the service, or legal rights, subject to applicable law.

## 8. International processing

The repository includes proposed residency and regional deployment manifests; these are not proof that production data is stored in those locations or that cross-border transfers are technically prevented. Before launch, document actual hosting locations, remote support access, subprocessors, transfer mechanisms, and any localization requirements.

## 9. Retention and deletion

The code defines a two-hour idle timeout and seven-day absolute session lifetime, a 30-day retention setting for expired household QR tokens, and a two-year audit-retention setting. These are code-level settings, not a verified end-to-end retention schedule for all production copies, backups, logs, or providers. The operator must verify that deletion runs, backups expire, and provider retention aligns with the final schedule.

Before publication, specify retention periods or criteria for each category, including account, profile, household location, campaign and opportunity, QR/delivery events, audit records, support messages, logs, backups, and legal holds.

## 10. Your choices and requests

The application contains account, consent-withdrawal, data-export, and erasure workflows. The operator must test and document their actual scope, identity checks, response times, exceptions, and contact route. Depending on the applicable law, individuals may have rights to access, correct, delete, restrict, object to, or obtain a copy of personal information, and to withdraw consent where consent is the basis.

To make a request, contact **[privacy contact]**. Complaints may also be made to the competent supervisory authority where applicable.

## 11. Security

The code includes security measures such as password hashing, access controls, CSRF defenses, consent auditing, and privacy-oriented data views. No external penetration test or complete production security review has been verified. No system can promise absolute security. The operator must complete security review and incident-response arrangements before launch.

## 12. Children and age requirements

The target age, eligibility rules, parental-consent approach, and treatment of children's data have not been confirmed. The owner and counsel must make and implement these decisions before the service is offered to children or to a general audience.

## 13. Changes and contact

- **Final notice version:** [version]
- **Effective date:** [date]
- **Last updated:** [date]
- **Privacy contact:** [contact details]

We will explain material changes through **[approved notice method]**, subject to applicable law.

## Owner and counsel completion checklist

- Confirm legal entity, controller roles, address, privacy contact, and representatives.
- Map production data flows, logs, cookies, SDKs, hosting, support access, and subprocessors.
- Confirm lawful bases, purposes, consent UX, age policy, geographic precision, and advertiser disclosures.
- Verify actual retention/deletion, backup expiry, privacy-request handling, and incident response.
- Review international data flows, transfer mechanisms, and jurisdiction-specific rights.
- Obtain qualified legal review; approve, date, and publish the final notice only after the product behavior matches it.
