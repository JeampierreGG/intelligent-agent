import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasCompletedQuestionnaireSimple } from '../services/questionnaire-simple'

export const useNavigateWithQuestionnaire = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const navigateBasedOnQuestionnaire = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      // Verificar si el usuario completó el cuestionario
      const hasCompleted = await hasCompletedQuestionnaireSimple(user.id)
      
      if (hasCompleted) {
        // Si ya completó el cuestionario, ir al dashboard
        navigate('/dashboard')
      } else {
        // Si no ha completado el cuestionario, ir al cuestionario inicial
        navigate('/initial-questionnaire')
      }
    } catch (error) {
      console.error('Error verificando estado del cuestionario:', error)
      // En caso de error, asumir que no está completado
      navigate('/initial-questionnaire')
    }
  }

  return { navigateBasedOnQuestionnaire }
}