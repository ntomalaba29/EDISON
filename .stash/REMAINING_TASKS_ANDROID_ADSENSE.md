# EDISON Remaining Tasks — Android TV + Google AdSense Only

**Scope:** Android TV only and Google AdSense only  
**Current progress:** 77/99 executable subphases (77.8%)  
**Last updated:** 25 November 2026  

> **Note:** This list is derived from the global launch audit and narrowed to the clarified scope of Android TV + AdSense. Items marked with `[ ]` are incomplete, `[✅]` would be complete, and blocked items are noted.

---

## 1. Complete the core platform

- [ ] Remove obsolete country-launch activation engines, types and decision models
- [ ] Preserve country and regional information for geographic targeting and legal compliance
- [ ] Finish worldwide geographic targeting (documented as separate feature — R4)
- [ ] Support country, province/state, city, district, suburb and custom geographic boundaries
- [ ] Implement advertiser-independent geographic eligibility calculations, including 5 km radius targeting
- [ ] Verify TV installation locations and detect when televisions move
- [ ] Protect household addresses and exact coordinates from disclosure

---

## 2. Finish Android TV integration

- [ ] **Complete the Android TV application** — current implementation has simulated TV adapters; real hardware testing not completed
- [ ] Implement secure TV registration and account linking
- [ ] Implement real TV-to-EDISON communication
- [ ] Implement remote-control interaction and viewer override
- [ ] Implement reliable advertisement playback
- [ ] Handle network interruptions, application crashes and recovery
- [ ] Test on actual Android TV hardware
- [ ] Verify automatic device registration, location updates and software updates

---

## 3. Complete Google AdSense integration

- [ ] Verify EDISON's eligibility for the intended AdSense video-advertising arrangement
- [ ] **Integrate the appropriate Google IMA SDK for Android TV**
- [ ] Connect the advertising request and playback lifecycle
- [ ] Implement impression, completion and interruption tracking
- [ ] Integrate AdSense reporting where applicable
- [ ] **Test actual advertisements on Android TV**
- [ ] Verify Google's publisher policies and payment arrangements

> **Important:** The AdSense Management API alone cannot deliver advertisements. The TV playback integration is a separate requirement.

---

## 4. Complete media infrastructure

- [ ] **Activate Cloudflare R2 billing and create the required bucket** — requires owner-side action
- [ ] Complete task 5.11b, the R2 storage integration
- [ ] Complete task 5.11c, media processing
- [ ] Implement reliable video processing and transcoding
- [ ] Complete media upload, validation and delivery
- [ ] Implement background job processing and retries
- [ ] Test video playback across different Android TV devices and network conditions

> **Blocked:** R2 activation currently requires an owner-side action. The media-processing provider has not been selected.

---

## 5. Complete intelligence and analytics

- [ ] Replace simulated TV data with real installation data
- [ ] Complete shared intelligence using real device evidence
- [ ] Complete calibration and reliability measurements
- [ ] Establish authoritative playback-event records
- [ ] Complete reporting and analytics
- [ ] Verify that reported impressions reflect actual qualifying playback events

---

## 6. Security and reliability

- [ ] Complete independent penetration testing
- [ ] Complete extended time-based soak testing
- [ ] Replace in-memory rate limiting with distributed protection
- [ ] Verify device authentication and credential security
- [ ] Test duplicate events, interrupted playback and recovery
- [ ] Verify data privacy and access restrictions

---

## 7. Legal and release readiness

- [ ] Complete the privacy policy
- [ ] Complete the cookie policy
- [ ] Complete terms and conditions
- [ ] Supply the outstanding company and contact information
- [ ] Obtain qualified legal review
- [ ] Complete the global release-readiness assessment
- [ ] Obtain final release authorisation

---

## What does NOT need to be built (out of scope)

- Samsung Tizen integration
- LG webOS integration
- Amazon Fire TV integration
- AdMob integration
- OpenRTB advertising marketplace
- Paid advertiser campaign purchasing and payment collection
- Third-party advertiser billing infrastructure

---

## The remaining critical path (priority order)

1. **Finish the core backend and worldwide targeting** — Remove obsolete activation logic and complete geographic matching
2. **Complete Android TV and AdSense** — Establish real device communication, advertising playback and viewer controls
3. **Finish media infrastructure** — Activate storage and complete processing and delivery
4. **Replace simulations with real-world evidence** — Verify playback, analytics, device status and reporting
5. **Complete security, legal and hardware testing** — Resolve production blockers and obtain release approval
6. **Global release** — One worldwide product release, subject to applicable legal restrictions

---

## Immediate next actions

1. Fresh repository audit against the narrowed Android TV + AdSense scope
2. Verify which items from this list are already implemented in the codebase
3. Prioritize tasks that prevent unnecessary rebuilding
4. Begin with core platform cleanup (obsolete activation engines, geographic targeting)