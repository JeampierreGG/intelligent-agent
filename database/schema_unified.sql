-- Learn Playing: Esquema unificado (sin imágenes)
-- Ejecutar en Supabase. Idempotente donde es posible.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* =====================================================
   Usuarios: perfiles
===================================================== */
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  fecha_nacimiento date not null,
  nivel_academico text not null check (nivel_academico in ('Primaria','Secundaria','Preuniversitario','Universitario','Posgrado')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_nivel ON public.user_profiles(nivel_academico);

CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

/* =====================================================
   Recursos educativos
===================================================== */
CREATE TABLE IF NOT EXISTS public.educational_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('Básico','Intermedio','Avanzado')),
  content jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Columna opcional para guardar las claves de elementos seleccionados (juego/estudio)
ALTER TABLE public.educational_resources
  ADD COLUMN IF NOT EXISTS selected_elements text[];

ALTER TABLE public.educational_resources ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_educational_resources_user_id ON public.educational_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_educational_resources_subject ON public.educational_resources(subject);
CREATE INDEX IF NOT EXISTS idx_educational_resources_difficulty ON public.educational_resources(difficulty);
CREATE INDEX IF NOT EXISTS idx_educational_resources_created_at ON public.educational_resources(created_at DESC);

CREATE POLICY "Users can view their own resources" ON public.educational_resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own resources" ON public.educational_resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own resources" ON public.educational_resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own resources" ON public.educational_resources FOR DELETE USING (auth.uid() = user_id);

/* =====================================================
   Intentos
===================================================== */
CREATE TABLE IF NOT EXISTS public.educational_resource_attempts (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.educational_resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(resource_id, user_id, attempt_number)
);
ALTER TABLE public.educational_resource_attempts DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attempts_res_user ON public.educational_resource_attempts(resource_id, user_id);

-- Eliminado: sesiones/temporizador. No se usará tracking de tiempo a nivel de BD.

/* =====================================================
   Puntajes (sin imágenes)
===================================================== */
CREATE TABLE IF NOT EXISTS public.user_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.educational_resources(id) on delete cascade,
  attempt_id uuid,
  attempt_number integer,
  progress_pct numeric(5,2) default 0,
  max_score integer default 200,
  percentage numeric(5,2),
  score numeric(5,2) not null default 0,
  computed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
ALTER TABLE public.user_scores DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_scores_user_id ON public.user_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_resource_id ON public.user_scores(resource_id);

-- Asegurar unicidad por intento para evitar duplicados
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_resource_attempt' AND conrelid = 'public.user_scores'::regclass
  ) THEN
    ALTER TABLE public.user_scores ADD CONSTRAINT unique_user_resource_attempt UNIQUE (user_id, resource_id, attempt_id);
  END IF;
END $$;


/* =====================================================
   Triggers updated_at
===================================================== */
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_user_profiles') THEN
    CREATE TRIGGER trg_set_updated_at_user_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_resources') THEN
    CREATE TRIGGER trg_set_updated_at_resources BEFORE UPDATE ON public.educational_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_resource_attempts') THEN
    CREATE TRIGGER trg_set_updated_at_resource_attempts BEFORE UPDATE ON public.educational_resource_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  -- Eliminado: trigger para sesiones
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_user_scores') THEN
    CREATE TRIGGER trg_set_updated_at_user_scores BEFORE UPDATE ON public.user_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

