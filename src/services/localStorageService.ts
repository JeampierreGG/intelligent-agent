import type { GeneratedResource } from './types'

export interface LocalEducationalResource {
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

export interface CreateLocalResourceData {
  user_id: string
  title: string
  subject: string
  topic: string
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado'
  content: GeneratedResource
}

const RESOURCES_KEY = 'educational_resources'
const USER_KEY = 'current_user'

/**
 * Genera un ID único para los recursos
 */
const generateId = (): string => {
  return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Obtiene todos los recursos del localStorage
 */
const getAllResources = (): LocalEducationalResource[] => {
  try {
    const resources = localStorage.getItem(RESOURCES_KEY)
    return resources ? JSON.parse(resources) : []
  } catch (error) {
    console.error('Error al obtener recursos del localStorage:', error)
    return []
  }
}

/**
 * Guarda todos los recursos en localStorage
 */
const saveAllResources = (resources: LocalEducationalResource[]): void => {
  try {
    localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources))
  } catch (error) {
    console.error('Error al guardar recursos en localStorage:', error)
    throw error
  }
}



/**
 * Guarda un recurso educativo en localStorage
 */
export const saveEducationalResourceLocal = async (resourceData: CreateLocalResourceData) => {
  try {
    const resources = getAllResources()
    const newResource: LocalEducationalResource = {
      id: generateId(),
      ...resourceData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    resources.push(newResource)
    saveAllResources(resources)

    console.log('✅ Recurso guardado exitosamente en localStorage:', newResource)
    return { data: newResource, error: null }
  } catch (error) {
    console.error('❌ Error en saveEducationalResourceLocal:', error)
    return { data: null, error }
  }
}

/**
 * Obtiene todos los recursos educativos de un usuario del localStorage
 */
export const getUserResourcesLocal = async (userId: string) => {
  try {
    const resources = getAllResources()
    const userResources = resources.filter(resource => resource.user_id === userId)
    
    // Ordenar por fecha de creación (más recientes primero)
    userResources.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log('✅ Recursos del usuario cargados desde localStorage:', userResources)
    return { data: userResources, error: null }
  } catch (error) {
    console.error('❌ Error en getUserResourcesLocal:', error)
    return { data: null, error }
  }
}

/**
 * Obtiene un recurso específico por ID del localStorage
 */
export const getResourceByIdLocal = async (resourceId: string, userId: string) => {
  try {
    const resources = getAllResources()
    const resource = resources.find(r => r.id === resourceId && r.user_id === userId)

    if (!resource) {
      throw new Error('Recurso no encontrado')
    }

    return { data: resource, error: null }
  } catch (error) {
    console.error('❌ Error en getResourceByIdLocal:', error)
    return { data: null, error }
  }
}

/**
 * Elimina un recurso educativo del localStorage
 */
export const deleteResourceLocal = async (resourceId: string, userId: string) => {
  try {
    const resources = getAllResources()
    const filteredResources = resources.filter(r => !(r.id === resourceId && r.user_id === userId))
    
    if (resources.length === filteredResources.length) {
      throw new Error('Recurso no encontrado')
    }

    saveAllResources(filteredResources)

    console.log('✅ Recurso eliminado exitosamente del localStorage')
    return { error: null }
  } catch (error) {
    console.error('❌ Error en deleteResourceLocal:', error)
    return { error }
  }
}

/**
 * Actualiza un recurso educativo en localStorage
 */
export const updateResourceLocal = async (
  resourceId: string, 
  userId: string, 
  updates: Partial<CreateLocalResourceData>
) => {
  try {
    const resources = getAllResources()
    const resourceIndex = resources.findIndex(r => r.id === resourceId && r.user_id === userId)

    if (resourceIndex === -1) {
      throw new Error('Recurso no encontrado')
    }

    resources[resourceIndex] = {
      ...resources[resourceIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    saveAllResources(resources)

    console.log('✅ Recurso actualizado exitosamente en localStorage:', resources[resourceIndex])
    return { data: resources[resourceIndex], error: null }
  } catch (error) {
    console.error('❌ Error en updateResourceLocal:', error)
    return { data: null, error }
  }
}

/**
 * Obtiene estadísticas de recursos del usuario del localStorage
 */
export const getUserResourceStatsLocal = async (userId: string) => {
  try {
    const resources = getAllResources()
    const userResources = resources.filter(r => r.user_id === userId)

    // Calcular estadísticas
    const stats = {
      total: userResources.length,
      byDifficulty: {
        'Básico': userResources.filter(r => r.difficulty === 'Básico').length,
        'Intermedio': userResources.filter(r => r.difficulty === 'Intermedio').length,
        'Avanzado': userResources.filter(r => r.difficulty === 'Avanzado').length
      },
      bySubject: userResources.reduce((acc: Record<string, number>, resource) => {
        acc[resource.subject] = (acc[resource.subject] || 0) + 1
        return acc
      }, {}),
      recentCount: userResources.filter(r => {
        const createdAt = new Date(r.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return createdAt >= weekAgo
      }).length
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('❌ Error en getUserResourceStatsLocal:', error)
    return { data: null, error }
  }
}

/**
 * Limpia todos los recursos del localStorage (útil para desarrollo)
 */
export const clearAllResourcesLocal = () => {
  try {
    localStorage.removeItem(RESOURCES_KEY)
    console.log('✅ Todos los recursos eliminados del localStorage')
  } catch (error) {
    console.error('❌ Error al limpiar recursos del localStorage:', error)
  }
}