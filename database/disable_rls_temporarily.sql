-- Script para deshabilitar temporalmente RLS y permitir que funcione el cuestionario
-- EJECUTAR ESTE SCRIPT EN EL SQL EDITOR DE SUPABASE

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE questionnaire_responses DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS está deshabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'questionnaire_responses';

-- 3. Verificar que la tabla existe y tiene la estructura correcta
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'questionnaire_responses' 
ORDER BY ordinal_position;

-- 4. Probar inserción manual (opcional para verificar)
-- INSERT INTO questionnaire_responses (
--   user_id, 
--   academic_level, 
--   format_preferences, 
--   interactive_activities
-- ) VALUES (
--   '280ef0ea-ed0a-4b26-a632-504992637fc8',
--   'Universidad',
--   ARRAY['Resúmenes cortos y esquemáticos'],
--   ARRAY['Cuestionarios interactivos']
-- );

-- 5. Para volver a habilitar RLS más tarde (NO EJECUTAR AHORA):
-- ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- 6. Verificar datos existentes
SELECT * FROM questionnaire_responses LIMIT 5;