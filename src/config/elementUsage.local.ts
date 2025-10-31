// Decide cómo usar imágenes y fuentes para la actividad MatchUp
// Archivo local para configuración de uso de elementos visuales
// Se usa en src/services/openrouter.ts

import type { ResourceFormData } from '../services/types'

export type PollinationsQuality = 'low' | 'medium' | 'high'

export interface MatchUpUsage {
  // Si se deben incluir imágenes en la actividad
  useImages: boolean
  // Máximo de imágenes a incluir
  maxImages: number
  // Calidad de Pollinations para generación de imágenes de apoyo
  pollinationsQuality: PollinationsQuality
  // Si se debe intentar priorizar imágenes reales (Wikimedia/Wikipedia) cuando el tema lo amerite
  useWikimediaPriority: boolean
}

/**
 * Decide el uso de imágenes y fuentes según el tema y materia del formulario
 */
export function decideMatchUpUsage(formData: ResourceFormData): MatchUpUsage {
  const subject = (formData.subject || '').toLowerCase()
  const topic = (formData.topic || '').toLowerCase()

  // Priorizar imágenes reales (Wikimedia) para materias de historia o temas históricos
  const wikiPriority = subject.includes('hist') || topic.includes('hist')

  return {
    // Desactivar completamente el modo de imágenes del MatchUp según solicitud
    useImages: false,
    maxImages: 4, // el flujo downstream espera exactamente 4 si hay imágenes
    pollinationsQuality: 'medium',
    useWikimediaPriority: wikiPriority,
  }
}