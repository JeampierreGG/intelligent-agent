-- Migration: Add summary snapshot JSON to educational_resource_attempts
-- Purpose: Store a full snapshot of the end-of-resource summary per attempt

ALTER TABLE IF EXISTS educational_resource_attempts
  ADD COLUMN IF NOT EXISTS summary_snapshot JSONB;

-- Optional index to query attempts by user/resource quickly
CREATE INDEX IF NOT EXISTS idx_era_user_resource_attempt_summary ON educational_resource_attempts (user_id, resource_id, attempt_number DESC);