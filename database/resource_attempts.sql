-- Tabla para registrar intentos por recurso y usuario
-- Ejecutar este script en Supabase

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS educational_resource_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, user_id, attempt_number)
);

ALTER TABLE educational_resource_attempts DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_attempts_res_user ON educational_resource_attempts(resource_id, user_id);

-- Trigger genérico updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_resource_attempts'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_resource_attempts
    BEFORE UPDATE ON educational_resource_attempts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;