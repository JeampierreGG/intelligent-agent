import { supabase } from './supabase'
import type { StudyTimelineEvent } from './types'

export interface TimelineEnsureResult {
  timeline_id: string
}

// Alineado al esquema de database/timeline_flow_no_rls.sql
export async function ensureTimelineForResource(resourceId: string, events: StudyTimelineEvent[]): Promise<TimelineEnsureResult | null> {
  // educational_timelines: sin user_id ni events_count
  const { data: existing, error: selErr } = await supabase
    .from('educational_timelines')
    .select('id')
    .eq('resource_id', resourceId)
    .maybeSingle()
  if (selErr) {
    console.warn('ensureTimelineForResource select error', selErr)
  }

  let timelineId = existing?.id as string | undefined
  if (!timelineId) {
    const { data: created, error: insErr } = await supabase
      .from('educational_timelines')
      .insert({ resource_id: resourceId })
      .select('id')
      .single()
    if (insErr) {
      console.error('Error creando educational_timelines', insErr)
      return null
    }
    timelineId = created.id

    // Insertar eventos si se pasó contenido (order_index basado en idx)
    if (events && events.length > 0) {
      const rows = events.map((ev, idx) => ({
        timeline_id: timelineId,
        order_index: idx,
        title: ev.title,
        content_text: ev.description,
        image_url: (ev as any).imageUrl ?? null,
        has_checkbox: true,
      }))
      const { error: evErr } = await supabase
        .from('educational_timeline_events')
        .insert(rows)
      if (evErr) {
        console.error('Error insertando educational_timeline_events', evErr)
      }
    }
  }

  return { timeline_id: timelineId! }
}

export async function getEventProgress(timelineId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  // 1) Obtener eventos del timeline para mapear event_id -> order_index
  const { data: events, error: evErr } = await supabase
    .from('educational_timeline_events')
    .select('id, order_index')
    .eq('timeline_id', timelineId)
    .order('order_index', { ascending: true })
  if (evErr) {
    console.warn('getEventProgress events select error', evErr)
    return {}
  }
  const idByIndex = new Map<number, string>()
  for (const ev of (events || [])) {
    idByIndex.set(ev.order_index as number, ev.id as string)
  }
  const eventIds = Array.from(idByIndex.values())
  if (eventIds.length === 0) return {}
  // 2) Obtener progreso por user_id + event_id
  const { data: progressRows, error: progErr } = await supabase
    .from('educational_timeline_event_progress')
    .select('event_id, checked')
    .eq('user_id', user.id)
    .in('event_id', eventIds)
  if (progErr) {
    console.warn('getEventProgress progress select error', progErr)
    return {}
  }
  const result: Record<number, boolean> = {}
  const checkedByEventId = new Map<string, boolean>()
  for (const row of (progressRows || [])) {
    checkedByEventId.set(row.event_id as string, !!row.checked)
  }
  for (const [idx, eid] of idByIndex.entries()) {
    result[idx] = !!checkedByEventId.get(eid)
  }
  return result
}

export async function markEventChecked(timelineId: string, eventIdx: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not authenticated') }
  // Encontrar el event_id por timeline + order_index
  const { data: evRow, error: evErr } = await supabase
    .from('educational_timeline_events')
    .select('id')
    .eq('timeline_id', timelineId)
    .eq('order_index', eventIdx)
    .maybeSingle()
  if (evErr) return { error: evErr }
  if (!evRow?.id) return { error: new Error('Evento no encontrado') }

  const payload = {
    user_id: user.id,
    event_id: evRow.id as string,
    checked: true,
    checked_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('educational_timeline_event_progress')
    .upsert(payload, { onConflict: 'user_id,event_id' })
    .select()
    .maybeSingle()
  if (error) return { error }
  return { data }
}