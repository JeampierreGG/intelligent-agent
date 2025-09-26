import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { saveQuestionnaireResponsesSimple } from '../services/questionnaire-simple'
import {
  Container,
  Flex,
  Box,
  Image,
  Heading,
  Text,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  Button,
  RadioGroup,
  Radio,
  Checkbox,
  VStack,
  HStack,
  SimpleGrid,
  Icon,
  FormHelperText
} from '@chakra-ui/react'
import { FaGraduationCap, FaBook, FaGamepad } from 'react-icons/fa'
import logoIA from '../assets/Logo-IA.png'

export default function InitialQuestionnaire() {
  const navigate = useNavigate()
  const { user, checkQuestionnaireStatus, signOut, forceQuestionnaireCompleted } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estados para el formulario
  const [academicLevel, setAcademicLevel] = useState('')
  const [formatPreferences, setFormatPreferences] = useState<string[]>([])
  const [interactiveActivities, setInteractiveActivities] = useState<string[]>([])

  // Componente cargado correctamente

  const handleFormatPreferenceChange = (value: string, checked: boolean) => {
    if (checked && formatPreferences.length < 3) {
      setFormatPreferences([...formatPreferences, value])
    } else if (!checked) {
      setFormatPreferences(formatPreferences.filter(item => item !== value))
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const handleInteractiveActivityChange = (value: string, checked: boolean) => {
    if (checked && interactiveActivities.length < 4) {
      setInteractiveActivities([...interactiveActivities, value])
    } else if (!checked) {
      setInteractiveActivities(interactiveActivities.filter(item => item !== value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validar campos obligatorios
    if (!academicLevel) {
      setError('Por favor completa todos los campos obligatorios')
      setLoading(false)
      return
    }

    if (formatPreferences.length === 0) {
      setError('Por favor selecciona al menos una preferencia de formato')
      setLoading(false)
      return
    }

    if (interactiveActivities.length === 0) {
      setError('Por favor selecciona al menos una actividad interactiva')
      setLoading(false)
      return
    }

    try {
      if (!user?.id) {
        throw new Error('Usuario no autenticado')
      }

      const questionnaireData = {
        user_id: user.id,
        academic_level: academicLevel,
        format_preferences: formatPreferences,
        interactive_activities: interactiveActivities
      }

      console.log('🚀 Guardando cuestionario...')
      
      // Usar el método simple que funciona
      const result = await saveQuestionnaireResponsesSimple(questionnaireData)
      if (result.error) {
        throw result.error
      }
      console.log('✅ Cuestionario guardado exitosamente')
      
      // Actualizar el estado del cuestionario manualmente ya que sabemos que se guardó exitosamente
      console.log('🎯 Cuestionario guardado exitosamente, actualizando estado...')
      
      // Forzar el estado como completado ya que sabemos que se guardó exitosamente
      forceQuestionnaireCompleted()
      
      // También intentar verificar el estado (pero no depender de ello)
      try {
        await checkQuestionnaireStatus()
      } catch (statusError) {
        console.log('⚠️ Error verificando estado, pero continuando porque sabemos que se guardó')
      }
      
      // Redirigir al dashboard inmediatamente ya que sabemos que se guardó
      console.log('🚀 Redirigiendo al dashboard...')
      navigate('/dashboard')
    } catch (err) {
      console.error('❌ Error al guardar cuestionario:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(`Error al guardar las respuestas: ${errorMessage}. Por favor intenta nuevamente.`)
    } finally {
      setLoading(false)
    }
  }



  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Flex justify="center" align="center" mb={4}>
          <Image src={logoIA} alt="Learn Playing" h="60px" />
        </Flex>

        <VStack spacing={4} textAlign="center">
          <Heading size="lg" color="gray.800">
            Personaliza tu experiencia de aprendizaje
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Responde este cuestionario para que podamos adaptar el contenido a tu nivel
            y preferencias de aprendizaje
          </Text>
        </VStack>



        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <VStack spacing={8} align="stretch">
            {/* Nivel de Conocimiento */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
              <VStack align="start" spacing={4}>
                <HStack>
                  <Icon as={FaGraduationCap} color="gray.800" boxSize={5} />
                  <Heading size="md" color="gray.800">Nivel de Conocimiento</Heading>
                </HStack>
                
                <FormControl isRequired>
                  <FormLabel fontWeight="semibold" color="gray.700">
                    ¿Cuál es tu nivel académico actual?
                  </FormLabel>
                  <RadioGroup value={academicLevel} onChange={setAcademicLevel}>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      <Radio value="jardin">Jardín/Preescolar</Radio>
                      <Radio value="primaria">Primaria</Radio>
                      <Radio value="secundaria">Secundaria</Radio>
                      <Radio value="bachillerato">Bachillerato</Radio>
                      <Radio value="tecnico">Técnico/Tecnólogo</Radio>
                      <Radio value="universidad">Universidad</Radio>
                      <Radio value="profesional">Profesional</Radio>
                      <Radio value="especializacion">Especialización</Radio>
                      <Radio value="maestria">Maestría</Radio>
                      <Radio value="doctorado">Doctorado</Radio>
                      <Radio value="postdoctorado">Postdoctorado</Radio>
                      <Radio value="otro">Otro</Radio>
                    </SimpleGrid>
                  </RadioGroup>
                </FormControl>
              </VStack>
            </Box>

            {/* Preferencias de Formato */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
              <VStack align="start" spacing={4}>
                <HStack>
                  <Icon as={FaBook} color="gray.800" boxSize={5} />
                  <Heading size="md" color="gray.800">Preferencias de Formato</Heading>
                </HStack>
                
                <FormControl isRequired>
                  <FormLabel fontWeight="semibold" color="gray.700">
                    ¿Qué tipo de recurso prefieres para aprender? (Selecciona hasta 3)
                  </FormLabel>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <Checkbox 
                      isChecked={formatPreferences.includes('resumenes')}
                      onChange={(e) => handleFormatPreferenceChange('resumenes', e.target.checked)}
                      isDisabled={!formatPreferences.includes('resumenes') && formatPreferences.length >= 3}
                    >
                      Resúmenes cortos y esquemáticos
                    </Checkbox>
                    <Checkbox 
                      isChecked={formatPreferences.includes('explicaciones')}
                      onChange={(e) => handleFormatPreferenceChange('explicaciones', e.target.checked)}
                      isDisabled={!formatPreferences.includes('explicaciones') && formatPreferences.length >= 3}
                    >
                      Explicaciones paso a paso con ejemplos
                    </Checkbox>
                    <Checkbox 
                      isChecked={formatPreferences.includes('ejercicios')}
                      onChange={(e) => handleFormatPreferenceChange('ejercicios', e.target.checked)}
                      isDisabled={!formatPreferences.includes('ejercicios') && formatPreferences.length >= 3}
                    >
                      Ejercicios y cuestionarios
                    </Checkbox>
                    <Checkbox 
                       isChecked={formatPreferences.includes('casos')}
                       onChange={(e) => handleFormatPreferenceChange('casos', e.target.checked)}
                       isDisabled={!formatPreferences.includes('casos') && formatPreferences.length >= 3}
                     >
                       Casos prácticos
                     </Checkbox>
                     <Checkbox 
                       isChecked={formatPreferences.includes('recursos_visuales')}
                       onChange={(e) => handleFormatPreferenceChange('recursos_visuales', e.target.checked)}
                       isDisabled={!formatPreferences.includes('recursos_visuales') && formatPreferences.length >= 3}
                     >
                       Recursos visuales
                     </Checkbox>
                     <Checkbox 
                       isChecked={formatPreferences.includes('interactivo')}
                       onChange={(e) => handleFormatPreferenceChange('interactivo', e.target.checked)}
                       isDisabled={!formatPreferences.includes('interactivo') && formatPreferences.length >= 3}
                     >
                       Contenido Interactivo
                     </Checkbox>
                  </SimpleGrid>
                  <FormHelperText>
                    Seleccionados: {formatPreferences.length}/3
                  </FormHelperText>
                </FormControl>
              </VStack>
            </Box>

            {/* Preferencias de Juegos Interactivos */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
              <VStack align="start" spacing={4}>
                <HStack>
                  <Icon as={FaGamepad} color="gray.800" boxSize={5} />
                  <Heading size="md" color="gray.800">Preferencias de Juegos Interactivos</Heading>
                </HStack>
                
                <FormControl isRequired>
                  <FormLabel fontWeight="semibold" color="gray.700">
                    ¿Qué tipo de actividades interactivas prefieres después de estudiar? (Selecciona hasta 4)
                  </FormLabel>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <Checkbox 
                      isChecked={interactiveActivities.includes('cuestionarios')}
                      onChange={(e) => handleInteractiveActivityChange('cuestionarios', e.target.checked)}
                      isDisabled={!interactiveActivities.includes('cuestionarios') && interactiveActivities.length >= 4}
                    >
                      Cuestionarios interactivos
                    </Checkbox>
                    <Checkbox 
                      isChecked={interactiveActivities.includes('arrastrar')}
                      onChange={(e) => handleInteractiveActivityChange('arrastrar', e.target.checked)}
                      isDisabled={!interactiveActivities.includes('arrastrar') && interactiveActivities.length >= 4}
                    >
                      Arrastrar y soltar
                    </Checkbox>
                    <Checkbox 
                      isChecked={interactiveActivities.includes('memoria')}
                      onChange={(e) => handleInteractiveActivityChange('memoria', e.target.checked)}
                      isDisabled={!interactiveActivities.includes('memoria') && interactiveActivities.length >= 4}
                    >
                      Juegos de memoria
                    </Checkbox>
                    <Checkbox 
                      isChecked={interactiveActivities.includes('simulaciones')}
                      onChange={(e) => handleInteractiveActivityChange('simulaciones', e.target.checked)}
                      isDisabled={!interactiveActivities.includes('simulaciones') && interactiveActivities.length >= 4}
                    >
                      Simulaciones
                    </Checkbox>
                    <Checkbox 
                      isChecked={interactiveActivities.includes('presentaciones')}
                      onChange={(e) => handleInteractiveActivityChange('presentaciones', e.target.checked)}
                      isDisabled={!interactiveActivities.includes('presentaciones') && interactiveActivities.length >= 4}
                    >
                      Presentaciones interactivas
                    </Checkbox>
                    <Checkbox 
                      isChecked={interactiveActivities.includes('timeline')}
                      onChange={(e) => handleInteractiveActivityChange('timeline', e.target.checked)}
                      isDisabled={!interactiveActivities.includes('timeline') && interactiveActivities.length >= 4}
                    >
                      Líneas de tiempo interactivas
                    </Checkbox>
                  </SimpleGrid>
                  <FormHelperText>
                    Seleccionados: {interactiveActivities.length}/4
                  </FormHelperText>
                </FormControl>
              </VStack>
            </Box>

            {/* Botones */}
            <HStack justify="space-between" pt={6}>
              <Button
                variant="outline"
                onClick={handleLogout}
                leftIcon={<Text>←</Text>}
              >
                Volver
              </Button>
              <Button
                type="submit"
                bg="gray.800"
                color="white"
                size="lg"
                px={8}
                isLoading={loading}
                loadingText="Guardando..."
                rightIcon={<Text>🚀</Text>}
                _hover={{ bg: 'gray.700' }}
                _active={{ bg: 'gray.900' }}
              >
                Comenzar mi Aventura de Aprendizaje
              </Button>
            </HStack>

            {/* Footer */}
            <Box textAlign="center" pt={4}>
              <Text fontSize="sm" color="gray.500">
                💡 Tus respuestas nos ayudan a personalizar tu experiencia. Puedes modificar estas preferencias en cualquier momento desde tu perfil.
              </Text>
            </Box>
          </VStack>
        </form>
      </VStack>
    </Container>
  )
}