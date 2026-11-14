# EDISON — Advertising & QR Code System

**Document Status**: Phase 1 Specification (QR system must be real and physically scannable in Phase 2 prototype)

---

## 1. Supported QR Destination Categories

1. Official Website (`https://...`)
2. Product or Service Page (`https://...`)
3. Online Store / Checkout Page (`https://...`)
4. WhatsApp Conversation (`https://wa.me/<e164>?text=...`)
5. Telephone Number (`tel:+<e164>`)
6. Enquiry Form (`https://...`)
7. Job Application (`https://...` or validated EDISON opportunity detail link if provider lacks external ATS)
8. Scholarship Application (`https://...`)
9. Training Programme Application (`https://...`)
10. Grant / Tender Application (`https://...`)
11. Other Approved Legitimate Destinations

---

## 2. Destination Validation & Anti-Abuse Controls

1. **Scheme Allowlist**: Permit only `https://`, `tel:`, and validated `wa.me` links (auto-upgrade or warn on `http://`; strictly reject `javascript:`, `data:`, `vbscript:`, `file:`).
2. **Phishing & Misleading Domain Protection**:
   - Validate domain syntax (reject IP-address URLs, punycode/homograph spoofing warnings, URL shortener chains like `bit.ly` that hide the true final host unless resolved & verified).
   - Display the **exact resolved final domain** clearly in the Advertiser Preview, Pre-Submit Gate, and Admin Review screen.
3. **Direct-to-Destination Rule**:
   - When using an EDISON tracking redirect (`https://<edison-host>/r/<token>`), the server validates the token, records `redirect_requested` on receipt, evaluates bot/prefetch heuristics + 5-second deduplication, records `redirect_issued` when issuing the HTTP `302 Found` response, and routes directly to the verified destination.
   - **Never** show an intermediate EDISON advertisement, app-install prompt, or interstitial page on the viewer's phone.
   - **Never** emit `destination_opened` or claim a confirmed human QR scan solely from an HTTP `302` redirect request. Link previewers (WhatsApp, Slack, Facebook), search crawlers, CLI tools, and browser prefetches can trigger `/r/:token` without a human camera scan, and HTTP `302` does not verify that the external destination page finished loading.

---

## 3. Physical Scanning Readiness Standards

- **Live Prototype Requirement**: In Phase 2, QR codes rendered in the 16:9 TV Preview, Opportunity Preview, and Commercial-Break Simulator must encode real URLs pointing to the running server's `/r/:token` endpoint (or direct verified `tel:`/`wa.me:` URI) so a physical mobile phone camera can scan the screen and open the destination.
- **Verification Discipline**: Physical mobile scanning must be **actually tested** with a real phone camera before marking Phase 2 QR criteria complete. Never claim physical scan verification without running the physical test.
