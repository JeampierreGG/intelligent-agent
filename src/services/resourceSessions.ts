// Temporizador y sesiones eliminados: se exportan funciones no-op para mantener compatibilidad

export type ResourceSession = {
  id: string
  user_id: string
  resource_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  accumulated_seconds: number | null
}

export async function getActiveResourceSession(_userId: string, _resourceId: string): Promise<ResourceSession | null> {
  void _userId; void _resourceId;
  return null
}

export async function getActiveSessionsForUser(_userId: string): Promise<ResourceSession[]> {
  void _userId;
  return []
}

export async function startResourceSession(_userId: string, _resourceId: string): Promise<ResourceSession | null> {
  void _userId; void _resourceId;
  return null
}

export async function endResourceSession(_sessionId: string): Promise<boolean> {
  void _sessionId;
  return true
}

export async function getUserTotalStudySeconds(_userId: string): Promise<number> {
  void _userId;
  return 0
}

export async function addAccumulatedSeconds(_sessionId: string, _additionalSeconds: number): Promise<boolean> {
  void _sessionId; void _additionalSeconds;
  return true
}

export async function getTotalAccumulatedSecondsForResource(_userId: string, _resourceId: string): Promise<number> {
  void _userId; void _resourceId;
  return 0
}
