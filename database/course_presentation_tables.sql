-- Tablas para Course Presentation y sus slides, y relación opcional desde educational_study_elements
-- Ejecutar este script en Supabase para habilitar persistencia completa de course_presentation

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/*
=====================================================
  1) Course Presentation (metadatos y slides)
=====================================================
*/

CREATE TABLE IF NOT EXISTS educational_course_presentations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  background_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE educational_course_presentations DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_course_presentations_resource_id ON educational_course_presentations(resource_id);

CREATE TABLE IF NOT EXISTS educational_course_presentation_slides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_presentation_id UUID NOT NULL REFERENCES educational_course_presentations(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_presentation_id, order_index)
);

ALTER TABLE educational_course_presentation_slides DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_course_presentation_slides_cp_id ON educational_course_presentation_slides(course_presentation_id);

/*
=====================================================
  2) Relación opcional desde educational_study_elements
=====================================================
*/

ALTER TABLE educational_study_elements
  ADD COLUMN IF NOT EXISTS course_presentation_id UUID REFERENCES educational_course_presentations(id) ON DELETE SET NULL;

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
  -- educational_course_presentations
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_course_presentations'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_course_presentations
    BEFORE UPDATE ON educational_course_presentations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_course_presentation_slides
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_course_presentation_slides'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_course_presentation_slides
    BEFORE UPDATE ON educational_course_presentation_slides
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;