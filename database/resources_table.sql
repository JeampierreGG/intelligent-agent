-- Tabla para almacenar los recursos educativos generados
CREATE TABLE IF NOT EXISTS educational_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Básico', 'Intermedio', 'Avanzado')),
  content JSONB NOT NULL, -- Almacena el contenido completo del recurso
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_educational_resources_user_id ON educational_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_educational_resources_subject ON educational_resources(subject);
CREATE INDEX IF NOT EXISTS idx_educational_resources_difficulty ON educational_resources(difficulty);
CREATE INDEX IF NOT EXISTS idx_educational_resources_created_at ON educational_resources(created_at DESC);

-- RLS (Row Level Security) para que los usuarios solo vean sus propios recursos
ALTER TABLE educational_resources ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver sus propios recursos
CREATE POLICY "Users can view their own resources" ON educational_resources
  FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios solo puedan insertar sus propios recursos
CREATE POLICY "Users can insert their own resources" ON educational_resources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios solo puedan actualizar sus propios recursos
CREATE POLICY "Users can update their own resources" ON educational_resources
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los usuarios solo puedan eliminar sus propios recursos
CREATE POLICY "Users can delete their own resources" ON educational_resources
  FOR DELETE USING (auth.uid() = user_id);

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_educational_resources_updated_at
  BEFORE UPDATE ON educational_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();