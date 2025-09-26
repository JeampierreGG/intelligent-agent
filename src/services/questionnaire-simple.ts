import { supabase } from './supabase'

export interface QuestionnaireResponses {
  user_id: string
  academic_level: string
  format_preferences: string[]
  interactive_activities: string[]
}

// Versión simplificada que funciona sin RLS
export const saveQuestionnaireResponsesSimple = async (responses: QuestionnaireResponses) => {
  try {
    console.log('💾 Guardando cuestionario (método simple sin RLS):', responses)
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError)
      throw new Error('Usuario no autenticado')
    }
    
    console.log('✅ Usuario autenticado:', user.id)
    
    // Primero verificar si ya existe un registro
    const { data: existingData, error: selectError } = await supabase
      .from('questionnaire_responses')
      .select('id')
      .eq('user_id', responses.user_id)
      .limit(1)
    
    console.log('🔍 Verificando registro existente:', { existingData, selectError })
    
    // Verificar si existe al menos un registro
    const hasExistingRecord = Array.isArray(existingData) && existingData.length > 0
    
    if (hasExistingRecord) {
      // Actualizar registro existente
      console.log('🔄 Actualizando registro existente...')
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .update({
          academic_level: responses.academic_level,
          format_preferences: responses.format_preferences,
          interactive_activities: responses.interactive_activities,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', responses.user_id)
        .select()

      if (error) {
        console.error('❌ Error actualizando:', error)
        throw error
      }
      
      console.log('✅ Actualización exitosa:', data)
      return { data, error: null }
    } else {
      // Crear nuevo registro
      console.log('➕ Creando nuevo registro...')
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .insert({
          user_id: responses.user_id,
          academic_level: responses.academic_level,
          format_preferences: responses.format_preferences,
          interactive_activities: responses.interactive_activities
        })
        .select()

      if (error) {
        console.error('❌ Error insertando:', error)
        throw error
      }
      
      console.log('✅ Inserción exitosa:', data)
      return { data, error: null }
    }
    
  } catch (error) {
    console.error('❌ Error general guardando cuestionario:', error)
    return { data: null, error }
  }
}

// Versión simplificada para verificar si existe el cuestionario
export const hasCompletedQuestionnaireSimple = async (userId: string): Promise<boolean> => {
  try {
    console.log('🔍 Verificando cuestionario completado (método simple):', userId)
    
    // Usar select con limit para evitar errores de múltiples registros
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (error) {
      console.error('❌ Error verificando cuestionario:', error)
      return false
    }

    // Si data es un array y tiene al menos un elemento, el cuestionario está completado
    const completed = Array.isArray(data) && data.length > 0
    console.log('📋 Cuestionario completado:', completed)
    return completed
    
  } catch (error) {
    console.error('❌ Error general verificando cuestionario:', error)
    return false
  }
}

// Función para obtener respuestas del cuestionario
export const getQuestionnaireResponsesSimple = async (userId: string) => {
  try {
    console.log('📋 Obteniendo respuestas del cuestionario:', userId)
    
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('❌ Error obteniendo respuestas:', error)
      return { data: null, error }
    }

    console.log('✅ Respuestas obtenidas:', data)
    return { data, error: null }
    
  } catch (error) {
    console.error('❌ Error general obteniendo respuestas:', error)
    return { data: null, error }
  }
}