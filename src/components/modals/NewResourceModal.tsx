import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  Checkbox,
  CheckboxGroup,
  Text,
  useToast,
  SimpleGrid,
  Spinner
} from '@chakra-ui/react'
import { generateEducationalResource, type UserPreferences, type ResourceFormData } from '../../services/gemini'
import { saveEducationalResource, type CreateResourceData } from '../../services/resources'
import { useAuth } from '../../contexts/AuthContext'

interface NewResourceModalProps {
  isOpen: boolean
  onClose: () => void
  userPreferences?: {
    academicLevel?: string
    formatPreferences?: string[]
    interactiveActivities?: string[]
    preferredFormats?: string[] // Para compatibilidad con el mapeo
    preferredGames?: string[] // Para compatibilidad con el mapeo
  }
}

const NewResourceModal: React.FC<NewResourceModalProps> = ({
  isOpen,
  onClose,
  userPreferences
}) => {
  const toast = useToast()
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    difficulty: 'Básico',
    resourceType: userPreferences?.preferredFormats?.[0] || 'Aprender Jugando',
    selectedGames: userPreferences?.preferredGames || []
  })

  // Actualizar formulario cuando cambien las preferencias del usuario
  useEffect(() => {
    if (userPreferences) {
      setFormData(prev => ({
        ...prev,
        resourceType: userPreferences.preferredFormats?.[0] || 'Aprender Jugando',
        selectedGames: userPreferences.preferredGames || []
      }))
    }
  }, [userPreferences])

  const difficultyOptions = [
    { value: 'Básico', label: 'Básico' },
    { value: 'Intermedio', label: 'Intermedio' },
    { value: 'Avanzado', label: 'Avanzado' }
  ]

  const resourceTypes = [
    { value: 'Resumen esquemático', label: 'Resumen esquemático' },
    { value: 'Ejercicios prácticos con soluciones', label: 'Ejercicios prácticos con soluciones' },
    { value: 'Cuestionario de preguntas/respuestas', label: 'Cuestionario de preguntas/respuestas' },
    { value: 'Aprender Jugando', label: 'Aprender Jugando (por defecto)' }
  ]

  const gameOptions = [
    { value: 'Cuestionarios interactivos', label: 'Cuestionarios interactivos' },
    { value: 'Arrastrar y soltar', label: 'Arrastrar y soltar' },
    { value: 'Juegos de memoria', label: 'Juegos de memoria' },
    { value: 'Simulaciones', label: 'Simulaciones' },
    { value: 'Presentaciones interactivas', label: 'Presentaciones interactivas' },
    { value: 'Líneas de tiempo interactivas', label: 'Líneas de tiempo interactivas' }
  ]

  const handleSubmit = async () => {
    // Validar que el usuario esté autenticado
    if (!user) {
      toast({
        title: 'Usuario no autenticado',
        description: 'Por favor inicia sesión para generar recursos',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
      return
    }

    if (!formData.subject || !formData.topic) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa la materia y el tema',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
      return
    }

    if (formData.selectedGames.length === 0) {
      toast({
        title: 'Juegos requeridos',
        description: 'Por favor selecciona al menos un tipo de juego/actividad',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
      return
    }

    setIsGenerating(true)

    try {
      // Preparar datos para Gemini
      const resourceData: ResourceFormData = {
        subject: formData.subject,
        topic: formData.topic,
        difficulty: formData.difficulty,
        resourceType: formData.resourceType,
        selectedGames: formData.selectedGames
      }

      const userPrefs: UserPreferences = {
        academicLevel: userPreferences?.academicLevel || 'Universidad',
        formatPreferences: userPreferences?.formatPreferences || userPreferences?.preferredFormats || ['Contenido Interactivo'],
        interactiveActivities: userPreferences?.interactiveActivities || userPreferences?.preferredGames || formData.selectedGames
      }

      console.log('🚀 Generando recurso con Gemini...')
      console.log('📋 Datos del formulario:', resourceData)
      console.log('👤 Preferencias del usuario:', userPrefs)

      // Generar recurso con Gemini
      const generatedResource = await generateEducationalResource(resourceData, userPrefs)

      console.log('✅ Recurso generado exitosamente:', generatedResource)

      // Guardar recurso en Supabase
      console.log('💾 Guardando recurso en Supabase...')
      const resourceToSave: CreateResourceData = {
        user_id: user.id,
        title: generatedResource.title,
        subject: formData.subject,
        topic: formData.topic,
        difficulty: formData.difficulty as 'Básico' | 'Intermedio' | 'Avanzado',
        resource_type: formData.resourceType,
        selected_games: formData.selectedGames,
        content: generatedResource
      }

      const { data: savedResource, error: saveError } = await saveEducationalResource(resourceToSave)

      if (saveError) {
        console.error('❌ Error al guardar recurso:', saveError)
        toast({
          title: 'Recurso generado pero no guardado',
          description: 'El recurso se generó correctamente pero hubo un error al guardarlo. Por favor intenta nuevamente.',
          status: 'warning',
          duration: 5000,
          isClosable: true
        })
        return
      }

      console.log('✅ Recurso guardado exitosamente en Supabase:', savedResource)

      toast({
        title: '¡Recurso creado exitosamente!',
        description: `Se ha creado y guardado el recurso "${generatedResource.title}"`,
        status: 'success',
        duration: 5000,
        isClosable: true
      })

      // Resetear formulario manteniendo las preferencias del usuario
      setFormData({
        subject: '',
        topic: '',
        difficulty: 'Básico',
        resourceType: userPreferences?.preferredFormats?.[0] || 'Aprender Jugando',
        selectedGames: userPreferences?.preferredGames || []
      })
      
      onClose()
    } catch (error) {
      console.error('❌ Error al generar recurso:', error)
      toast({
        title: 'Error al generar recurso',
        description: error instanceof Error ? error.message : 'No se pudo generar el recurso',
        status: 'error',
        duration: 5000,
        isClosable: true
      })
    } finally {
      setIsGenerating(false)
    }
  }



  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>Generar Nuevo Recurso</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            <HStack spacing={4} align="start">
              <FormControl isRequired flex={1}>
                <FormLabel>Materia / Curso</FormLabel>
                <Input
                  placeholder="Ej: Matemáticas, Historia, Programación..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired flex={1}>
                <FormLabel>Tema</FormLabel>
                <Input
                  placeholder="Ej: Ecuaciones cuadráticas, Segunda Guerra Mundial..."
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </FormControl>
            </HStack>

            <HStack spacing={4} align="start">
              <FormControl flex={1}>
                <FormLabel>Tipo de recurso</FormLabel>
                <Select
                  value={formData.resourceType}
                  onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                >
                  {resourceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl flex={1}>
                <FormLabel>Dificultad</FormLabel>
                <Select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                >
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel>
                Juegos/actividades interactivas preferidas
                <Text fontSize="sm" color="gray.600" mt={1}>
                  {formData.resourceType === 'Aprender Jugando' 
                    ? '(Actividades principales para tu recurso)' 
                    : '(Actividades complementarias para reforzar el aprendizaje)'}
                </Text>
              </FormLabel>
              <CheckboxGroup
                value={formData.selectedGames}
                onChange={(values) => setFormData({ ...formData, selectedGames: values as string[] })}
              >
                <SimpleGrid columns={2} spacing={3} mt={3}>
                  {gameOptions.map((game) => (
                    <Checkbox 
                      key={game.value} 
                      value={game.value}
                      colorScheme="blackAlpha"
                      sx={{
                        '& .chakra-checkbox__control[data-checked]': {
                          backgroundColor: 'black',
                          borderColor: 'black',
                          color: 'white'
                        },
                        '& .chakra-checkbox__control:hover': {
                          borderColor: 'black'
                        }
                      }}
                    >
                      {game.label}
                    </Checkbox>
                  ))}
                </SimpleGrid>
              </CheckboxGroup>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose} isDisabled={isGenerating}>
              Cancelar
            </Button>
            <Button 
              bg="black"
              color="white"
              _hover={{ bg: "gray.800" }}
              _active={{ bg: "gray.900" }}
              onClick={handleSubmit}
              isLoading={isGenerating}
              loadingText="Generando con IA..."
              leftIcon={isGenerating ? <Spinner size="sm" /> : undefined}
            >
              {isGenerating ? 'Generando...' : 'Generar Recurso con Gemini'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default NewResourceModal