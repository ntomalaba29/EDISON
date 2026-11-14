# EDISON — Product Requirements Document (PRD)

**Document Status**: Phase 1 Comprehensive Baseline

---

## 1. User Personas

1. **Commercial Advertiser**: Business owner, marketer, or agency creating or uploading TV ads and measuring legitimate campaign outcomes.
2. **Opportunity Submitter**: Formal HR team, university, NGO, government programme, or informal/individual employer posting verified jobs, training, grants, or tenders.
3. **EDISON Administrator / Moderator**: Reviews advertiser KYC, inspects full 16:9 ad previews + QR destinations, verifies 3-tier opportunity evidence, handles complaints/appeals.
4. **Television Viewer**: Watches ordinary TV; optionally consents to EDISON; scans QR codes with a standard smartphone camera; retains instant manual return control.

---

## 2. Functional Requirements Matrix

| ID | Domain | Requirement Summary | Target Phase |
| :--- | :--- | :--- | :--- |
| `PRD-01` | Ad Studio (Option A) | Guided non-designer studio: templates, logo/product/bg uploads, heading, description, promo text, prices/offers, contact, URL, CTA, QR code, resize/position/arrange, TV-safe typography. | Phase 2 (Prototype) -> Phase 8 |
| `PRD-02` | Ad Upload (Option B) | Upload image/video ads; validate type, size, resolution, aspect ratio (16:9), duration, audio, compatibility; inspect existing QR code or auto-generate verified QR; flag unreadable QR for review. Never silently overwrite an existing QR. | Phase 2 (Prototype) -> Phase 8 |
| `PRD-03` | 16:9 TV Preview | Realistic 16:9 playback rendering actual campaign assets (video playback or timed image display), actual scannable QR code, play/pause/restart/fullscreen, QR destination tester, duration readout, return-to-editor, opportunity-specific layouts. | Phase 2 (Prototype) |
| `PRD-04` | Break Simulator | Separate clearly labelled simulation: simulated TV channel -> break cue -> EDISON ad -> scannable QR + simulated phone scan -> return to simulated live channel. Controls: Start, Pause, Skip, Manual Return. | Phase 2 (Prototype) |
| `PRD-05` | Pre-Submit Gate | Final Campaign Approval Preview checking appearance, duration, QR position/destination, category, compatibility, TV readability, missing fields, errors/warnings. Admin preview must show full playable ad + live QR test, never thumbnail-only approval. | Phase 2 (Prototype) |
| `PRD-06` | Advertiser Portal | Registration, login, profile, organisation/contact details, verification status, full campaign lifecycle (`draft`, `submitted`, `under_review`, `approved`, `rejected`, `scheduled`, `active`, `paused`, `completed`, `expired`), billing structure preview, pause/cancel, support. | Phase 2 (Prototype) -> Phase 7 |
| `PRD-07` | Opportunity System | Separate workflow: category, provider, description, location, eligibility, closing date, application method, supporting evidence, contact, QR destination, 3-tier verification (`identity`, `organisation`, `specific_opportunity`), moderation, expiry, complaints/appeals. | Phase 2 (Prototype) -> Phase 9 |
| `PRD-08` | QR Code System | Real QR generation for Website, Product/Service, Store, WhatsApp, Telephone, Enquiry, Job/Scholarship/Training/Grant/Tender; URL & scheme validation; malicious/misleading destination blocking; secure redirect routing; physical phone scan tested. | Phase 2 (Prototype) -> Phase 6 |
| `PRD-09` | Analytics | Distinct 7-step funnel (`requested`, `delivered`, `played`, `technically_viewable`, `qr_scanned`, `destination_opened`, `verified_conversion`); anti-duplication/anti-bot controls; strict `[SIMULATED]` vs `[REAL MEASURED]` separation. | Phase 2 (Prototype) -> Phase 6 |
| `PRD-10` | Consent & Privacy | Informed, specific, withdrawable viewer consent explaining collection, ad selection, personalisation, QR tracking, retention, deletion. Data minimisation, audit trails, no default camera/mic tracking. | Phase 1 Spec -> Phase 2/10 |
| `PRD-11` | Smart TV Client | Channel-specific break prediction/detection, safe playback duration formula, preload, permitted switching, manual return, rejoin live broadcast (not pause point), fail-safe skip on uncertainty. | Phase 4/5/12 |
| `PRD-12` | Governance & Copy | Mandatory functional Copy Report button at bottom of every generated report; AI Studio <-> VS Code Command Centre coordination. | Phase 1 (Active) |
