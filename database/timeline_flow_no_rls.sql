-- Script SQL: Flujo de Línea de Tiempo y Matchups (RLS deshabilitado)
-- Objetivo: Modelar el flujo solicitado en Supabase para:
-- 1) Vincular cada educational_resource con EXACTAMENTE dos elementos de estudio (según curso/tema).
-- 2) Definir contenido de la línea de tiempo con checkbox por evento.
-- 3) Registrar progreso por usuario (checkbox irreversible por evento).
-- 4) Vincular recursos con juegos tipo matchup (líneas o imágenes).
-- 5) Mantener RLS deshabilitado en todas las tablas nuevas.

-- Notas:
-- - Este script NO habilita RLS en ninguna tabla.
-- - Referencia tablas existentes: educational_resources, auth.users.
-- - Se incluye columna para preferencia de animación de flecha (lateral/vertical/none) a nivel de timeline.

-- Requisitos
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpieza opcional de tabla antigua (si existe)
DROP TABLE IF EXISTS educational_timeline_progress;

/*
=====================================================
  1) Línea de tiempo (metadatos y contenido)
=====================================================
*/

-- Metadatos de la línea de tiempo por recurso
CREATE TABLE IF NOT EXISTS educational_timelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  -- Preferencia de animación de flecha en UI: 'lateral' (por defecto), 'vertical', 'none'
  arrow_style TEXT NOT NULL DEFAULT 'lateral' CHECK (arrow_style IN ('lateral','vertical','none')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id)
);

ALTER TABLE educational_timelines DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_timelines_resource_id ON educational_timelines(resource_id);

-- Eventos/Contenido de la línea de tiempo
CREATE TABLE IF NOT EXISTS educational_timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID NOT NULL REFERENCES educational_timelines(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT,
  content_text TEXT,
  image_url TEXT,
  -- Define si el evento tiene checkbox en UI
  has_checkbox BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(timeline_id, order_index)
);

ALTER TABLE educational_timeline_events DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_timeline_events_timeline_id ON educational_timeline_events(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_order_index ON educational_timeline_events(order_index);

-- Progreso por usuario y evento (checkbox irreversible)
CREATE TABLE IF NOT EXISTS educational_timeline_event_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES educational_timeline_events(id) ON DELETE CASCADE,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE educational_timeline_event_progress DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_progress_user_id ON educational_timeline_event_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_event_progress_event_id ON educational_timeline_event_progress(event_id);

/*
=====================================================
  2) Elementos de estudio por recurso (exactamente dos)
  (Se moverá más abajo, después de crear tablas de matchups)
=====================================================
*/

/*
=====================================================
  3) Matchups de líneas
=====================================================
*/

CREATE TABLE IF NOT EXISTS educational_matchup_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE educational_matchup_lines DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_matchup_lines_resource_id ON educational_matchup_lines(resource_id);

CREATE TABLE IF NOT EXISTS educational_matchup_line_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  matchup_lines_id UUID NOT NULL REFERENCES educational_matchup_lines(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  left_text TEXT,
  right_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(matchup_lines_id, order_index)
);

ALTER TABLE educational_matchup_line_pairs DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_line_pairs_matchup_lines_id ON educational_matchup_line_pairs(matchup_lines_id);

/*
=====================================================
  4) Matchups de imágenes
=====================================================
*/

CREATE TABLE IF NOT EXISTS educational_matchup_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE educational_matchup_images DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_matchup_images_resource_id ON educational_matchup_images(resource_id);

CREATE TABLE IF NOT EXISTS educational_matchup_image_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  matchup_images_id UUID NOT NULL REFERENCES educational_matchup_images(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  image_url TEXT,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(matchup_images_id, order_index)
);

ALTER TABLE educational_matchup_image_items DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_image_items_matchup_images_id ON educational_matchup_image_items(matchup_images_id);

/*
=====================================================
  2) Elementos de estudio por recurso (exactamente dos)
=====================================================
*/

-- Tipos de elementos de estudio soportados:
-- 'timeline' | 'course_presentation' | 'accordion_notes' | 'matchup_lines' | 'matchup_images'
CREATE TABLE IF NOT EXISTS educational_study_elements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL CHECK (position IN (1,2)), -- fuerza máximo dos elementos por recurso
  element_type TEXT NOT NULL CHECK (
    element_type IN ('timeline','course_presentation','accordion_notes','matchup_lines','matchup_images')
  ),
  -- Referencias opcionales según el tipo
  timeline_id UUID REFERENCES educational_timelines(id) ON DELETE SET NULL,
  matchup_lines_id UUID REFERENCES educational_matchup_lines(id) ON DELETE SET NULL,
  matchup_images_id UUID REFERENCES educational_matchup_images(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, position),
  -- Consistencia: sólo un FK según el tipo
  CHECK (
    (element_type = 'timeline' AND timeline_id IS NOT NULL AND matchup_lines_id IS NULL AND matchup_images_id IS NULL) OR
    (element_type = 'matchup_lines' AND timeline_id IS NULL AND matchup_lines_id IS NOT NULL AND matchup_images_id IS NULL) OR
    (element_type = 'matchup_images' AND timeline_id IS NULL AND matchup_lines_id IS NULL AND matchup_images_id IS NOT NULL) OR
    (element_type IN ('course_presentation','accordion_notes') AND timeline_id IS NULL AND matchup_lines_id IS NULL AND matchup_images_id IS NULL)
  )
);

ALTER TABLE educational_study_elements DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_study_elements_resource_id ON educational_study_elements(resource_id);

/*
=====================================================
  5) Triggers de updated_at (genéricos)
=====================================================
*/

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger a todas las tablas con updated_at
DO $$
BEGIN
  PERFORM 1;
  -- educational_timelines
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_timelines'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_timelines
    BEFORE UPDATE ON educational_timelines
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_timeline_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_timeline_events'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_timeline_events
    BEFORE UPDATE ON educational_timeline_events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_timeline_event_progress
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_timeline_event_progress'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_timeline_event_progress
    BEFORE UPDATE ON educational_timeline_event_progress
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_study_elements
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_study_elements'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_study_elements
    BEFORE UPDATE ON educational_study_elements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_matchup_lines
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_matchup_lines'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_matchup_lines
    BEFORE UPDATE ON educational_matchup_lines
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_matchup_line_pairs
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_matchup_line_pairs'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_matchup_line_pairs
    BEFORE UPDATE ON educational_matchup_line_pairs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_matchup_images
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_matchup_images'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_matchup_images
    BEFORE UPDATE ON educational_matchup_images
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- educational_matchup_image_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_matchup_image_items'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_matchup_image_items
    BEFORE UPDATE ON educational_matchup_image_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Fin del script