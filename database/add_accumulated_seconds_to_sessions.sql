-- Agrega columna para acumular segundos de estudio por sesión (pausas/reanudaciones)
-- Ejecutar en Supabase

ALTER TABLE educational_resource_sessions
  ADD COLUMN IF NOT EXISTS accumulated_seconds INTEGER NOT NULL DEFAULT 0;

-- Opcional: índice si consultas por accumulated_seconds (no es necesario por ahora)
-- CREATE INDEX IF NOT EXISTS idx_resource_sessions_accumulated_seconds ON educational_resource_sessions(accumulated_seconds);