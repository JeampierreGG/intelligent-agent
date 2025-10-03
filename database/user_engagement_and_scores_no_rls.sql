-- Script SQL: Temporizador por recurso y puntajes de juegos (RLS deshabilitado)
-- Objetivo:
-- 1) Registrar sesiones por recurso (timer: inicio al presionar "comenzar", fin al terminar) para medir tiempo dedicado.
-- 2) Calcular y almacenar puntajes para elementos de juego (matchupline y matchupimage) en base a 100, dividiendo por número total de preguntas.
-- 3) Ajustar la tabla existente user_scores para el nuevo modelo (sin game_type) o crearla si no existe.
-- 4) Mantener RLS deshabilitado en todas las tablas afectadas.

-- Requisitos
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/*
=====================================================
  1) Sesiones por recurso (temporizador)
=====================================================
*/

-- Tabla para registrar cada sesión de estudio por recurso y usuario
CREATE TABLE IF NOT EXISTS educational_resource_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  -- Duración calculada automáticamente cuando existe ended_at
  duration_seconds INTEGER GENERATED ALWAYS AS ((EXTRACT(EPOCH FROM (ended_at - started_at)))::INT) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE educational_resource_sessions DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resource_sessions_user_id ON educational_resource_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_sessions_resource_id ON educational_resource_sessions(resource_id);

/*
=====================================================
  2) Ajustes a user_scores para puntajes de matchups (sin game_type)
=====================================================
*/

-- Si la tabla user_scores no existe, crearla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_scores' AND table_schema = 'public'
  ) THEN
    CREATE TABLE user_scores (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
      -- Referencia polimórfica: exactamente uno de estos debe estar presente
      matchup_lines_id UUID REFERENCES educational_matchup_lines(id) ON DELETE CASCADE,
      matchup_images_id UUID REFERENCES educational_matchup_images(id) ON DELETE CASCADE,
      total_questions INTEGER NOT NULL DEFAULT 0,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      score NUMERIC(5,2) NOT NULL DEFAULT 0, -- calculado en base a 100
      computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Deshabilitar RLS en user_scores
ALTER TABLE user_scores DISABLE ROW LEVEL SECURITY;

-- Remover game_type si existe
ALTER TABLE user_scores DROP COLUMN IF EXISTS game_type;

-- Asegurar columnas necesarias (solo se agregan si faltan)
ALTER TABLE user_scores
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS resource_id UUID,
  ADD COLUMN IF NOT EXISTS matchup_lines_id UUID,
  ADD COLUMN IF NOT EXISTS matchup_images_id UUID,
  ADD COLUMN IF NOT EXISTS total_questions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_answers INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Asegurar FK (si no existían)
DO $$
BEGIN
  -- FK user_id -> auth.users
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_scores_user_id'
  ) THEN
    ALTER TABLE user_scores
      ADD CONSTRAINT fk_user_scores_user_id FOREIGN KEY (user_id)
      REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- FK resource_id -> educational_resources
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_scores_resource_id'
  ) THEN
    ALTER TABLE user_scores
      ADD CONSTRAINT fk_user_scores_resource_id FOREIGN KEY (resource_id)
      REFERENCES educational_resources(id) ON DELETE CASCADE;
  END IF;

  -- FK matchup_lines_id -> educational_matchup_lines
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_scores_matchup_lines_id'
  ) THEN
    ALTER TABLE user_scores
      ADD CONSTRAINT fk_user_scores_matchup_lines_id FOREIGN KEY (matchup_lines_id)
      REFERENCES educational_matchup_lines(id) ON DELETE CASCADE;
  END IF;

  -- FK matchup_images_id -> educational_matchup_images
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_scores_matchup_images_id'
  ) THEN
    ALTER TABLE user_scores
      ADD CONSTRAINT fk_user_scores_matchup_images_id FOREIGN KEY (matchup_images_id)
      REFERENCES educational_matchup_images(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Consistencia: exactamente uno de matchup_lines_id o matchup_images_id debe estar presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_user_scores_single_matchup_ref'
  ) THEN
    ALTER TABLE user_scores
      ADD CONSTRAINT ck_user_scores_single_matchup_ref CHECK (
        (matchup_lines_id IS NOT NULL AND matchup_images_id IS NULL) OR
        (matchup_lines_id IS NULL AND matchup_images_id IS NOT NULL)
      );
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_scores_user_id ON user_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_resource_id ON user_scores(resource_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_scores_per_element
  ON user_scores(user_id, resource_id, matchup_lines_id, matchup_images_id);

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

-- Trigger para educational_resource_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_educational_resource_sessions'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_educational_resource_sessions
    BEFORE UPDATE ON educational_resource_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Trigger para user_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_user_scores'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_user_scores
    BEFORE UPDATE ON user_scores
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Fin del script