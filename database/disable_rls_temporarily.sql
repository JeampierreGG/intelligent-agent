-- Script para deshabilitar temporalmente RLS y permitir que funcione los recursos educativos
-- EJECUTAR ESTE SCRIPT EN EL SQL EDITOR DE SUPABASE

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE educational_resources DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS está deshabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'educational_resources';

-- 3. Verificar que la tabla existe y tiene la estructura correcta
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'educational_resources'
ORDER BY ordinal_position;

-- 4. Para volver a habilitar RLS más tarde (NO EJECUTAR AHORA):
-- ALTER TABLE educational_resources ENABLE ROW LEVEL SECURITY;

-- 5. Verificar datos existentes
SELECT * FROM educational_resources LIMIT 5;