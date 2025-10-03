-- Configuración de Row Level Security (RLS) para la tabla user_profiles
-- Este script debe ejecutarse en el SQL Editor de Supabase

-- 1. Habilitar RLS en la tabla user_profiles (si no está habilitado)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Política para permitir que los usuarios autenticados puedan insertar sus propios perfiles
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Política para permitir que los usuarios puedan leer sus propios perfiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Política para permitir que los usuarios puedan actualizar sus propios perfiles
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- 5. Política para permitir que los usuarios puedan eliminar sus propios perfiles
CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';