-- Rollback 0002_track_b_households_consent.sql
DROP TABLE IF EXISTS consent_audit_events;
DROP TABLE IF EXISTS household_qr_tokens;
DROP TABLE IF EXISTS household_members;
DROP TABLE IF EXISTS households;
