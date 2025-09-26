-- Script para deshabilitar temporalmente RLS y permitir que funcione el cuestionario y recursos
-- EJECUTAR ESTE SCRIPT EN EL SQL EDITOR DE SUPABASE

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE questionnaire_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE educational_resources DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS está deshabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('questionnaire_responses', 'educational_resources');

-- 3. Verificar que las tablas existen y tienen la estructura correcta
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('questionnaire_responses', 'educational_resources')
ORDER BY table_name, ordinal_position;

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
-- ALTER TABLE educational_resources ENABLE ROW LEVEL SECURITY;

-- 6. Verificar datos existentes
SELECT * FROM questionnaire_responses LIMIT 5;
SELECT * FROM educational_resources LIMIT 5;