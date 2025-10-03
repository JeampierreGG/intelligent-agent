-- Script para actualizar la estructura de la base de datos de Learn Playing
-- EJECUTAR ESTE SCRIPT EN EL SQL EDITOR DE SUPABASE

-- 1. ELIMINAR EL CAMPO resource_type DE LA TABLA educational_resources
ALTER TABLE educational_resources DROP COLUMN IF EXISTS resource_type;

-- 1.b ELIMINAR EL CAMPO selected_games DE LA TABLA educational_resources
ALTER TABLE educational_resources DROP COLUMN IF EXISTS selected_games;

-- 2. CREAR TABLA user_profiles PARA DATOS ADICIONALES DEL USUARIO
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  fecha_nacimiento DATE NOT NULL,
  objetivo_aprendizaje TEXT NOT NULL CHECK (objetivo_aprendizaje IN ('Desarrollo académico', 'Crecimiento profesional', 'Hobby personal', 'Certificación')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_objetivo ON user_profiles(objetivo_aprendizaje);

-- RLS para user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. CREAR TABLA user_scores PARA PUNTUACIONES Y RANKING
CREATE TABLE IF NOT EXISTS user_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- Tipo de juego H5P (QuestionSet, MultiChoice, etc.)
  score INTEGER NOT NULL DEFAULT 0, -- Puntuación obtenida
  max_score INTEGER NOT NULL DEFAULT 0, -- Puntuación máxima posible
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- Porcentaje de acierto
  time_spent INTEGER DEFAULT 0, -- Tiempo en segundos
  attempts INTEGER NOT NULL DEFAULT 1, -- Número de intentos
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_scores
CREATE INDEX IF NOT EXISTS idx_user_scores_user_id ON user_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_resource_id ON user_scores(resource_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_completed_at ON user_scores(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_scores_score ON user_scores(score DESC);

-- RLS para user_scores
ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;

-- Políticas para user_scores
CREATE POLICY "Users can view their own scores" ON user_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores" ON user_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores" ON user_scores
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para ver ranking global (solo lectura de puntuaciones totales)
CREATE POLICY "Users can view ranking data" ON user_scores
  FOR SELECT USING (true); -- Permite ver datos para ranking global

-- 4. CREAR VISTA PARA RANKING GLOBAL
CREATE OR REPLACE VIEW ranking_global AS
SELECT 
  u.id as user_id,
  COALESCE(up.user_id, u.id) as profile_user_id,
  u.email,
  -- Extraer nombre del email si no hay perfil
  CASE 
    WHEN u.raw_user_meta_data->>'full_name' IS NOT NULL 
    THEN u.raw_user_meta_data->>'full_name'
    ELSE SPLIT_PART(u.email, '@', 1)
  END as nombre_estudiante,
  COALESCE(SUM(us.score), 0) as puntos_totales,
  COUNT(DISTINCT us.resource_id) as recursos_completados,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(us.score), 0) DESC) as posicion
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_scores us ON u.id = us.user_id
GROUP BY u.id, u.email, u.raw_user_meta_data, up.user_id
ORDER BY puntos_totales DESC;

-- 5. FUNCIÓN PARA ACTUALIZAR updated_at EN user_profiles
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- 6. VERIFICAR ESTRUCTURA ACTUALIZADA
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('educational_resources', 'user_profiles', 'user_scores')
ORDER BY table_name, ordinal_position;

-- 7. VERIFICAR VISTAS CREADAS
SELECT viewname FROM pg_views WHERE viewname = 'ranking_global';