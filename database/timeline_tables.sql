-- Tablas normalizadas para gestionar línea de tiempo y progreso por evento
-- 1) educational_timelines: metadatos de la línea de tiempo por recurso
-- 2) educational_timeline_events: contenido de cada evento (ordenado por idx)
-- 3) educational_timeline_event_progress: progreso por usuario y evento (checkbox activado)

-- NOTA: Si ya existe la tabla educational_timeline_progress y deseas migrar, primero crea estas tablas.
-- Luego podrás eliminar la tabla antigua con:
-- DROP TABLE IF EXISTS educational_timeline_progress;

CREATE TABLE IF NOT EXISTS educational_timelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  events_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_educational_timelines_user_id ON educational_timelines(user_id);
CREATE INDEX IF NOT EXISTS idx_educational_timelines_resource_id ON educational_timelines(resource_id);

ALTER TABLE educational_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timelines" ON educational_timelines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timelines" ON educational_timelines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timelines" ON educational_timelines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_educational_timelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_educational_timelines_updated_at
  BEFORE UPDATE ON educational_timelines
  FOR EACH ROW
  EXECUTE FUNCTION update_educational_timelines_updated_at();

-- Contenido de eventos de la línea de tiempo
CREATE TABLE IF NOT EXISTS educational_timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES educational_timelines(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL, -- posición en la secuencia
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT, -- texto de fecha (se muestra año cuando aplique)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, timeline_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_timeline_id ON educational_timeline_events(timeline_id);

ALTER TABLE educational_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timeline events" ON educational_timeline_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline events" ON educational_timeline_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Progreso por usuario y evento
CREATE TABLE IF NOT EXISTS educational_timeline_event_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES educational_timelines(id) ON DELETE CASCADE,
  event_idx INTEGER NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, timeline_id, event_idx)
);

CREATE INDEX IF NOT EXISTS idx_timeline_event_progress_timeline_id ON educational_timeline_event_progress(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_progress_user_id ON educational_timeline_event_progress(user_id);

ALTER TABLE educational_timeline_event_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timeline event progress" ON educational_timeline_event_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline event progress" ON educational_timeline_event_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline event progress" ON educational_timeline_event_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_timeline_event_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timeline_event_progress_updated_at
  BEFORE UPDATE ON educational_timeline_event_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_event_progress_updated_at();