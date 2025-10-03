-- Script SQL para eliminar completamente la tabla questionnaire_responses de Supabase
-- Este script debe ejecutarse en el SQL Editor de Supabase

-- IMPORTANTE: Este script eliminará permanentemente todos los datos del cuestionario
-- Asegúrate de hacer un backup si necesitas conservar algún dato

-- 1. Eliminar las políticas de Row Level Security
DROP POLICY IF EXISTS "Users can view their own questionnaire responses" ON questionnaire_responses;
DROP POLICY IF EXISTS "Users can insert their own questionnaire responses" ON questionnaire_responses;
DROP POLICY IF EXISTS "Users can update their own questionnaire responses" ON questionnaire_responses;

-- 2. Eliminar el trigger
DROP TRIGGER IF EXISTS update_questionnaire_responses_updated_at ON questionnaire_responses;

-- 3. Eliminar el índice
DROP INDEX IF EXISTS idx_questionnaire_responses_user_id;

-- 4. Eliminar la tabla (esto también eliminará automáticamente las políticas restantes)
DROP TABLE IF EXISTS questionnaire_responses CASCADE;

-- 5. Eliminar la función si no se usa en otras tablas
-- NOTA: Solo descomenta la siguiente línea si estás seguro de que la función
-- update_updated_at_column() no se usa en otras tablas
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verificar que la tabla se eliminó correctamente
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_name = 'questionnaire_responses' 
  AND table_schema = 'public';

-- Si la consulta anterior no devuelve ningún resultado, la tabla se eliminó exitosamente