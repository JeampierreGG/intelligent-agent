import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Box, Spinner, VStack, Text } from '@chakra-ui/react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiresQuestionnaire?: boolean
}

export default function ProtectedRoute({ 
  children, 
  requiresQuestionnaire = true 
}: ProtectedRouteProps) {
  const { user, loading, hasCompletedQuestionnaire } = useAuth()
  const location = useLocation()

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <Box 
        height="100vh" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        bg="gray.50"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Verificando autenticación...</Text>
        </VStack>
      </Box>
    )
  }

  // Si no está autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Si requiere cuestionario y aún se está verificando
  if (requiresQuestionnaire && hasCompletedQuestionnaire === null) {
    return (
      <Box 
        height="100vh" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        bg="gray.50"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Verificando perfil...</Text>
        </VStack>
      </Box>
    )
  }

  // Si requiere cuestionario y no lo ha completado, redirigir al cuestionario
  if (requiresQuestionnaire && hasCompletedQuestionnaire === false) {
    return <Navigate to="/questionnaire" replace />
  }

  // Si todo está bien, mostrar el contenido protegido
  return <>{children}</>
}