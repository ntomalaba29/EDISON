-- Rollback 0001_initial_track_a.sql
DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
DROP FUNCTION IF EXISTS edison_prevent_audit_mutation();
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS shared_intel_preview_state;
DROP TABLE IF EXISTS physical_qr_scan_tests;
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS opportunity_appeals;
DROP TABLE IF EXISTS opportunity_complaints;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS ad_creatives;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS qr_links;
DROP TABLE IF EXISTS advertiser_profiles;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
