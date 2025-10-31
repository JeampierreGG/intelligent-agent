import { supabase } from './supabase'

const ATTEMPT_LOCAL_PREFIX = 'attempts'

const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('educational_resources').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export async function getAttemptCount(resourceId: string, userId: string): Promise<number> {
  const supa = await isSupabaseAvailable()
  if (supa) {
    const { count, error } = await supabase
      .from('educational_resource_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
    if (error) throw error
    return count || 0
  }
  const key = `${ATTEMPT_LOCAL_PREFIX}:${userId}:${resourceId}`
  const raw = localStorage.getItem(key)
  return raw ? parseInt(raw, 10) || 0 : 0
}

export async function startNewAttempt(resourceId: string, userId: string): Promise<{ id?: string; attemptNumber: number }> {
  const supa = await isSupabaseAvailable()
  const current = await getAttemptCount(resourceId, userId)
  const next = current + 1
  if (supa) {
    const { data, error } = await supabase
      .from('educational_resource_attempts')
      .insert({ resource_id: resourceId, user_id: userId, attempt_number: next })
      .select('id, attempt_number')
      .single()
    if (error) throw error
    return { id: data?.id, attemptNumber: data?.attempt_number || next }
  }
  const key = `${ATTEMPT_LOCAL_PREFIX}:${userId}:${resourceId}`
  localStorage.setItem(key, String(next))
  return { attemptNumber: next }
}

export async function completeAttempt(attemptId: string): Promise<void> {
  try {
    await supabase
      .from('educational_resource_attempts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', attemptId)
  } catch (e) {
    console.warn('No se pudo completar el intento (fallback silencioso):', e)
  }
}

export async function saveAttemptFinalScore(
  attemptId: string,
  finalScore: number,
  breakdown?: any,
  summarySnapshot?: any
): Promise<boolean> {
  try {
    const payload: any = { final_score: finalScore }
    if (breakdown !== undefined) payload.final_score_breakdown = breakdown
    if (summarySnapshot !== undefined) payload.summary_snapshot = summarySnapshot
    const { error } = await supabase
      .from('educational_resource_attempts')
      .update(payload)
      .eq('id', attemptId)
    if (error) throw error
    return true
  } catch (e) {
    console.warn('No se pudo guardar el puntaje final del intento:', e)
    return false
  }
}

export async function getLatestFinalScoreForResource(
  userId: string,
  resourceId: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('educational_resource_attempts')
      .select('final_score, attempt_number')
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
      .order('attempt_number', { ascending: false })
      .limit(1)
    if (error) throw error
    const score = (data?.[0]?.final_score as number | null) ?? null
    return score
  } catch (e) {
    console.warn('No se pudo leer el puntaje final del recurso:', e)
    return null
  }
}

export async function getAttemptsForResource(
  userId: string,
  resourceId: string
): Promise<Array<{ id?: string; attempt_number: number; final_score?: number | null; final_score_breakdown?: any; summary_snapshot?: any }>> {
  const supa = await isSupabaseAvailable()
  if (supa) {
    try {
      const { data, error } = await supabase
        .from('educational_resource_attempts')
        .select('id, attempt_number, final_score, final_score_breakdown, summary_snapshot')
        .eq('user_id', userId)
        .eq('resource_id', resourceId)
        .order('attempt_number', { ascending: true })
      if (error) throw error
      return (data || []).map((row: any) => ({
        id: row.id,
        attempt_number: row.attempt_number,
        final_score: row.final_score ?? null,
        final_score_breakdown: row.final_score_breakdown,
        summary_snapshot: row.summary_snapshot,
      }))
    } catch (e) {
      console.warn('No se pudieron obtener los intentos del recurso:', e)
      return []
    }
  }
  // Fallback local: solo contamos cantidad de intentos, sin puntajes
  const count = await getAttemptCount(resourceId, userId)
  return Array.from({ length: count }, (_, i) => ({ attempt_number: i + 1, final_score: null }))
}