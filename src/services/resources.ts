import { supabase } from './supabase'
import type { GeneratedResource } from './gemini'

export interface EducationalResource {
  id: string
  user_id: string
  title: string
  subject: string
  topic: string
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado'
  resource_type: string
  selected_games: string[]
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
  resource_type: string
  selected_games: string[]
  content: GeneratedResource
}

/**
 * Guarda un recurso educativo generado en Supabase
 */
export const saveEducationalResource = async (resourceData: CreateResourceData) => {
  try {
    const { data, error } = await supabase
      .from('educational_resources')
      .insert([resourceData])
      .select()
      .single()

    if (error) {
      console.error('Error guardando recurso:', error)
      throw error
    }

    console.log('✅ Recurso guardado exitosamente:', data)
    return { data, error: null }
  } catch (error) {
    console.error('❌ Error en saveEducationalResource:', error)
    return { data: null, error }
  }
}

/**
 * Obtiene todos los recursos educativos de un usuario
 */
export const getUserResources = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('educational_resources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error obteniendo recursos del usuario:', error)
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('❌ Error en getUserResources:', error)
    return { data: null, error }
  }
}

/**
 * Obtiene un recurso específico por ID
 */
export const getResourceById = async (resourceId: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('educational_resources')
      .select('*')
      .eq('id', resourceId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error obteniendo recurso por ID:', error)
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('❌ Error en getResourceById:', error)
    return { data: null, error }
  }
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
 * Obtiene estadísticas de recursos del usuario
 */
export const getUserResourceStats = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('educational_resources')
      .select('difficulty, subject, created_at')
      .eq('user_id', userId)

    if (error) {
      console.error('Error obteniendo estadísticas:', error)
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
    console.error('❌ Error en getUserResourceStats:', error)
    return { data: null, error }
  }
}