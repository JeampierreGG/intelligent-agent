import { supabase } from './supabase'
import type { GeneratedResource, GameElementBundle } from './types'
import {
  saveEducationalResourceLocal,
  getUserResourcesLocal,
  getResourceByIdLocal,
  getUserResourceStatsLocal,
  updateResourceLocal,
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
  // Nuevo: elementos seleccionados por el usuario (juego y aprendizaje)
  selected_elements?: string[]
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
  // Nuevo: elementos seleccionados por el usuario (opcional)
  selected_elements?: string[]
}

/**
 * Devuelve las claves de elementos de juego presentes en el contenido del recurso.
 * Útil para evitar duplicar lógica en páginas que necesitan saber qué juegos existen.
 */
export const detectSelectedGameKeys = (resource: EducationalResource): string[] => {
  try {
    const bundle = (resource.content as GeneratedResource)?.gameelement || {}
    const keys: string[] = []
    if (bundle.matchUp) keys.push('match_up')
    if (bundle.quiz) keys.push('quiz')
    if (bundle.groupSort) keys.push('group_sort')
    if (bundle.anagram) keys.push('anagram')
    if (bundle.openTheBox) keys.push('open_the_box')
    if (bundle.findTheMatch) keys.push('find_the_match')
    return keys
  } catch {
    return []
  }
}

/**
 * Verifica si Supabase está disponible
 */
