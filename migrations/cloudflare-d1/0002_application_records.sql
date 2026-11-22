CREATE TABLE IF NOT EXISTS edison_application_records (
  collection TEXT NOT NULL
    CHECK (
      length(collection) BETWEEN 1 AND 63
      AND collection NOT GLOB '*[^a-z0-9_]*'
    ),
  record_id TEXT NOT NULL CHECK (length(record_id) BETWEEN 1 AND 512),
  owner_id TEXT CHECK (owner_id IS NULL OR length(owner_id) BETWEEN 1 AND 512),
  payload_json TEXT NOT NULL
    CHECK (
      json_valid(payload_json)
      AND length(CAST(payload_json AS BLOB)) <= 262144
    ),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    CHECK (
      strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) = created_at
    ),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    CHECK (
      strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) = updated_at
    ),
  PRIMARY KEY (collection, record_id)
);

CREATE INDEX IF NOT EXISTS idx_edison_application_records_owner
  ON edison_application_records (collection, owner_id, updated_at DESC);
