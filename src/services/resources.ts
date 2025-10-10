import { supabase } from './supabase'
import type { GeneratedResource, StudyElement, StudyTimelineContent, MatchUpPair, MatchUpImagesItem } from './types'
import {
  saveEducationalResourceLocal,
  getUserResourcesLocal,
  getResourceByIdLocal,
  getUserResourceStatsLocal,
  type CreateLocalResourceData
} from './localStorageService'

export interface EducationalResource {
  id: string
  user_id: string
  title: string
  subject: string
  topic: string
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado'
  content: GeneratedResource
  created_at: string
  updated_at: string
}

export interface CreateResourceData {
  user_id: string
  title: string
  subject: string
  topic: string
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado'
  content: GeneratedResource
}

/**
 * Verifica si Supabase está disponible
 */
const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('educational_resources').select('id').limit(1)
    return !error
  } catch (error) {
    console.warn('⚠️ Supabase no disponible, usando localStorage como fallback')
    return false
  }
}

/**
 * Guarda un recurso educativo generado (Supabase con fallback a localStorage)
 */
export const saveEducationalResource = async (resourceData: CreateResourceData) => {
  // Intentar usar Supabase primero
  const supabaseAvailable = await isSupabaseAvailable()
  
  if (supabaseAvailable) {
    try {
      const { data, error } = await supabase
        .from('educational_resources')
        .insert([resourceData])
        .select()
        .single()

      if (error) {
        console.error('Error guardando recurso en Supabase:', error)
        throw error
      }

      console.log('✅ Recurso guardado exitosamente en Supabase:', data)
      // Persistir detalles relacionados (matchups e elementos de estudio) en sus tablas específicas
      try {
        await persistGeneratedDetails(data)
        console.log('✅ Detalles del recurso (matchups/estudio) persistidos correctamente')
      } catch (relErr) {
        console.warn('⚠️ No se pudieron persistir detalles relacionados del recurso:', relErr)
      }
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error en Supabase, intentando localStorage:', error)
    }
  }

  // Fallback a localStorage
  console.log('📦 Usando localStorage como fallback para guardar recurso')
  return await saveEducationalResourceLocal(resourceData as CreateLocalResourceData)
}

/**
 * Inserta contenido derivado del recurso generado en tablas específicas:
 * - educational_matchup_lines + educational_matchup_line_pairs
 * - educational_matchup_images + educational_matchup_image_items
 * - educational_timelines + educational_timeline_events
 * - educational_study_elements (posiciones 1 y 2 para elementos de estudio previos)
 */
