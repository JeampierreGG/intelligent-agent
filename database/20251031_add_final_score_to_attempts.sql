-- Migration: Add final score fields to educational_resource_attempts
-- Purpose: Persist the final weighted score for a complete resource attempt, including an optional JSON breakdown

BEGIN;

-- Add columns if they don't already exist
ALTER TABLE IF EXISTS educational_resource_attempts
  ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS final_score_breakdown JSONB;

-- Optional helper index to quickly query latest attempts with final_score
CREATE INDEX IF NOT EXISTS idx_era_user_resource_attempt ON educational_resource_attempts (user_id, resource_id, attempt_number DESC);

COMMIT;