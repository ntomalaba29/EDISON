# EDISON — Business Model

**Document Status**: Updated Specification (`v2.1` — Distinguishes Free `CHARITY ADS` / Free Job Listings, Paid `COMMERCIAL ADS`, Direct-Paid Priority, Modular Network Backfill & `[UNRESOLVED]` GAM CTV Format Limits)

---

## 1. Two-Category Commercial & Public-Benefit Separation

### 1.1 `CHARITY ADS` & Free Employer Job Listings (`$0.00 / FREE` Permanent Rule)
- **Zero Fees Forever**: Formal & verified informal job listings, apprenticeships, internships, scholarships, school/university admissions, training, conferences, grants, tenders, and approved community programmes are **always `$0.00 / FREE`** to submit, verify, broadcast, scan, and apply.
- **No Commercial Purchase Tying**: Employers and opportunity providers are never required to purchase `COMMERCIAL ADS` to list or broadcast verified opportunities.
- **Verification Independence**: Advertising spend never influences Tier 1, Tier 2, or Tier 3 verification.

### 1.2 `COMMERCIAL ADS` (Paid Inventory — Direct Priority + Network Backfill)
Businesses, brands, shops, supermarkets, restaurants, manufacturers, and service providers fund EDISON through paid commercial inventory across three formats (**Image/Banner**, **Video**, **Text-Only Commercial Ads**):
1. **Priority 1 — Direct-Paid Commercial Campaigns**: Always scheduled before any third-party ad-network fill whenever an approved, in-schedule, geo-matching campaign has available budget/caps.
2. **Priority 2 — Modular Advertising-Network Backfill (Unused Commercial Slots Only)**: Fills leftover `COMMERCIAL` break slots (`Position 2` or `Position 4`) only when zero Direct-Paid campaigns qualify. Network yield must never displace Direct-Paid bookings, and network ads must never occupy `CHARITY` slots.

---

## 2. Advertising-Network Provider & Format Uncertainty (`[UNRESOLVED]`)

- `[VERIFIED FROM OFFICIAL GOOGLE DOCS]`: Standard **Google AdSense** (Content) and **AdSense for Video (AFV)** are ineligible/unsuitable for native Smart TV apps. Compliant Google CTV monetization uses **Google Ad Manager (GAM)** + **Google IMA SDK** (`Android TV` native; `Tizen/webOS` HTML5/DAI).
- **`[UNRESOLVED — GAM CTV ACCOUNT & FORMAT ELIGIBILITY]`**:
  1. EDISON has **not** yet applied for or received an approved Google Ad Manager CTV publisher account.
  2. Standard CTV VAST video players typically **ignore HTML/companion display banners** and **do not natively support text-only third-party network ads** without custom VAST rendering wrappers. Therefore, whether external network backfill supports Banner/Image or Text-Only formats—or is limited strictly to VAST video backfill—remains **`UNRESOLVED`**.

---

## 3. Financial Reporting Separation Rules (`[NO REAL PAYMENTS ACTIVE IN PHASE 2]`)

Analytics and financial ledgers must separate seven streams strictly (never counting estimated network earnings as settled cash):
1. **Charity Advertisement Delivery** (`$0.00` public-benefit inventory count)
2. **Direct-Paid Commercial Delivery** & **Direct Advertiser Invoices / Bookings**
3. **Advertising-Network Delivery** (backfill impression count)
4. **Estimated Advertising-Network Earnings** (provisional network estimate only)
5. **Confirmed Network Earnings** (post-reconciliation statement)
6. **Actual Payments Received** (settled cash receipts)
7. **Refunds & Adjustments**

---

## 4. Prototype Operational Boundaries

- `paymentCollectionActive: false` throughout Phase 2.
- Commercial business discovery and automated email outreach remain **STRICTLY PAUSED AND LOCKED**.
- Any household/profile targeting tier (`DEC-OPEN-01`) remains **paused pending owner consent-model selection**.
