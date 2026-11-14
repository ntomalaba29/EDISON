# EDISON — Privacy, Security & Viewer Consent

**Document Status**: Phase 1 Baseline (`[LEGAL REVIEW REQUIRED PER JURISDICTION]`)

---

## 1. Informed, Specific & Withdrawable Viewer Consent

Before any EDISON telemetry or personalised ad selection occurs on a viewer device, EDISON must present plain-language disclosures explaining:
1. **What data is collected** (e.g., channel/break metadata if permitted, playback delivery events, QR redirect timestamps—and explicitly *no* camera or microphone capture).
2. **Why it is collected** (ad delivery verification, break-timing safety, aggregate campaign reporting).
3. **How ads are selected** (contextual schedule vs personalised targeting, clearly disclosed).
4. **Whether QR scans are tracked** (redirect timestamp/campaign token logging without installing mobile trackers).
5. **Retention period** (strict time-bound retention & aggregation windows).
6. **How to withdraw consent & delete data** (single-action withdrawal inside TV settings + deletion request workflow).

### Critical Legal Question: Conditioning Opportunities on Ad Consent
- **Current Product Direction**: Withdrawing EDISON advertising consent disables EDISON advertising and opportunities while ordinary television remains 100% unaffected.
- **`[UNRESOLVED LEGAL QUESTION]`**: Under laws such as GDPR Art. 7(4) ("freely given" consent) or UK/EU/local labour & anti-discrimination laws, conditioning access to free *employment/scholarship opportunities* on consenting to *commercial advertising or behavioural tracking* may be challenged as invalid consent bundling.
- **Architectural Mitigation**: Keep **Non-Personalised Contextual Opportunity Delivery** technically decoupled from personalised advertising consent so jurisdictions requiring unbundled access can enable contextual-only opportunities without ad-tracking consent.

---

## 2. Security & Data Minimisation Controls

- **No Default Biometric/AV Attention Tracking**: Camera and microphone attention tracking are strictly prohibited by default.
- **Identifier Honesty**: A hashed device ID or IP hash is **pseudonymous personal data**, never "anonymous" data, and must be protected as personal data under GDPR/CCPA/POPIA/etc.
- **Consent Scope Boundary**: Viewer consent to EDISON grants zero rights over third-party broadcaster content.
- **Technical Controls**:
  - Data minimisation (collect only event fields required for delivery & fraud prevention).
  - Encryption in transit (TLS 1.3) and at rest (AES-256 for PII, KYC, and opportunity evidence documents).
  - Role-Based Access Control (RBAC) + immutable security audit trails for all admin approvals, rejections, suspensions, and data deletions.
  - Strict QR URL validation & CSRF/XSS/file-upload hardening.
  - Formal Incident Response Plan (detection, containment, regulatory breach notification timelines, campaign freeze).
