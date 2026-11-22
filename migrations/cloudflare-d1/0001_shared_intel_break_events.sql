CREATE TABLE IF NOT EXISTS shared_intel_break_events (
  record_id TEXT PRIMARY KEY NOT NULL CHECK (length(record_id) BETWEEN 1 AND 512),
  event_id TEXT NOT NULL
    CHECK (
      length(event_id) BETWEEN 3 AND 120
      AND event_id NOT GLOB '*[^A-Za-z0-9._-]*'
    ),
  decoder_profile_id TEXT NOT NULL
    CHECK (
      length(decoder_profile_id) BETWEEN 2 AND 120
      AND decoder_profile_id NOT GLOB '*[^A-Za-z0-9._-]*'
    ),
  channel_id TEXT NOT NULL
    CHECK (
      length(channel_id) BETWEEN 3 AND 160
      AND channel_id NOT GLOB '*[^a-z0-9.-]*'
    ),
  scope_id TEXT NOT NULL CHECK (length(scope_id) BETWEEN 3 AND 160),
  break_started_at_utc TEXT NOT NULL
    CHECK (
      strftime('%Y-%m-%dT%H:%M:%fZ', break_started_at_utc) IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ', break_started_at_utc) = break_started_at_utc
    ),
  source_device_ids_json TEXT NOT NULL
    CHECK (json_valid(source_device_ids_json) AND json_type(source_device_ids_json) = 'array'),
  status TEXT NOT NULL
    CHECK (status IN ('shared_pending_corroboration', 'shared_corroborated', 'conflict_held')),
  contains_pii INTEGER NOT NULL DEFAULT 0 CHECK (contains_pii = 0),
  received_at_utc TEXT NOT NULL
    CHECK (
      strftime('%Y-%m-%dT%H:%M:%fZ', received_at_utc) IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ', received_at_utc) = received_at_utc
    )
);

CREATE INDEX IF NOT EXISTS idx_shared_intel_break_events_feed
  ON shared_intel_break_events (
    channel_id,
    decoder_profile_id,
    break_started_at_utc DESC
  );
