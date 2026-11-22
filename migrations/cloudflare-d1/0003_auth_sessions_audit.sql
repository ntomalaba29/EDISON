CREATE TABLE IF NOT EXISTS edison_auth_users (
  user_id TEXT PRIMARY KEY NOT NULL
    CHECK (length(user_id) BETWEEN 1 AND 120),
  email TEXT NOT NULL UNIQUE COLLATE NOCASE
    CHECK (
      length(email) BETWEEN 3 AND 160
      AND email = lower(email)
    ),
  password_hash TEXT NOT NULL CHECK (length(password_hash) BETWEEN 1 AND 512),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  organisation_name TEXT NOT NULL CHECK (length(organisation_name) BETWEEN 1 AND 160),
  role TEXT NOT NULL
    CHECK (role IN ('advertiser', 'opportunity_submitter', 'admin', 'household_viewer')),
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'suspended')),
  is_prototype_seed INTEGER NOT NULL DEFAULT 0 CHECK (is_prototype_seed IN (0, 1)),
  created_at TEXT NOT NULL
    CHECK (
      strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) = created_at
    )
);

CREATE TABLE IF NOT EXISTS edison_auth_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL
    CHECK (
      length(token_hash) = 64
      AND token_hash NOT GLOB '*[^a-f0-9]*'
    ),
  session_id TEXT NOT NULL UNIQUE CHECK (length(session_id) BETWEEN 1 AND 64),
  user_id TEXT NOT NULL REFERENCES edison_auth_users(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('advertiser', 'opportunity_submitter', 'admin', 'household_viewer')),
  csrf_token TEXT NOT NULL
    CHECK (
      length(csrf_token) = 48
      AND csrf_token NOT GLOB '*[^a-f0-9]*'
    ),
  created_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  idle_expires_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  CHECK (
    strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS NOT NULL
    AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) = created_at
    AND strftime('%Y-%m-%dT%H:%M:%fZ', last_activity_at) IS NOT NULL
    AND strftime('%Y-%m-%dT%H:%M:%fZ', last_activity_at) = last_activity_at
    AND strftime('%Y-%m-%dT%H:%M:%fZ', idle_expires_at) IS NOT NULL
    AND strftime('%Y-%m-%dT%H:%M:%fZ', idle_expires_at) = idle_expires_at
    AND strftime('%Y-%m-%dT%H:%M:%fZ', expires_at) IS NOT NULL
    AND strftime('%Y-%m-%dT%H:%M:%fZ', expires_at) = expires_at
  )
);

CREATE INDEX IF NOT EXISTS idx_edison_auth_sessions_user
  ON edison_auth_sessions (user_id, expires_at);

CREATE TABLE IF NOT EXISTS edison_auth_audit_logs (
  audit_id TEXT PRIMARY KEY NOT NULL CHECK (length(audit_id) BETWEEN 1 AND 64),
  actor_id TEXT,
  actor_role TEXT NOT NULL
    CHECK (actor_role IN ('advertiser', 'opportunity_submitter', 'admin', 'household_viewer', 'anonymous', 'system')),
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 120),
  target_type TEXT NOT NULL DEFAULT 'auth' CHECK (target_type = 'auth'),
  target_id TEXT NOT NULL CHECK (length(target_id) BETWEEN 1 AND 512),
  detail TEXT NOT NULL CHECK (length(detail) <= 8192),
  created_at TEXT NOT NULL
    CHECK (
      strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) = created_at
    )
);

CREATE INDEX IF NOT EXISTS idx_edison_auth_audit_created
  ON edison_auth_audit_logs (created_at DESC, audit_id);

CREATE INDEX IF NOT EXISTS idx_edison_auth_audit_actor
  ON edison_auth_audit_logs (actor_id, created_at DESC);