const persistGeneratedDetails = async (resourceRow: EducationalResource) => {
  const resourceId = resourceRow.id
  const content = resourceRow.content as GeneratedResource

  // 1) Game Element (preferir bundle gameelement.matchUp y hacer fallback a gameElements/matchUp)
  const gameBundle = (content.gameelement as any) || null
  const gameEl = (gameBundle?.matchUp ?? content.matchUp ?? (content as any).gameElements) as any
  let matchupLinesId: string | null = null
  let matchupImagesId: string | null = null
  if (gameEl?.linesMode && gameEl.linesMode.pairs && gameEl.linesMode.pairs.length > 0) {
    const { data: ml, error: mlErr } = await supabase
      .from('educational_matchup_lines')
      .insert({ resource_id: resourceId, title: gameEl.title })
      .select('id')
      .single()
    if (mlErr) throw mlErr
    matchupLinesId = ml.id

    const pairsRows = (gameEl.linesMode.pairs as MatchUpPair[]).map((p: MatchUpPair, idx: number) => ({
      matchup_lines_id: matchupLinesId,
      order_index: idx,
      left_text: p.left,
      right_text: p.right,
    }))
    const { error: lpErr } = await supabase
      .from('educational_matchup_line_pairs')
      .insert(pairsRows)
    if (lpErr) throw lpErr
  }

  // 2) MatchUp Images
  if (gameEl?.imagesMode && gameEl.imagesMode.items && gameEl.imagesMode.items.length > 0) {
    const { data: mi, error: miErr } = await supabase
      .from('educational_matchup_images')
      .insert({ resource_id: resourceId, title: gameEl.title })
      .select('id')
      .single()
    if (miErr) throw miErr
    matchupImagesId = mi.id

    const itemsRows = (gameEl.imagesMode.items as MatchUpImagesItem[]).map((it: MatchUpImagesItem, idx: number) => ({
      matchup_images_id: matchupImagesId,
      order_index: idx,
      image_url: it.imageUrl ?? null,
      label: it.term,
    }))
    const { error: iiErr } = await supabase
      .from('educational_matchup_image_items')
      .insert(itemsRows)
    if (iiErr) throw iiErr
  }

  // 3) Study Elements (máximo dos, en orden)
  const studyElements = (content.studyElements || []) as StudyElement[]
  let timelineId: string | null = null
  let positionCounter = 1

  for (const el of studyElements.slice(0, 2)) {
    if (el.type === 'timeline') {
      const tl = el.content as StudyTimelineContent
      // Crear timeline principal
      const { data: tRow, error: tErr } = await supabase
        .from('educational_timelines')
        .insert({ resource_id: resourceId, title: gameEl?.title ?? resourceRow.title })
        .select('id')
        .single()
      if (tErr) throw tErr
      timelineId = tRow.id

      // Insertar eventos con order_index
      const evRows = (tl.events || []).map((ev, idx) => ({
        timeline_id: timelineId,
        order_index: idx,
        title: ev.title,
        content_text: ev.description,
        image_url: ev.imageUrl ?? null,
        has_checkbox: true,
      }))
      if (evRows.length > 0) {
        const { error: evErr } = await supabase
          .from('educational_timeline_events')
          .insert(evRows)
        if (evErr) throw evErr
      }

      // Vincular como elemento de estudio en posición
      const { error: seErr } = await supabase
        .from('educational_study_elements')
        .insert({
          resource_id: resourceId,
          position: positionCounter as 1 | 2,
          element_type: 'timeline',
          timeline_id: timelineId,
        })
      if (seErr) throw seErr
      positionCounter += 1
    } else if (el.type === 'course_presentation') {
      // Persistir course_presentation (header + slides) y registrar en educational_study_elements
      const cp = el.content
      const { data: cpRow, error: cpErr } = await supabase
        .from('educational_course_presentations')
        .insert({ resource_id: resourceId, background_image_url: cp.backgroundImageUrl ?? null })
        .select('id')
        .single()
      if (cpErr) throw cpErr

      const slidesRows = (cp.slides || []).map((s, idx) => ({
        course_presentation_id: cpRow.id,
        order_index: idx,
        title: s.title,
        body: s.text,
      }))
      if (slidesRows.length > 0) {
        const { error: sErr } = await supabase
          .from('educational_course_presentation_slides')
          .insert(slidesRows)
        if (sErr) throw sErr
      }

      const { error: seErr } = await supabase
        .from('educational_study_elements')
        .insert({
          resource_id: resourceId,
          position: positionCounter as 1 | 2,
          element_type: 'course_presentation',
          course_presentation_id: cpRow.id,
        })
      if (seErr) throw seErr
      positionCounter += 1
    } else if (el.type === 'accordion_notes') {
      // Persistir Accordion Notes y secciones, y registrar relación en educational_study_elements
      const sections = (el.content as any)?.sections || []
      // Crear registro principal de accordion_notes
      const { data: accRow, error: accErr } = await supabase
        .from('educational_accordion_notes')
        .insert({ resource_id: resourceId })
        .select('id')
        .single()
      if (accErr) throw accErr

      // Insertar secciones si existen
      if (Array.isArray(sections) && sections.length > 0) {
        const secRows = sections.map((s: any, idx: number) => ({
          accordion_id: accRow.id,
          order_index: idx,
          title: s.title ?? null,
          body: s.body ?? null,
        }))
        const { error: secErr } = await supabase
          .from('educational_accordion_notes_sections')
          .insert(secRows)
        if (secErr) throw secErr
      }

      // Vincular como elemento de estudio
      const { error: seErr } = await supabase
        .from('educational_study_elements')
        .insert({
          resource_id: resourceId,
          position: positionCounter as 1 | 2,
          element_type: 'accordion_notes',
          accordion_notes_id: accRow.id,
        })
      if (seErr) throw seErr
      positionCounter += 1
    }
  }
}

