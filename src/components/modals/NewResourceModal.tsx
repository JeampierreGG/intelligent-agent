import React, { useEffect, useState } from 'react'
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
  VStack,
  HStack,
  Text,
  useToast,
  Spinner
} from '@chakra-ui/react'
import { generateMatchUpResource } from '../../services/openrouter'
import type { ResourceFormData } from '../../services/types'
import { saveEducationalResource, type CreateResourceData } from '../../services/resources'
import { useAuth } from '../../contexts/AuthContext'
import { userProfileService } from '../../services/userProfileService'

interface NewResourceModalProps {
  isOpen: boolean
  onClose: () => void
}

const NewResourceModal: React.FC<NewResourceModalProps> = ({
  isOpen,
  onClose
}) => {
  const toast = useToast()
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    topic: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileBirth, setProfileBirth] = useState<{ birth_day?: string; birth_month?: string; birth_year?: string }>({})
  const [profileLearningGoal, setProfileLearningGoal] = useState<string | undefined>(undefined)

  // Cargar perfil del usuario desde Supabase para obtener fecha_nacimiento y objetivo_aprendizaje
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      setProfileLoading(true)
      try {
        const profile = await userProfileService.getUserProfile(user.id)
        if (profile) {
          // fecha_nacimiento esperada en formato YYYY-MM-DD
          const parts = (profile.fecha_nacimiento || '').split('-')
          if (parts.length === 3) {
            const [year, month, day] = parts
            setProfileBirth({ birth_day: day, birth_month: month, birth_year: year })
          }
          setProfileLearningGoal(profile.objetivo_aprendizaje)
        }
      } catch (e) {
        console.error('❌ Error cargando perfil del usuario:', e)
      } finally {
        setProfileLoading(false)
      }
    }

    if (isOpen) {
      loadProfile()
    }
  }, [isOpen, user?.id])

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

    setIsGenerating(true)

    try {
      // Preparar datos para OpenRouter usando perfil de Supabase como fuente principal
      const resourceData: ResourceFormData = {
        subject: formData.subject,
        topic: formData.topic,
        // La dificultad se deducirá automáticamente en base a la edad y objetivo de aprendizaje
        userBirthData: {
          birth_day: profileBirth.birth_day || user.user_metadata?.birth_day,
          birth_month: profileBirth.birth_month || user.user_metadata?.birth_month,
          birth_year: profileBirth.birth_year || user.user_metadata?.birth_year
        },
        learningGoal: profileLearningGoal || user.user_metadata?.learning_goal
      }

      console.log('🚀 Generando recurso con OpenRouter (Match up)...')
      console.log('📋 Datos del formulario:', resourceData)
      console.log('👤 Datos del usuario (perfil Supabase + metadata):', {
        birthData: resourceData.userBirthData,
        learningGoal: resourceData.learningGoal
      })

      // Generar recurso con OpenRouter (Match up)
      const generatedResource = await generateMatchUpResource(resourceData, { userId: user.id })

      console.log('✅ Recurso generado exitosamente:', generatedResource)

      // Guardar un único recurso combinado (Match up)
      const saveCombined: CreateResourceData = {
        user_id: user.id,
        title: generatedResource.title,
        subject: formData.subject,
        topic: formData.topic,
        difficulty: generatedResource.difficulty || 'Intermedio',
        content: generatedResource
      }
      const { data: savedCombined, error: saveErrCombined } = await saveEducationalResource(saveCombined)
      if (saveErrCombined) throw saveErrCombined

      console.log('✅ Recurso combinado guardado en Supabase:', { savedCombined })

      toast({
        title: '¡Recurso creado!',
        description: 'Se ha creado un recurso Match up con modos de líneas e imágenes. Las imágenes se han cacheado en Supabase para acelerar futuros usos.',
        status: 'success',
        duration: 6000,
        isClosable: true
      })

      // Resetear formulario
      setFormData({
        subject: '',
        topic: ''
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
            <Text fontSize="md" color="gray.600" textAlign="center">
              Ingresa la materia y el tema para generar un recurso educativo interactivo personalizado
            </Text>
            
            <FormControl isRequired>
              <FormLabel>Materia / Curso</FormLabel>
              <Input
                placeholder="Ej: Matemáticas, Historia, Programación, Biología..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                size="lg"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Tema</FormLabel>
              <Input
                placeholder="Ej: Ecuaciones cuadráticas, Segunda Guerra Mundial, Funciones en JavaScript..."
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                size="lg"
              />
            </FormControl>

            <Text fontSize="sm" color="gray.500" textAlign="center" fontStyle="italic">
              El recurso se generará automáticamente con contenido interactivo basado en tus preferencias de aprendizaje
            </Text>
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
              {isGenerating ? 'Generando...' : (profileLoading ? 'Cargando perfil...' : 'Generar Recurso')}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default NewResourceModal