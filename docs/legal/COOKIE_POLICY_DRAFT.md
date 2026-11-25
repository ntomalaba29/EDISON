# EDISON Cookie and Similar Technologies Policy — Draft for Review

> **DRAFT — NOT APPROVED OR FOR PUBLICATION.** This draft describes cookies found in the repository as inspected on 25 November 2026. It is not legal advice. Recheck the deployed site, domains, browser behavior, hosting layer, and third-party integrations before publishing.

## 1. Operator and contact

EDISON is operated by **[legal entity name]**. For questions about cookies or privacy, contact **[privacy contact email or form]**.

## 2. What the current application uses

The inspected application uses the following first-party cookies for authentication and request security:

| Cookie | Purpose | Browser access | Current configured lifetime |
|---|---|---|---|
| `edison_proto_session` | Carries an authenticated session | HTTP-only; not readable by page JavaScript | Seven days maximum cookie age; application session also expires after two hours idle |
| `edison_csrf` | Supports cross-site request forgery protection | Readable by the browser client so it can be sent with protected requests | Seven days maximum cookie age |

Both cookies are configured with `SameSite=Lax`; the Secure attribute is enabled for HTTPS/production requests. Logout clears these cookies. Actual behavior depends on deployment configuration and must be retested on the production domain.

These are described as necessary for authentication and security in the current implementation. No separate analytics or advertising cookie was found in the inspected application source. This does not account for cookies or similar technologies set by hosting infrastructure, embedded content, future SDKs, or third-party integrations.

## 3. Choices and consent

The current source review did not identify a cookie-preference interface. Before enabling any non-essential cookie or similar technology, the operator must determine and implement the notice, consent, refusal, and withdrawal behavior required in each applicable jurisdiction. Do not describe the current service as offering cookie choices unless that interface is deployed and verified.

Browser settings can block or delete cookies, but doing so may prevent sign-in or protected actions from working. Cookie settings in a browser do not necessarily withdraw other forms of consent; use the service's consent controls where available.

## 4. Changes and questions

We will update this policy if the technologies used change. Contact **[privacy contact]** with questions.

- **Version:** [version]
- **Effective date:** [date]
- **Last updated:** [date]

## Owner and counsel completion checklist

- Confirm the production cookie inventory, domains, paths, lifetimes, attributes, and provider-set cookies.
- Inspect local storage, pixels, SDKs, embedded content, and other device storage in the production build.
- Classify each technology and implement any required consent and preference controls.
- Confirm the entity/contact details and obtain qualified legal review before publication.
