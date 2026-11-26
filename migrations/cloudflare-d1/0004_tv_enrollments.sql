CREATE TABLE IF NOT EXISTS edison_tv_enrollments (
  enrollment_id TEXT PRIMARY KEY CHECK (length(enrollment_id) BETWEEN 16 AND 80),
  device_id TEXT NOT NULL UNIQUE CHECK (length(device_id) BETWEEN 16 AND 80),
  owner_id TEXT CHECK (owner_id IS NULL OR length(owner_id) BETWEEN 1 AND 512),
  device_label TEXT NOT NULL CHECK (length(device_label) BETWEEN 2 AND 80),
  pairing_code_hash TEXT NOT NULL CHECK (length(pairing_code_hash) = 64),
  device_token_hash TEXT NOT NULL UNIQUE CHECK (length(device_token_hash) = 64),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'locked', 'expired', 'revoked')),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_at TEXT,
  revoked_at TEXT,
  CHECK (
    (status = 'pending' AND owner_id IS NULL AND approved_at IS NULL AND revoked_at IS NULL)
    OR (status = 'approved' AND owner_id IS NOT NULL AND approved_at IS NOT NULL AND revoked_at IS NULL)
    OR (status IN ('locked', 'expired') AND owner_id IS NULL AND approved_at IS NULL AND revoked_at IS NULL)
    OR (status = 'revoked' AND owner_id IS NOT NULL AND approved_at IS NOT NULL AND revoked_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_edison_tv_enrollments_owner
  ON edison_tv_enrollments (owner_id, created_at DESC);
