import { getQuestionnaireResponsesSimple } from './questionnaire-simple'

export interface UserPreferences {
  academicLevel: string
  formatPreferences: string[]
  interactiveActivities: string[]
}

/**
 * Obtiene las preferencias del usuario desde la base de datos
 * @param userId ID del usuario
 * @returns Preferencias del usuario o null si no existen
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await getQuestionnaireResponsesSimple(userId)
    
    if (error || !data) {
      console.log('No se encontraron preferencias para el usuario:', userId)
      return null
    }

    return {
      academicLevel: data.academic_level,
      formatPreferences: data.format_preferences || [],
      interactiveActivities: data.interactive_activities || []
    }
  } catch (error) {
    console.error('Error obteniendo preferencias del usuario:', error)
    return null
  }
}

/**
 * Mapea las preferencias de formato a opciones de tipo de recurso
 */
export const mapFormatPreferencesToResourceTypes = (formatPreferences: string[]) => {
  const mapping: { [key: string]: string } = {
    'resumenes': 'Resumen esquemático',
    'explicaciones': 'Explicaciones paso a paso',
    'ejercicios': 'Ejercicios prácticos con soluciones',
    'casos': 'Casos prácticos',
    'videos': 'Videos/recursos visuales',
    'interactivo': 'Aprender Jugando'
  }

  return formatPreferences.map(pref => mapping[pref]).filter(Boolean)
}

/**
 * Mapea las actividades interactivas a opciones de juegos
 */
export const mapInteractiveActivitiesToGames = (interactiveActivities: string[]) => {
  const mapping: { [key: string]: string } = {
    'cuestionarios': 'Cuestionarios interactivos',
    'arrastrar': 'Arrastrar y soltar',
    'memoria': 'Juegos de memoria',
    'simulaciones': 'Simulaciones',
    'presentaciones': 'Presentaciones interactivas',
    'timeline': 'Líneas de tiempo interactivas'
  }

  return interactiveActivities.map(activity => mapping[activity]).filter(Boolean)
}