import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Box, Spinner, Text, VStack } from '@chakra-ui/react'

interface DashboardProtectedRouteProps {
  children: React.ReactNode
}

export const DashboardProtectedRoute: React.FC<DashboardProtectedRouteProps> = ({ children }) => {
  const { user, loading, hasCompletedQuestionnaire, checkQuestionnaireStatus } = useAuth()
  const [isCheckingQuestionnaire, setIsCheckingQuestionnaire] = useState(false)

  useEffect(() => {
    // Si tenemos usuario pero no sabemos el estado del cuestionario, verificarlo
    if (user && hasCompletedQuestionnaire === null && !isCheckingQuestionnaire) {
      setIsCheckingQuestionnaire(true)
      checkQuestionnaireStatus().finally(() => {
        setIsCheckingQuestionnaire(false)
      })
    }
  }, [user, hasCompletedQuestionnaire, checkQuestionnaireStatus, isCheckingQuestionnaire])

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bg="gray.50"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Verificando autenticación...</Text>
        </VStack>
      </Box>
    )
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Mostrar loading mientras se verifica el cuestionario
  if (hasCompletedQuestionnaire === null || isCheckingQuestionnaire) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bg="gray.50"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Verificando estado del cuestionario...</Text>
        </VStack>
      </Box>
    )
  }

  // Si el usuario no ha completado el cuestionario, redirigir al cuestionario inicial
  if (!hasCompletedQuestionnaire) {
    return <Navigate to="/initial-questionnaire" replace />
  }

  // Si todo está bien, mostrar el contenido protegido
  return <>{children}</>
}