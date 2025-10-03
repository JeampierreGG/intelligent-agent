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