// Política local para decidir el uso de imágenes en la actividad MatchUp.
// Este archivo evita errores de build en Vercel al proveer la función
// decideMatchUpUsage utilizada por los servicios de generación.

import type { ResourceFormData } from '../services/types'

export interface MatchUpUsagePolicy {
  useImages: boolean
}

// Política mínima: por defecto no usar imágenes. En openrouter.ts actualmente
// se deshabilita imagesMode de todos modos, pero mantenemos esta función para
// compatibilidad y posibles ajustes futuros.
export function decideMatchUpUsage(_formData: ResourceFormData): MatchUpUsagePolicy {
  return { useImages: false }
}