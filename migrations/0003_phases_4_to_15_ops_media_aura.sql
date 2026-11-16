-- EDISON TASK-P3-001 Migration 0003: Phases 4–15 Operational Tables
-- FFmpeg Media Worker Jobs, AURA Paired Devices, Commercial Dispute/Refund Ledger,
-- Pilot Cohorts, Board Governance Decisions, Country Policies & Regional Residency Configs.

CREATE TABLE IF NOT EXISTS media_render_jobs (
  job_id TEXT PRIMARY KEY,
  creative_id TEXT,
  requested_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  job_kind TEXT NOT NULL CHECK (job_kind IN ('probe', 'transcode_h264_mp4', 'transcode_hls', 'encode_still_slate', 'loudness_ebu_r128')),
  source_filename TEXT NOT NULL,
  output_filename TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'timed_out', 'cancelled')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 2,
  ffmpeg_binary_executed BOOLEAN NOT NULL DEFAULT FALSE,
  probe_summary JSONB,
  loudness_lufs NUMERIC(6, 2),
  true_peak_dbtp NUMERIC(6, 2),
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_jobs_status_created ON media_render_jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS aura_paired_devices (
  device_id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  tv_label TEXT NOT NULL,
  platform_id TEXT NOT NULL CHECK (platform_id IN ('simulation_tv', 'android_tv_tif', 'samsung_tizen', 'lg_webos', 'hdmi_cec_stb')),
  pairing_code TEXT NOT NULL,
  pairing_status TEXT NOT NULL CHECK (pairing_status IN ('pending_pin', 'paired', 'reconnecting', 'disconnected')),
  connection_state TEXT NOT NULL CHECK (connection_state IN ('online', 'offline_queued', 'disconnected')),
  active_profile_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aura_devices_owner ON aura_paired_devices (owner_user_id);

CREATE TABLE IF NOT EXISTS commercial_disputes_refunds (
  id TEXT PRIMARY KEY,
  advertiser_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  billing_period_label TEXT NOT NULL,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('rate_card_adjustment', 'delivery_shortfall_credit', 'pro_forma_dispute', 'charity_fee_zero_audit')),
  disputed_amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  approved_credit_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('open', 'under_review', 'credit_approved_simulated', 'rejected', 'closed')),
  reason TEXT NOT NULL,
  resolution_note TEXT NOT NULL DEFAULT '',
  payment_collection_active BOOLEAN NOT NULL DEFAULT FALSE CHECK (payment_collection_active = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_disputes_adv ON commercial_disputes_refunds (advertiser_user_id, status);

CREATE TABLE IF NOT EXISTS governance_country_policies (
  country_code TEXT PRIMARY KEY,
  sovereign_region_id TEXT NOT NULL,
  consent_banner_strict_mode BOOLEAN NOT NULL DEFAULT TRUE,
  require_pre_broadcast_human_moderation BOOLEAN NOT NULL DEFAULT TRUE,
  job_fee_zero_lock_enforced BOOLEAN NOT NULL DEFAULT TRUE CHECK (job_fee_zero_lock_enforced = TRUE),
  prohibit_external_signal_hijack BOOLEAN NOT NULL DEFAULT TRUE CHECK (prohibit_external_signal_hijack = TRUE),
  redact_household_geo_from_advertisers BOOLEAN NOT NULL DEFAULT TRUE CHECK (redact_household_geo_from_advertisers = TRUE),
  country_activated BOOLEAN NOT NULL DEFAULT FALSE CHECK (country_activated = FALSE),
  operator_tax_notice_label TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_regional_configs (
  region_id TEXT PRIMARY KEY,
  primary_language_code TEXT NOT NULL DEFAULT 'en',
  supported_language_codes JSONB NOT NULL DEFAULT '["en"]'::jsonb,
  caption_accessibility_standard TEXT NOT NULL,
  multi_currency_code TEXT NOT NULL,
  pro_forma_cpm_rate_local NUMERIC(12, 2) NOT NULL,
  data_residency_zone TEXT NOT NULL,
  prohibit_cross_border_pii_transfer BOOLEAN NOT NULL DEFAULT TRUE CHECK (prohibit_cross_border_pii_transfer = TRUE),
  regional_expansion_active BOOLEAN NOT NULL DEFAULT FALSE CHECK (regional_expansion_active = FALSE),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
