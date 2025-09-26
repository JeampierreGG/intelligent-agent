-- Script SQL para crear/actualizar la tabla de cuestionarios en Supabase
-- Este script debe ejecutarse en el SQL Editor de Supabase

-- Eliminar la tabla existente si existe (solo para desarrollo)
-- DROP TABLE IF EXISTS questionnaire_responses;

-- Crear la tabla de respuestas del cuestionario
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_level TEXT NOT NULL,
  format_preferences TEXT[] NOT NULL DEFAULT '{}',
  interactive_activities TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para mejorar el rendimiento de las consultas por user_id
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id 
ON questionnaire_responses(user_id);

-- Crear función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_questionnaire_responses_updated_at ON questionnaire_responses;
CREATE TRIGGER update_questionnaire_responses_updated_at
    BEFORE UPDATE ON questionnaire_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
-- Los usuarios solo pueden ver y modificar sus propias respuestas
CREATE POLICY "Users can view their own questionnaire responses" 
ON questionnaire_responses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questionnaire responses" 
ON questionnaire_responses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questionnaire responses" 
ON questionnaire_responses FOR UPDATE 
USING (auth.uid() = user_id);

-- Comentarios para documentar la estructura
COMMENT ON TABLE questionnaire_responses IS 'Almacena las respuestas del cuestionario inicial de personalización de cada usuario';
COMMENT ON COLUMN questionnaire_responses.user_id IS 'ID del usuario que completó el cuestionario';
COMMENT ON COLUMN questionnaire_responses.academic_level IS 'Nivel académico actual del usuario';
COMMENT ON COLUMN questionnaire_responses.format_preferences IS 'Array de preferencias de formato de aprendizaje (máximo 3)';
COMMENT ON COLUMN questionnaire_responses.interactive_activities IS 'Array de actividades interactivas preferidas (máximo 4)';

-- Verificar que la tabla se creó correctamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'questionnaire_responses' 
ORDER BY ordinal_position;