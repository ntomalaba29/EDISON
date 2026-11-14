# EDISON — Business Model

**Document Status**: Phase 1 Baseline (`[ASSUMPTION]` markers indicate commercial hypotheses requiring market & legal validation)

---

## 1. Value Proposition

### For Viewers
- Zero-cost access to relevant commercial offers and verified employment, scholarship, grant, and training opportunities directly while watching TV.
- Instant mobile handoff via QR code—no typing long URLs, no downloading mobile apps, no secondary ad clutter on the phone.
- Full control: informed withdrawable consent and instant manual return to TV.

### For Commercial Advertisers (SMBs, Brands, Retailers, Event Organisers)
- Television-scale visual presence without traditional broadcast production or national network buy minimums.
- Self-serve Ad Creation Studio (Option A) removes graphic-design barriers; Upload workflow (Option B) supports agencies.
- Measurable QR scan and destination-open attribution alongside honest delivery/playback telemetry.

### For Opportunity Providers (Employers, Universities, NGOs, Training Centres, Informal Employers)
- Reach households that may not actively browse desktop job boards or LinkedIn.
- Trusted verification badge architecture increases applicant confidence while protecting providers from impersonation.

---

## 2. Revenue Streams (`[ASSUMPTION — NO PAYMENTS IN PROTOTYPE]`)

1. **Commercial Campaign Placements**:
   - Tiered pricing by geography/market, duration (e.g., 15s / 30s), daypart, or verified playback volume (CPV / CPM on *delivered & played* impressions, never unverified "views").
2. **Opportunity Listing Fees (Strictly Decoupled from Verification)**:
   - `[ASSUMPTION]`: Standard/enterprise employers may pay a campaign distribution fee to broadcast verified opportunity spots, while public-interest, micro-employer, or scholarship listings may use subsidised/sponsored or free tiers.
   - **Hard Governance Rule**: Paying a fee **never** accelerates, buys, or guarantees verification approval. Rejected opportunities receive full policy transparency and refund rules (defined in Phase 13 commercial readiness).
3. **Value-Added Creative / Studio Tiers (Future)**:
   - `[ASSUMPTION]`: Basic Ad Studio templates remain included in campaign setup; premium motion/video rendering or agency multi-seat workspaces may be tiered in Phase 7/8.

---

## 3. Cost Structure (`[PRELIMINARY]`)

- Cloud video/image transcoding, CDN egress, and edge ad preloading infrastructure.
- Human & automated moderation/verification operations (critical cost driver for Opportunity Verification).
- Smart TV SDK engineering, hardware test lab across Samsung/LG/Android TV models, and OEM/operator revenue-share or certification fees (`[UNRESOLVED QUESTION]`).
- Country-by-country legal, tax, and broadcast compliance advisory.

---

## 4. Prototype Billing Boundary

- **Phase 1 & Phase 2 Rule**: Do **not** integrate real payment processors (Stripe, Paystack, Adyen, etc.), collect real bank/card details, or contact real advertisers.
- The Phase 2 prototype will model **billing structure metadata** (rate card estimates, campaign budget fields, simulated invoice previews clearly labelled `[SIMULATED PROTOTYPE BILLING]`) without executing financial transactions.
