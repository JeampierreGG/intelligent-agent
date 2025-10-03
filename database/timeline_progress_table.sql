-- Tabla para almacenar el progreso de la línea de tiempo por recurso y usuario
CREATE TABLE IF NOT EXISTS educational_timeline_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  progress_index INTEGER NOT NULL DEFAULT 0, -- Índice actual (tarjeta activa/completada)
  checked_indices INTEGER[] NOT NULL DEFAULT '{}', -- Índices marcados (para trazabilidad)
  events_count INTEGER NOT NULL DEFAULT 0, -- Cantidad total de eventos mostrados
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_timeline_progress_user_id ON educational_timeline_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_progress_resource_id ON educational_timeline_progress(resource_id);

-- RLS
ALTER TABLE educational_timeline_progress ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view their own timeline progress" ON educational_timeline_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline progress" ON educational_timeline_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline progress" ON educational_timeline_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_timeline_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timeline_progress_updated_at
  BEFORE UPDATE ON educational_timeline_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_progress_updated_at();