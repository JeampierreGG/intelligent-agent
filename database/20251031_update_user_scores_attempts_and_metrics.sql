-- Add attempt metrics and ensure unique rows per attempt and element in user_scores
-- Safe to run multiple times; uses IF NOT EXISTS where possible

DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_scores' AND column_name = 'attempt_id'
  ) THEN
    ALTER TABLE public.user_scores ADD COLUMN attempt_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_scores' AND column_name = 'attempt_number'
  ) THEN
    ALTER TABLE public.user_scores ADD COLUMN attempt_number integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_scores' AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE public.user_scores ADD COLUMN time_spent_seconds integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_scores' AND column_name = 'progress_pct'
  ) THEN
    ALTER TABLE public.user_scores ADD COLUMN progress_pct numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_scores' AND column_name = 'max_score'
  ) THEN
    ALTER TABLE public.user_scores ADD COLUMN max_score integer DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_scores' AND column_name = 'percentage'
  ) THEN
    ALTER TABLE public.user_scores ADD COLUMN percentage numeric(5,2);
  END IF;

  -- Ensure a unique index that includes attempt_number so multiple attempts are tracked separately
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_user_scores_per_attempt_element'
  ) THEN
    CREATE UNIQUE INDEX uq_user_scores_per_attempt_element ON public.user_scores(
      user_id, resource_id, attempt_number, matchup_lines_id, matchup_images_id
    );
  END IF;
END $$;

-- Optional: basic foreign key to attempts table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'educational_resource_attempts'
  ) THEN
    BEGIN
      ALTER TABLE public.user_scores
      ADD CONSTRAINT fk_user_scores_attempt
      FOREIGN KEY (attempt_id)
      REFERENCES public.educational_resource_attempts(id)
      ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      -- constraint already exists, ignore
    END;
  END IF;
END $$;