/**
 * Obtiene todos los recursos educativos de un usuario (Supabase con fallback a localStorage)
 */
export const getUserResources = async (userId: string) => {
  // Intentar usar Supabase primero
  const supabaseAvailable = await isSupabaseAvailable()
  
  if (supabaseAvailable) {
    try {
      const { data, error } = await supabase
        .from('educational_resources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error obteniendo recursos del usuario en Supabase:', error)
        throw error
      }

      console.log('✅ Recursos obtenidos exitosamente desde Supabase')
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error en Supabase, intentando localStorage:', error)
    }
  }

  // Fallback a localStorage
  console.log('📦 Usando localStorage como fallback para obtener recursos')
  return await getUserResourcesLocal(userId)
}

/**
 * Obtiene un recurso específico por ID (Supabase con fallback a localStorage)
 */
export const getResourceById = async (resourceId: string, userId: string) => {
  // Intentar usar Supabase primero
  const supabaseAvailable = await isSupabaseAvailable()
  
  if (supabaseAvailable) {
    try {
      const { data, error } = await supabase
        .from('educational_resources')
        .select('*')
        .eq('id', resourceId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error obteniendo recurso por ID en Supabase:', error)
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('❌ Error en Supabase, intentando localStorage:', error)
    }
  }

  // Fallback a localStorage
  console.log('📦 Usando localStorage como fallback para obtener recurso por ID')
  return await getResourceByIdLocal(resourceId, userId)
}

/**
 * Elimina un recurso educativo
 */
export const deleteResource = async (resourceId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('educational_resources')
      .delete()
      .eq('id', resourceId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error eliminando recurso:', error)
      throw error
    }

    console.log('✅ Recurso eliminado exitosamente')
    return { error: null }
  } catch (error) {
    console.error('❌ Error en deleteResource:', error)
    return { error }
  }
}

/**
 * Actualiza un recurso educativo
 */
export const updateResource = async (
  resourceId: string, 
  userId: string, 
  updates: Partial<CreateResourceData>
) => {
  try {
    const { data, error } = await supabase
      .from('educational_resources')
      .update(updates)
      .eq('id', resourceId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error actualizando recurso:', error)
      throw error
    }

    console.log('✅ Recurso actualizado exitosamente:', data)
    return { data, error: null }
  } catch (error) {
    console.error('❌ Error en updateResource:', error)
    return { data: null, error }
  }
}

/**
 * Obtiene estadísticas de recursos del usuario (Supabase con fallback a localStorage)
 */
export const getUserResourceStats = async (userId: string) => {
  // Intentar usar Supabase primero
  const supabaseAvailable = await isSupabaseAvailable()
  
  if (supabaseAvailable) {
    try {
      const { data, error } = await supabase
        .from('educational_resources')
        .select('difficulty, subject, created_at')
        .eq('user_id', userId)

      if (error) {
        console.error('Error obteniendo estadísticas en Supabase:', error)
        throw error
      }

      // Calcular estadísticas
      const stats = {
        total: data?.length || 0,
        byDifficulty: {
          'Básico': data?.filter(r => r.difficulty === 'Básico').length || 0,
          'Intermedio': data?.filter(r => r.difficulty === 'Intermedio').length || 0,
          'Avanzado': data?.filter(r => r.difficulty === 'Avanzado').length || 0
        },
        bySubject: data?.reduce((acc: Record<string, number>, resource) => {
          acc[resource.subject] = (acc[resource.subject] || 0) + 1
          return acc
        }, {}) || {},
        recentCount: data?.filter(r => {
          const createdAt = new Date(r.created_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return createdAt >= weekAgo
        }).length || 0
      }

      return { data: stats, error: null }
    } catch (error) {
      console.error('❌ Error en Supabase, intentando localStorage:', error)
    }
  }

  // Fallback a localStorage
  console.log('📦 Usando localStorage como fallback para obtener estadísticas')
  return await getUserResourceStatsLocal(userId)
}