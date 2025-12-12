import type { GeneratedResource } from './types'

export interface LocalEducationalResource {
  id: string
  user_id: string
  title: string
  subject: string
  topic: string
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado'
  content: GeneratedResource
  selected_elements?: string[]
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
  selected_elements?: string[]
}

const RESOURCES_KEY = 'educational_resources'

const generateId = (): string => `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const getAllResources = (): LocalEducationalResource[] => {
  try {
    const resources = localStorage.getItem(RESOURCES_KEY)
    return resources ? JSON.parse(resources) : []
  } catch (error) {
    console.error('Error al obtener recursos del localStorage:', error)
    return []
  }
}

const saveAllResources = (resources: LocalEducationalResource[]): void => {
  try {
    localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources))
  } catch (error) {
    console.error('Error al guardar recursos en localStorage:', error)
    throw error
  }
}

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
    return { data: newResource, error: null }
  } catch (error) {
    console.error('❌ Error en saveEducationalResourceLocal:', error)
    return { data: null, error }
  }
}

export const getUserResourcesLocal = async (userId: string) => {
  try {
    const resources = getAllResources()
    const userResources = resources.filter(r => r.user_id === userId)
    userResources.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return { data: userResources, error: null }
  } catch (error) {
    console.error('❌ Error en getUserResourcesLocal:', error)
    return { data: null, error }
  }
}

export const getResourceByIdLocal = async (resourceId: string, userId: string) => {
  try {
    const resources = getAllResources()
    const resource = resources.find(r => r.id === resourceId && r.user_id === userId)
    if (!resource) throw new Error('Recurso no encontrado')
    return { data: resource, error: null }
  } catch (error) {
    console.error('❌ Error en getResourceByIdLocal:', error)
    return { data: null, error }
  }
}

export const updateResourceLocal = async (
  resourceId: string,
  userId: string,
  updates: Partial<CreateLocalResourceData>
) => {
  try {
    const resources = getAllResources()
    const idx = resources.findIndex(r => r.id === resourceId && r.user_id === userId)
    if (idx === -1) throw new Error('Recurso no encontrado')
    resources[idx] = { ...resources[idx], ...updates, updated_at: new Date().toISOString() }
    saveAllResources(resources)
    return { data: resources[idx], error: null }
  } catch (error) {
    console.error('❌ Error en updateResourceLocal:', error)
    return { data: null, error }
  }
}

export const getUserResourceStatsLocal = async (userId: string) => {
  try {
    const resources = getAllResources()
    const userResources = resources.filter(r => r.user_id === userId)
    const stats = {
      total: userResources.length,
      byDifficulty: {
        'Básico': userResources.filter(r => r.difficulty === 'Básico').length,
        'Intermedio': userResources.filter(r => r.difficulty === 'Intermedio').length,
        'Avanzado': userResources.filter(r => r.difficulty === 'Avanzado').length
      },
      bySubject: userResources.reduce((acc: Record<string, number>, r) => { acc[r.subject] = (acc[r.subject] || 0) + 1; return acc }, {} as Record<string, number>),
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

export const clearAllResourcesLocal = () => {
  try {
    localStorage.removeItem(RESOURCES_KEY)
  } catch (error) {
    console.error('❌ Error al limpiar recursos del localStorage:', error)
  }
}