/* =====================================================
   Attempt element scores
===================================================== */
CREATE TABLE IF NOT EXISTS public.educational_attempt_element_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.educational_resources(id) on delete cascade,
  attempt_id uuid not null references public.educational_resource_attempts(id) on delete cascade,
  attempt_number integer not null,
  element_type text not null check (element_type in ('timeline','course_presentation','accordion_notes','mnemonic_creator','quiz','lines','group_sort','open_box','anagram','find_the_match')),
  element_name text,
  element_index smallint,
  total_items integer not null default 0,
  correct_items integer not null default 0,
  max_points integer not null default 20,
  points_scored numeric(6,2) not null default 0,
  reviewed boolean not null default false,
  computed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(attempt_id, element_type)
);
ALTER TABLE public.educational_attempt_element_scores DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attempt_element_scores_attempt ON public.educational_attempt_element_scores(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_element_scores_user ON public.educational_attempt_element_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_attempt_element_scores_resource ON public.educational_attempt_element_scores(resource_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'educational_attempt_element_scores' AND column_name = 'reviewed'
  ) THEN
    ALTER TABLE public.educational_attempt_element_scores ADD COLUMN reviewed boolean not null default false;
  END IF;
END $$;

/* =====================================================
   Attempt item scores
===================================================== */
CREATE TABLE IF NOT EXISTS public.educational_attempt_item_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.educational_resources(id) on delete cascade,
  attempt_id uuid not null references public.educational_resource_attempts(id) on delete cascade,
  attempt_number integer not null,
  element_type text not null check (element_type in ('quiz','lines','group_sort','open_box','anagram','find_the_match')),
  element_item_index integer not null,
  element_item_key text,
  max_points_item integer not null default 20,
  points_scored_item numeric(6,2) not null default 0,
  correct boolean not null default false,
  computed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(attempt_id, element_type, element_item_index)
);
ALTER TABLE public.educational_attempt_item_scores DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attempt_item_scores_attempt ON public.educational_attempt_item_scores(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_item_scores_user ON public.educational_attempt_item_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_attempt_item_scores_resource ON public.educational_attempt_item_scores(resource_id);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'educational_attempt_element_scores'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_attempt_element_scores'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_attempt_element_scores BEFORE UPDATE ON public.educational_attempt_element_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'educational_attempt_item_scores'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_attempt_item_scores'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_attempt_item_scores BEFORE UPDATE ON public.educational_attempt_item_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

/* =====================================================
   Attempt summaries (resumen JSON por intento)
===================================================== */
CREATE TABLE IF NOT EXISTS public.educational_attempt_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.educational_resources(id) on delete cascade,
  attempt_id uuid not null references public.educational_resource_attempts(id) on delete cascade,
  attempt_number integer not null,
  summary_snapshot jsonb,
  computed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(attempt_id)
);
ALTER TABLE public.educational_attempt_summaries DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attempt_summaries_attempt ON public.educational_attempt_summaries(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_summaries_user ON public.educational_attempt_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_attempt_summaries_resource ON public.educational_attempt_summaries(resource_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_attempt_summaries'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_attempt_summaries BEFORE UPDATE ON public.educational_attempt_summaries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

/* =====================================================
   Public display names (para ranking y listados)
===================================================== */
CREATE TABLE IF NOT EXISTS public.user_public_names (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  updated_at timestamptz default now()
);
ALTER TABLE public.user_public_names DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_public_names_user ON public.user_public_names(user_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_user_public_names'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_user_public_names BEFORE UPDATE ON public.user_public_names FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

/* =====================================================
   Alteraciones para eliminar columnas de progreso
   (idempotentes: solo si existen)
===================================================== */
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'educational_attempt_element_scores' AND column_name = 'progress_pct'
  ) THEN
    ALTER TABLE public.educational_attempt_element_scores DROP COLUMN progress_pct;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'educational_attempt_item_scores' AND column_name = 'progress_pct_item'
  ) THEN
    ALTER TABLE public.educational_attempt_item_scores DROP COLUMN progress_pct_item;
  END IF;
END $$;

/* =====================================================
   Alteraciones específicas de user_scores (idempotentes)
===================================================== */
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_scores' AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE public.user_scores DROP COLUMN time_spent_seconds;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_scores' AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE public.user_scores DROP COLUMN total_questions;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_scores' AND column_name = 'correct_answers'
  ) THEN
    ALTER TABLE public.user_scores DROP COLUMN correct_answers;
  END IF;
END $$;
