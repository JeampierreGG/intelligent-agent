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
  Spinner,
  Checkbox,
  CheckboxGroup,
  SimpleGrid
} from '@chakra-ui/react'
import { generateStudyOnlyResource, generateGameElementsOnly } from '../../services/openrouter'
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
  // Nuevo: selección de elementos de juego y aprendizaje
  const GAME_OPTIONS = [
    { key: 'match_up', label: 'Unir parejas' },
    { key: 'quiz', label: 'Quiz' },
    { key: 'group_sort', label: 'Ordenar por Grupo' },
    { key: 'anagram', label: 'Anagrama' },
    { key: 'open_the_box', label: 'Abre Cajas' },
    { key: 'find_the_match', label: 'Cada oveja con su pareja' },
  ]
  const LEARNING_OPTIONS = [
    { key: 'timeline', label: 'Línea de Tiempo' },
    { key: 'course_presentation', label: 'Presentación (diapositivas)' },
    { key: 'accordion_notes', label: 'Notas en Acordeón' },
    { key: 'mnemonic_creator', label: 'Mnemotecnia' },
  ]
  const [selectedGame, setSelectedGame] = useState<string[]>([])
  const [selectedLearning, setSelectedLearning] = useState<string[]>([])
  const minGame = 3
  const minLearning = 2
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

    // Validación: Materia/Curso y Tema son obligatorios
    const subj = (formData.subject || '').trim()
    const topc = (formData.topic || '').trim()
    if (!subj || !topc) {
      toast({
        title: 'Campos obligatorios faltantes',
        description: 'Materia/Curso y Tema son obligatorios.',
        status: 'error', duration: 4000, isClosable: true
      })
      return
    }

    // Validaciones de selección mínima
    if (selectedLearning.length < minLearning || selectedGame.length < minGame) {
      toast({
        title: 'Selecciones insuficientes',
        description: `Debes elegir al menos ${minLearning} elementos de aprendizaje y ${minGame} elementos de juego`,
        status: 'warning', duration: 4000, isClosable: true
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

      console.log('🚀 Generando elementos seleccionados (aprendizaje y juego)...')
      console.log('📋 Datos del formulario:', resourceData)
      console.log('👤 Datos del usuario (perfil Supabase + metadata):', {
        birthData: resourceData.userBirthData,
        learningGoal: resourceData.learningGoal
      })

      // Generar en paralelo: elementos de aprendizaje seleccionados + elementos de juego seleccionados
      const [generatedStudy, gameBundle] = await Promise.all([
        generateStudyOnlyResource(resourceData, selectedLearning),
        generateGameElementsOnly(resourceData, selectedGame),
      ])

      console.log('✅ Elementos generados (estudio y juego)')

      // Combinar en un único contenido manteniendo SOLO lo seleccionado
      const selectedElements = [...selectedGame, ...selectedLearning]
      const combinedContent: any = {
        title: generatedStudy.title,
        summary: generatedStudy.summary,
        difficulty: generatedStudy.difficulty || 'Intermedio',
        studyElements: Array.isArray(generatedStudy.studyElements)
          ? generatedStudy.studyElements.filter(el => selectedLearning.includes(el.type))
          : [],
        gameelement: { ...gameBundle },
        // Copias en raíz para compatibilidad con componentes existentes
        ...(gameBundle.matchUp ? { matchUp: gameBundle.matchUp } : {}),
        ...(gameBundle.quiz ? { quiz: gameBundle.quiz } : {}),
        ...(gameBundle.groupSort ? { groupSort: gameBundle.groupSort } : {}),
        ...(gameBundle.anagram ? { anagram: gameBundle.anagram } : {}),
        ...(gameBundle.openTheBox ? { openTheBox: gameBundle.openTheBox } : {}),
        ...(gameBundle.findTheMatch ? { findTheMatch: gameBundle.findTheMatch } : {}),
      }

      const saveCombined: CreateResourceData = {
        user_id: user.id,
        title: generatedStudy.title,
        subject: formData.subject,
        topic: formData.topic,
        difficulty: generatedStudy.difficulty || 'Intermedio',
        content: combinedContent,
        selected_elements: selectedElements,
      }
      const { data: savedCombined, error: saveErrCombined } = await saveEducationalResource(saveCombined)
      if (saveErrCombined) throw saveErrCombined

      console.log('✅ Recurso guardado con TODOS los elementos seleccionados:', { savedCombined })

      toast({ title: 'Recurso creado', description: 'Se generaron todos los elementos seleccionados.', status: 'success', duration: 4000, isClosable: true })

      // Resetear formulario y cerrar el modal
      setFormData({ subject: '', topic: '' })
      setSelectedGame([])
      setSelectedLearning([])
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
         
            
            <HStack spacing={4} align="stretch">
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
            </HStack>

            <VStack align="stretch" spacing={4}>
              <FormLabel>Elementos de Aprendizaje</FormLabel>
              <CheckboxGroup colorScheme="green" value={selectedLearning} onChange={(v) => setSelectedLearning(v as string[])}>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={2}>
                  {LEARNING_OPTIONS.map(opt => (
                    <Checkbox key={opt.key} value={opt.key}>{opt.label}</Checkbox>
                  ))}
                </SimpleGrid>
              </CheckboxGroup>
              <Text fontSize="sm" color={selectedLearning.length < minLearning ? 'red.500' : 'gray.600'}>
                Selecciona al menos {minLearning} elementos de aprendizaje.
              </Text>
            </VStack>

            <VStack align="stretch" spacing={4}>
              <FormLabel>Elementos de Juego</FormLabel>
              <CheckboxGroup colorScheme="blue" value={selectedGame} onChange={(v) => setSelectedGame(v as string[])}>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={2}>
                  {GAME_OPTIONS.map(opt => (
                    <Checkbox key={opt.key} value={opt.key}>{opt.label}</Checkbox>
                  ))}
                </SimpleGrid>
              </CheckboxGroup>
              <Text fontSize="sm" color={selectedGame.length < minGame ? 'red.500' : 'gray.600'}>
                Selecciona al menos {minGame} elementos de juego.
              </Text>
            </VStack>

            <Text fontSize="sm" color="gray.500" textAlign="center" fontStyle="italic">
              Generaremos únicamente los elementos seleccionados para acelerar la creación y la carga del recurso.
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
              isDisabled={isGenerating || selectedLearning.length < minLearning || selectedGame.length < minGame || !(formData.subject?.trim()) || !(formData.topic?.trim())}
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