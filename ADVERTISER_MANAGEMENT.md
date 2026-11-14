# EDISON — Advertiser Management System

**Document Status**: Phase 1 Specification

---

## 1. Advertiser Lifecycle & Account Features

- **Registration & Authentication**: Account creation, role assignment (`advertiser`, `opportunity_submitter`, `admin`), secure session management.
- **Advertiser Profile**: Business/individual name, registration/tax ID (optional for informal entities where permitted), industry category, billing contact, physical address, primary contact details, verification status (`unverified`, `pending_review`, `verified`, `suspended`).
- **Campaign Management**:
  - Create, edit, clone, pause, resume, and cancel campaigns.
  - Media attachment (Option A Studio composition or Option B uploaded asset).
  - QR Destination configuration & test.
  - Scheduling (start/end dates, target regions/dayparts, duration).
  - Prototype Billing Structure preview (clearly labelled simulated rate-card estimate; zero real payment collection in prototype).
  - Campaign Performance Reporting (7-step analytics funnel separating `[SIMULATED]` vs `[REAL MEASURED]`).
  - Support / Dispute ticket submission.

---

## 2. Campaign Status State Machine (All 10 Mandatory States)

1. `draft` — Editable by advertiser; not submitted.
2. `submitted` — Passed Pre-Submit Gate; awaiting moderation pickup.
3. `under_review` — Assigned to / opened by Admin Moderator with full 16:9 preview.
4. `approved` — Passed creative, QR, and compliance review; ready for schedule window.
5. `rejected` — Declined with mandatory written reason codes & fix instructions; advertiser may revise to `draft`/`submitted`.
6. `scheduled` — Approved and queued for future `start_date`.
7. `active` — Currently within active schedule window and eligible for playback.
8. `paused` — Temporarily halted by advertiser or admin.
9. `completed` — Reached target end date or delivery cap cleanly.
10. `expired` — Schedule/closing window elapsed before activation or without renewal.

---

## 3. Administrator Controls

- Review advertiser verification documents and toggle verification status with mandatory audit log reason.
- Inspect full playable 16:9 ad + test QR destination before approving or rejecting any campaign.
- Pause, suspend, or revoke active campaigns immediately upon policy violation or complaint.
