-- EDISON TASK-P3-001 Migration 0002: Track B Household Privacy, Multi-Profile,
-- Bundled Consent Epochs (DEC-OPEN-01 Locked), Sovereign Residency Partitioning & QR Epoch Revocation

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_label TEXT NOT NULL,
  tv_device_label TEXT NOT NULL,
  country_code TEXT NOT NULL,
  province_or_region TEXT NOT NULL,
  metro_area TEXT NOT NULL DEFAULT '',
  city_or_town TEXT NOT NULL,
  district TEXT NOT NULL,
  suburb_or_area TEXT NOT NULL,
  exact_installation_location TEXT NOT NULL,
  location_valid BOOLEAN NOT NULL DEFAULT TRUE,
  targeting_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  ordinary_tv_preserved BOOLEAN NOT NULL DEFAULT TRUE CHECK (ordinary_tv_preserved = TRUE),
  commercial_consent_status TEXT NOT NULL CHECK (commercial_consent_status IN ('granted', 'withdrawn')),
  charity_and_opportunity_status TEXT NOT NULL CHECK (charity_and_opportunity_status IN ('active', 'suspended_by_bundled_withdrawal')),
  personalisation_master_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  neutral_display_mode BOOLEAN NOT NULL DEFAULT FALSE,
  consent_epoch INT NOT NULL DEFAULT 1 CHECK (consent_epoch >= 1),
  consent_version_label TEXT NOT NULL DEFAULT 'DEC-OPEN-01-ScopeB-v1',
  last_consent_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_prototype_seed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bundled_withdrawal_consistency CHECK (
    (commercial_consent_status = 'granted' AND charity_and_opportunity_status = 'active')
    OR (commercial_consent_status = 'withdrawn' AND charity_and_opportunity_status = 'suspended_by_bundled_withdrawal')
  )
);

CREATE INDEX IF NOT EXISTS idx_households_owner_country ON households (owner_user_id, country_code);
CREATE INDEX IF NOT EXISTS idx_households_geo_aggregate ON households (country_code, province_or_region, city_or_town)
  WHERE commercial_consent_status = 'granted' AND location_valid = TRUE;

CREATE TABLE IF NOT EXISTS household_members (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  pin_hash TEXT,
  has_pin_lock BOOLEAN NOT NULL DEFAULT FALSE,
  personalisation_consent_granted BOOLEAN NOT NULL DEFAULT TRUE,
  education_level TEXT NOT NULL DEFAULT '',
  qualifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience_summary TEXT NOT NULL DEFAULT '',
  experience_years INT NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  occupation_or_trade TEXT NOT NULL DEFAULT '',
  employment_interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  career_aspirations TEXT NOT NULL DEFAULT '',
  industries JSONB NOT NULL DEFAULT '[]'::jsonb,
  interested_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members (household_id);

CREATE TABLE IF NOT EXISTS household_qr_tokens (
  token TEXT PRIMARY KEY,
  base_qr_token TEXT NOT NULL REFERENCES qr_links(token) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE SET NULL,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  consent_epoch INT NOT NULL CHECK (consent_epoch >= 1),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  resolved_count BIGINT NOT NULL DEFAULT 0,
  rejected_403_count BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_household_qr_household_epoch ON household_qr_tokens (household_id, consent_epoch);

CREATE TABLE IF NOT EXISTS consent_audit_events (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_id TEXT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_epoch INT NOT NULL,
  new_epoch INT NOT NULL,
  reason TEXT NOT NULL,
  affected_qr_tokens_invalidated INT NOT NULL DEFAULT 0,
  ordinary_tv_preserved BOOLEAN NOT NULL DEFAULT TRUE CHECK (ordinary_tv_preserved = TRUE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_household_created ON consent_audit_events (household_id, created_at DESC);
