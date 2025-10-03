import { supabase } from './supabase'

export interface TimelineProgressRecord {
  id?: string
  user_id?: string
  resource_id: string
  progress_index: number
  checked_indices: number[]
  events_count: number
  created_at?: string
  updated_at?: string
}

export async function getTimelineProgress(resourceId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('educational_timeline_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('resource_id', resourceId)
    .maybeSingle()
  if (error) {
    console.warn('getTimelineProgress error', error)
    return null
  }
  return data as TimelineProgressRecord | null
}

export async function upsertTimelineProgress(params: TimelineProgressRecord) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not authenticated') }
  const payload = {
    user_id: user.id,
    resource_id: params.resource_id,
    progress_index: params.progress_index,
    checked_indices: params.checked_indices,
    events_count: params.events_count,
  }
  const { data, error } = await supabase
    .from('educational_timeline_progress')
    .upsert(payload, { onConflict: 'user_id,resource_id' })
    .select()
    .maybeSingle()
  if (error) return { error }
  return { data }
}

// Borra todo el progreso de la línea de tiempo para un recurso dado (usuario actual):
// - educational_timeline_progress (registro de índice y checks agregados)
// - educational_timeline_event_progress (checks por evento)
export async function clearTimelineProgressForResource(resourceId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not authenticated') }

  // Nota: Evitamos eliminar en la tabla agregada 'educational_timeline_progress'
  // para no producir 404 cuando esa tabla no existe en el proyecto remoto.
  // La limpieza efectiva se realiza en los registros por evento.

  // 1) Encontrar timeline_id por resource_id
  const { data: timelineRow, error: tlSelErr } = await supabase
    .from('educational_timelines')
    .select('id')
    .eq('resource_id', resourceId)
    .maybeSingle()
  if (tlSelErr) {
    console.warn('clearTimelineProgressForResource timeline select error', tlSelErr)
    return { error: tlSelErr }
  }
  const timelineId = timelineRow?.id as string | undefined
  if (!timelineId) {
    // No hay timeline definida para el recurso; nada más que limpiar
    return { data: true }
  }

  // 2) Obtener eventos del timeline y eliminar checks por event_id para el usuario
  const { data: events, error: evErr } = await supabase
    .from('educational_timeline_events')
    .select('id')
    .eq('timeline_id', timelineId)
  if (evErr) {
    console.warn('clearTimelineProgressForResource events select error', evErr)
    return { error: evErr }
  }
  const eventIds = (events || []).map(e => e.id as string).filter(Boolean)
  if (eventIds.length === 0) return { data: true }

  const delEvent = await supabase
    .from('educational_timeline_event_progress')
    .delete()
    .eq('user_id', user.id)
    .in('event_id', eventIds)
  if (delEvent.error) {
    console.warn('clearTimelineProgressForResource event delete error', delEvent.error)
    return { error: delEvent.error }
  }

  return { data: true }
}