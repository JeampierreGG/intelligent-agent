-- Tablas para Accordion Notes: contenido por recurso y secciones
-- Ejecutar este script en Supabase para habilitar persistencia separada de notas en acordeón

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/*
=====================================================
  1) Accordion Notes (metadatos y secciones)
=====================================================
*/

CREATE TABLE IF NOT EXISTS educational_accordion_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE educational_accordion_notes DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_accordion_notes_resource_id ON educational_accordion_notes(resource_id);

CREATE TABLE IF NOT EXISTS educational_accordion_notes_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accordion_id UUID NOT NULL REFERENCES educational_accordion_notes(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(accordion_id, order_index)
);

ALTER TABLE educational_accordion_notes_sections DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_accordion_notes_sections_acc_id ON educational_accordion_notes_sections(accordion_id);

/*
=====================================================
  2) Relación opcional desde educational_study_elements
=====================================================
*/

ALTER TABLE educational_study_elements
  ADD COLUMN IF NOT EXISTS accordion_notes_id UUID REFERENCES educational_accordion_notes(id) ON DELETE SET NULL;

/*
=====================================================
  3) Trigger genérico updated_at
=====================================================
*/

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  -- educational_accordion_notes
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_accordion_notes'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_accordion_notes
    BEFORE UPDATE ON educational_accordion_notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_accordion_notes_sections
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_accordion_notes_sections'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_accordion_notes_sections
    BEFORE UPDATE ON educational_accordion_notes_sections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;