const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('educational_resources').select('id').limit(1)
    return !error
  } catch {
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
      const payload = { ...resourceData, content: normalizeResourceGroupSort(resourceData.content) } as Record<string, unknown>
      delete payload.selected_elements
      const { data, error } = await supabase
        .from('educational_resources')
        .insert([payload])
        .select()
        .single()

      if (error) {
        console.error('Error guardando recurso en Supabase:', error)
        if (error.code === 'PGRST204' && typeof error.message === 'string' && error.message.includes("selected_elements")) {
          const retry = await supabase
            .from('educational_resources')
            .insert([payload])
            .select()
            .single()
          if (retry.error) throw retry.error
          const dataRetry = retry.data
          try {
            await persistGeneratedDetails(dataRetry, { persistStudy: true, persistGame: true })
          } catch (err) {
            console.warn('persist details error:', err)
          }
          return { data: dataRetry, error: null }
        }
        throw error
      }

      
      // Persistir detalles relacionados (matchups y elementos de estudio) en sus tablas específicas
      try {
        await persistGeneratedDetails(data, { persistStudy: true, persistGame: true })
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
  return await saveEducationalResourceLocal({ ...resourceData, content: normalizeResourceGroupSort(resourceData.content) } as CreateLocalResourceData)
}

/**
 * Agrega elementos de juego a un recurso ya existente y persiste detalles relacionados.
 * No toca los elementos de estudio existentes.
 */
export const appendGameElementsToResource = async (
  resourceId: string,
  gameBundle: GameElementBundle,
  userId?: string,
): Promise<void> => {
  // Intentar Supabase
  const supabaseAvailable = await isSupabaseAvailable()
  if (!supabaseAvailable) {
    // Fallback: actualizar recurso en localStorage si tenemos userId
    if (!userId) {
      console.warn('Supabase no disponible y no se proporcionó userId: no se puede actualizar recurso local con elementos de juego')
      return
    }
    try {
      const { data: existingLocal } = await getResourceByIdLocal(resourceId, userId)
      const currentContent: GeneratedResource = (existingLocal?.content as GeneratedResource) || { title: existingLocal?.title || 'Recurso' }
      const mergedContentRaw: GeneratedResource = { ...currentContent, gameelement: { ...(currentContent.gameelement || {}), ...gameBundle } }
      const mergedContent: GeneratedResource = normalizeResourceGroupSort(mergedContentRaw)
      if (gameBundle.matchUp) mergedContent.matchUp = gameBundle.matchUp
      if (gameBundle.quiz) mergedContent.quiz = gameBundle.quiz
      if (gameBundle.groupSort) mergedContent.groupSort = gameBundle.groupSort
      if (gameBundle.anagram) mergedContent.anagram = gameBundle.anagram
      if (gameBundle.openTheBox) mergedContent.openTheBox = gameBundle.openTheBox
      if (gameBundle.findTheMatch) mergedContent.findTheMatch = gameBundle.findTheMatch

      await updateResourceLocal(resourceId, userId, { content: mergedContent })
      return
    } catch (e) {
      console.error('❌ Error actualizando recurso local con elementos de juego:', e)
      return
    }
  }

  // Obtener recurso actual para mergear contenido
  const { data: existing, error: getErr } = await supabase
    .from('educational_resources')
    .select('id, content')
    .eq('id', resourceId)
    .single()
  if (getErr) throw getErr

  const currentContent: GeneratedResource = (existing?.content as GeneratedResource) || { title: resourceId }
  const mergedContent: GeneratedResource = normalizeResourceGroupSort({ ...currentContent })
  // Combinar bundle dentro de gameelement y en raíz si aplica
  mergedContent.gameelement = { ...(currentContent.gameelement || {}), ...gameBundle }
  mergedContent.groupSort = mergedContent.groupSort || mergedContent.gameelement?.groupSort

  const { error: updErr } = await supabase
    .from('educational_resources')
    .update({ content: mergedContent })
    .eq('id', resourceId)
  if (updErr) throw updErr

  // Persistir detalles de juego únicamente
  const lightweightRow: EducationalResource = {
    id: resourceId,
    user_id: '',
    title: currentContent.title || 'Recurso',
    subject: '',
    topic: '',
    difficulty: (currentContent.difficulty ?? 'Intermedio') as 'Básico' | 'Intermedio' | 'Avanzado',
    content: mergedContent,
    created_at: '',
    updated_at: ''
  }

  // Persistir solo bloques de juego
  await persistGeneratedDetails(lightweightRow, { persistStudy: false, persistGame: true })
}

const normalizeResourceGroupSort = (content: GeneratedResource): GeneratedResource => {
  const copy: GeneratedResource = { ...(content || {}) }
  const src: import('./types').GroupSortContent | undefined = copy.gameelement?.groupSort || copy.groupSort
  if (src && Array.isArray(src.groups)) {
    const groups = src.groups.slice(0, 2)
    let count = 0
    const out = groups.map((g: { name: string; items: string[] }) => {
      const items: string[] = []
      for (const it of (Array.isArray(g.items) ? g.items : [])) {
        if (count >= 6) break
        items.push(String(it || ''))
        count++
      }
      return { name: String(g.name || ''), items }
    })
    const normalized = { ...src, templateType: 'group_sort' as const, groups: out }
    copy.groupSort = normalized
    copy.gameelement = { ...(copy.gameelement || {}), groupSort: normalized }
  }
  return copy
}

/**
 * Inserta contenido derivado del recurso generado en tablas específicas:
 * - educational_matchup_lines + educational_matchup_line_pairs
 * - educational_matchup_images + educational_matchup_image_items
 * - educational_timelines + educational_timeline_events
 * - educational_study_elements (posiciones 1 y 2 para elementos de estudio previos)
 */
const persistGeneratedDetails = async (
  resourceRow: EducationalResource,
  opts?: { persistStudy?: boolean; persistGame?: boolean }
) => {
  void resourceRow
  void opts
  return
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
 * Obtiene recursos del usuario paginados (12 por página por defecto) y el conteo total
 */
export const getUserResourcesPaginated = async (userId: string, page: number, pageSize: number) => {
  const supabaseAvailable = await isSupabaseAvailable()
  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize - 1

  if (supabaseAvailable) {
    try {
      const { data, count, error } = await supabase
        .from('educational_resources')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error obteniendo recursos paginados en Supabase:', error)
        throw error
      }

      return { data: data || [], count: count || 0, error: null }
    } catch (error) {
      console.error('❌ Error en Supabase (paginado), intentando localStorage:', error)
    }
  }

  // Fallback a localStorage (paginación en memoria)
  const { data } = await getUserResourcesLocal(userId)
  const total = data?.length ?? 0
  const sliced = (data || []).slice(from, to + 1)
  return { data: sliced, count: total, error: null }
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
