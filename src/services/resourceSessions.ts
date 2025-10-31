import { supabase } from './supabase'

export type ResourceSession = {
  id: string
  user_id: string
  resource_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  accumulated_seconds: number | null
}

export async function getActiveResourceSession(userId: string, resourceId: string): Promise<ResourceSession | null> {
  const { data, error } = await supabase
    .from('educational_resource_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching active session:', error)
    return null
  }
  return data as ResourceSession | null
}

export async function getActiveSessionsForUser(userId: string): Promise<ResourceSession[]> {
  const { data, error } = await supabase
    .from('educational_resource_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)

  if (error) {
    console.error('Error fetching active sessions for user:', error)
    return []
  }
  return (data || []) as ResourceSession[]
}

export async function startResourceSession(userId: string, resourceId: string): Promise<ResourceSession | null> {
  const { data, error } = await supabase
    .from('educational_resource_sessions')
    .insert({ user_id: userId, resource_id: resourceId })
    .select('*')
    .single()

  if (error) {
    console.error('Error starting resource session:', error)
    return null
  }
  return data as ResourceSession
}

export async function endResourceSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('educational_resource_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) {
    console.error('Error ending resource session:', error)
    return false
  }
  return true
}

// Incrementa los segundos acumulados de una sesión activa (pausa controlada)
export async function addAccumulatedSeconds(sessionId: string, additionalSeconds: number): Promise<boolean> {
  if (!additionalSeconds || additionalSeconds <= 0) return true
  const { data: row, error: selErr } = await supabase
    .from('educational_resource_sessions')
    .select('accumulated_seconds')
    .eq('id', sessionId)
    .maybeSingle()
  if (selErr) {
    console.error('Error leyendo accumulated_seconds:', selErr)
    return false
  }
  const current = (row?.accumulated_seconds ?? 0) as number
  const { error: updErr } = await supabase
    .from('educational_resource_sessions')
    .update({ accumulated_seconds: current + additionalSeconds })
    .eq('id', sessionId)
  if (updErr) {
    console.error('Error actualizando accumulated_seconds:', updErr)
    return false
  }
  return true 
}

// Obtiene el total de segundos acumulados por el usuario en un recurso (sumando todas las sesiones)
export async function getTotalAccumulatedSecondsForResource(userId: string, resourceId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('educational_resource_sessions')
      .select('accumulated_seconds, ended_at')
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
    if (error) {
      console.error('Hay un error sumando accumulated_seconds:', error)
      return 0
    }
    const total = (data || []).reduce((sum: number, row: any) => {
      const acc = (row?.accumulated_seconds ?? 0) as number
      return sum + (acc || 0)
    }, 0)
    return total
  } catch (e) {
    console.error('Error obteniendo total de segundos acumulados:', e)
    return 0
  }
}