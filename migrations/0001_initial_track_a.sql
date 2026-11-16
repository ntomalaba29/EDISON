-- EDISON TASK-P3-001 Migration 0001: Track A Core Relational Schema (PostgreSQL 16+)
-- Preserves $0.00 Charity lock, non-influenced 3-tier verification, SHA-256 session hashing,
-- and append-only audit trail integrity.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  organisation_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('advertiser', 'opportunity_submitter', 'household_viewer', 'admin')),
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  is_prototype_seed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idle_expires_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS advertiser_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('registered_business', 'individual_sole_trader', 'public_ngo')),
  business_or_trading_name TEXT NOT NULL DEFAULT '',
  registration_or_tax_id TEXT NOT NULL DEFAULT '',
  industry_category TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT 'GB',
  city_region TEXT NOT NULL DEFAULT '',
  physical_address TEXT NOT NULL DEFAULT '',
  primary_contact_name TEXT NOT NULL DEFAULT '',
  primary_contact_email TEXT NOT NULL DEFAULT '',
  primary_contact_phone TEXT NOT NULL DEFAULT '',
  billing_contact_name TEXT NOT NULL DEFAULT '',
  billing_contact_email TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verification_notes TEXT NOT NULL DEFAULT '',
  is_prototype_seed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_country ON advertiser_profiles (country_code);

CREATE TABLE IF NOT EXISTS qr_links (
  token TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  destination_type TEXT NOT NULL DEFAULT 'website',
  raw_input TEXT NOT NULL,
  resolved_url TEXT NOT NULL,
  resolved_host TEXT NOT NULL DEFAULT '',
  scheme TEXT NOT NULL CHECK (scheme IN ('https', 'http', 'tel')),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'flagged')),
  redirect_requests_total BIGINT NOT NULL DEFAULT 0,
  redirect_issued_total BIGINT NOT NULL DEFAULT 0,
  suspected_bot_requests BIGINT NOT NULL DEFAULT 0,
  deduplicated_non_bot_redirects BIGINT NOT NULL DEFAULT 0,
  last_redirect_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_links_owner ON qr_links (owner_id);
CREATE INDEX IF NOT EXISTS idx_qr_links_status ON qr_links (status);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_category TEXT NOT NULL CHECK (content_category IN ('commercial_advertising', 'opportunity_promotion')),
  primary_ad_category TEXT NOT NULL CHECK (primary_ad_category IN ('CHARITY', 'COMMERCIAL')),
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'scheduled', 'active', 'paused', 'completed', 'expired')
  ),
  summary TEXT NOT NULL DEFAULT '',
  qr_token TEXT REFERENCES qr_links(token) ON DELETE SET NULL,
  ad_creative_ref TEXT,
  duration_seconds INT NOT NULL DEFAULT 30 CHECK (duration_seconds BETWEEN 5 AND 120),
  daily_frequency_cap INT NOT NULL DEFAULT 4 CHECK (daily_frequency_cap BETWEEN 1 AND 500),
  target_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  dayparts JSONB NOT NULL DEFAULT '["daytime"]'::jsonb,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  simulated_estimate JSONB NOT NULL,
  payment_collection_active BOOLEAN NOT NULL DEFAULT FALSE CHECK (payment_collection_active = FALSE),
  moderation_reason TEXT NOT NULL DEFAULT '',
  fix_instructions TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_charity_permanent_zero CHECK (
    content_category <> 'opportunity_promotion'
    OR (
      (simulated_estimate->>'estimatedTotalUsd')::numeric = 0
      AND (simulated_estimate->>'model') = 'charity_free_zero_cost'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_campaigns_owner_status ON campaigns (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category_status ON campaigns (primary_ad_category, status);

CREATE TABLE IF NOT EXISTS ad_creatives (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  qr_token TEXT REFERENCES qr_links(token) ON DELETE SET NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('option_a_studio', 'option_b_upload', 'text_only_commercial')),
  status TEXT NOT NULL DEFAULT 'draft',
  display_duration_seconds INT NOT NULL DEFAULT 15 CHECK (display_duration_seconds BETWEEN 5 AND 120),
  option_a JSONB,
  option_b JSONB,
  text_only JSONB,
  safe_zone_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  contrast_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_owner ON ad_creatives (owner_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign ON ad_creatives (campaign_id);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('registered_organisation', 'individual_informal_employer')),
  provider_name TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  eligibility_requirements TEXT NOT NULL DEFAULT '',
  application_method TEXT NOT NULL DEFAULT '',
  contact_info TEXT NOT NULL DEFAULT '',
  qr_token TEXT REFERENCES qr_links(token) ON DELETE SET NULL,
  linked_campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  closing_date TEXT NOT NULL DEFAULT '',
  expiry_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'submitted', 'under_review', 'verified_live', 'rejected', 'suspended', 'expired', 'revoked')
  ),
  verification_tiers JSONB NOT NULL,
  advertising_fee_influences_verification BOOLEAN NOT NULL DEFAULT FALSE CHECK (advertising_fee_influences_verification = FALSE),
  application_fee_free_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  no_guarantee_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  rejection_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_owner_status ON opportunities (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities (status);

CREATE TABLE IF NOT EXISTS opportunity_complaints (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason_category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  evidence_details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'reported',
  resolution_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opp_complaints_opp ON opportunity_complaints (opportunity_id, status);

CREATE TABLE IF NOT EXISTS opportunity_appeals (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  appellant_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  additional_evidence TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opp_appeals_opp ON opportunity_appeals (opportunity_id, status);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_owner_status ON support_tickets (owner_id, status);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  measurement_source TEXT NOT NULL CHECK (measurement_source IN ('simulated_prototype', 'real_measured', 'unverified_in_prototype')),
  qr_token TEXT,
  campaign_id TEXT,
  dedup_key TEXT NOT NULL DEFAULT '',
  is_suspected_bot BOOLEAN NOT NULL DEFAULT FALSE,
  is_deduplicated BOOLEAN NOT NULL DEFAULT FALSE,
  redirect_outcome TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_source ON analytics_events (event_type, measurement_source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign ON analytics_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_dedup ON analytics_events (dedup_key);

CREATE TABLE IF NOT EXISTS physical_qr_scan_tests (
  id TEXT PRIMARY KEY,
  recorded_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL REFERENCES qr_links(token) ON DELETE CASCADE,
  encoded_redirect_url TEXT NOT NULL,
  device_model TEXT NOT NULL,
  os_platform TEXT NOT NULL,
  camera_app TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('passed', 'failed')),
  reached_redirect_endpoint BOOLEAN NOT NULL DEFAULT FALSE,
  landed_destination_observed BOOLEAN NOT NULL DEFAULT FALSE,
  time_to_scan_seconds NUMERIC(6, 2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_intel_preview_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  snapshot JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target_created ON audit_logs (target_type, created_at DESC);

-- Append-only protection trigger on audit_logs (prevents UPDATE/DELETE tampering)
CREATE OR REPLACE FUNCTION edison_prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'EDISON_AUDIT_APPEND_ONLY: Updates and deletes are prohibited on audit_logs';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION edison_prevent_audit_mutation();
