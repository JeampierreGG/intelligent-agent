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
  Select,
  VStack,
  HStack,
  Text,
  useToast,
  Spinner,
  Checkbox,
  CheckboxGroup,
  SimpleGrid
} from '@chakra-ui/react'
import type { ResourceFormData } from '../../services/types'
import { generateCoursePresentation } from '../../generators/generateCoursePresentation'
import { generateAccordionNotes } from '../../generators/generateAccordionNotes'
import { generateTimeline } from '../../generators/generateTimeline'
import { generateMnemonicCreator } from '../../generators/generateMnemonicCreator'
import { generateQuiz } from '../../generators/generateQuiz'
import { generateGroupSort } from '../../generators/generateGroupSort'
import { generateAnagram } from '../../generators/generateAnagram'
import { generateOpenTheBox } from '../../generators/generateOpenTheBox'
import { generateFindTheMatch } from '../../generators/generateFindTheMatch'
import { generateMatchUp } from '../../generators/generateMatchUp'
import { saveEducationalResource, type CreateResourceData } from '../../services/resources'
import { useAuth } from '../../contexts/useAuth'
import { userProfileService } from '../../services/userProfileService'
// import { useNavigate } from 'react-router-dom'

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
  // const navigate = useNavigate()
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    difficulty: 'Intermedio' as import('../../services/types').ResourceFormData['difficulty']
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
  const [profileAcademicLevel, setProfileAcademicLevel] = useState<string | undefined>(undefined)

  // Cargar perfil del usuario desde Supabase para obtener fecha_nacimiento y nivel_academico
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      setProfileLoading(true)
      try {
        const profile = await userProfileService.getUserProfile(user.id)
        if (profile) {
          const parts = (profile.fecha_nacimiento || '').split('-')
          if (parts.length === 3) {
            const [year, month, day] = parts
            setProfileBirth({ birth_day: day, birth_month: month, birth_year: year })
          }
          setProfileAcademicLevel(profile.nivel_academico)
        } else {
          const md = user.user_metadata || {}
          const bd = { birth_day: md.birth_day as string | undefined, birth_month: md.birth_month as string | undefined, birth_year: md.birth_year as string | undefined }
          const al = md.academic_level as string | undefined
          if (bd.birth_day && bd.birth_month && bd.birth_year && al) {
            const newData = {
              first_name: (md.first_name as string) || '',
              last_name: (md.last_name as string) || '',
              birth_day: bd.birth_day,
              birth_month: bd.birth_month,
              birth_year: bd.birth_year,
              academic_level: al,
            }
            const created = await userProfileService.createUserProfile(user.id, newData)
            if (created) {
              const parts = (created.fecha_nacimiento || '').split('-')
              if (parts.length === 3) {
                const [year, month, day] = parts
                setProfileBirth({ birth_day: day, birth_month: month, birth_year: year })
              }
              setProfileAcademicLevel(created.nivel_academico)
            }
          }
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

  const stripDiacritics = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const sanitizeStrict = (s: string) => stripDiacritics(s).replace(/[^A-Za-z ]/g, '')

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
    const subj = sanitizeStrict(formData.subject || '')
    const topc = sanitizeStrict(formData.topic || '')
    if (!subj || !topc) {
      toast({
        title: 'Campos obligatorios faltantes',
        description: 'Materia/Curso y Tema son obligatorios.',
        status: 'error', duration: 4000, isClosable: true
      })
      return
    }
    if (subj.length < 3 || topc.length < 3) {
      toast({ title: 'Texto demasiado corto', description: 'Usa al menos 3 caracteres en cada campo.', status: 'warning', duration: 3000, isClosable: true })
      return
    }
    if (subj.length > 120 || topc.length > 120) {
      toast({ title: 'Texto demasiado largo', description: 'Máximo 120 caracteres por campo.', status: 'warning', duration: 3000, isClosable: true })
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
        subject: subj,
        topic: topc,
        difficulty: formData.difficulty,
        // La dificultad se deducirá automáticamente en base a la edad y nivel académico
        userBirthData: {
          birth_day: profileBirth.birth_day || user.user_metadata?.birth_day,
          birth_month: profileBirth.birth_month || user.user_metadata?.birth_month,
          birth_year: profileBirth.birth_year || user.user_metadata?.birth_year
        },
        academicLevel: profileAcademicLevel || user.user_metadata?.academic_level
      }

   
      // Generar en paralelo: elementos de aprendizaje seleccionados + elementos de juego seleccionados
      const studyPromises = selectedLearning.map((key) => {
        if (key === 'course_presentation') return generateCoursePresentation(resourceData)
        if (key === 'accordion_notes') return generateAccordionNotes(resourceData)
        if (key === 'timeline') return generateTimeline(resourceData)
        if (key === 'mnemonic_creator') return generateMnemonicCreator(resourceData)
        return Promise.resolve(null)
      })
      const studyResults = await Promise.all(studyPromises)

      const gamePromises = selectedGame.map((key) => {
        if (key === 'quiz') return generateQuiz(resourceData)
        if (key === 'group_sort') return generateGroupSort(resourceData)
        if (key === 'anagram') return generateAnagram(resourceData)
        if (key === 'open_the_box') return generateOpenTheBox(resourceData)
        if (key === 'find_the_match') return generateFindTheMatch(resourceData)
        if (key === 'match_up') return generateMatchUp(resourceData)
        return Promise.resolve(null)
      })
      const gameResults = await Promise.all(gamePromises)


      // Combinar en un único contenido manteniendo SOLO lo seleccionado
      const selectedElements = [...selectedGame, ...selectedLearning]
      const filteredStudy = studyResults.filter(Boolean) as Array<import('../../services/types').StudyElement>
      const dedupStudy: typeof filteredStudy = []
      const seenTypes = new Set<string>()
      for (const el of filteredStudy) {
        const t = el.type
        if (seenTypes.has(t)) continue
        seenTypes.add(t)
        dedupStudy.push(el)
      }
      const matchUp = gameResults.find((r) => r && (r as import('../../services/types').MatchUpContent).templateType === 'match_up') as import('../../services/types').MatchUpContent | undefined
      const quiz = gameResults.find((r) => r && (r as import('../../services/types').QuizContent).templateType === 'quiz') as import('../../services/types').QuizContent | undefined
      const groupSort = gameResults.find((r) => r && (r as import('../../services/types').GroupSortContent).templateType === 'group_sort') as import('../../services/types').GroupSortContent | undefined
      const anagram = gameResults.find((r) => r && (r as import('../../services/types').AnagramContent).templateType === 'anagram') as import('../../services/types').AnagramContent | undefined
      const openTheBox = gameResults.find((r) => r && (r as import('../../services/types').OpenTheBoxContent).templateType === 'open_the_box') as import('../../services/types').OpenTheBoxContent | undefined
      const findTheMatch = gameResults.find((r) => r && (r as import('../../services/types').FindTheMatchContent).templateType === 'find_the_match') as import('../../services/types').FindTheMatchContent | undefined

      const combinedContent: import('../../services/types').GeneratedResource = {
        title: `${resourceData.subject}: ${resourceData.topic}`,
        summary: `Elementos de aprendizaje sobre ${resourceData.topic} en ${resourceData.subject}`,
        difficulty: resourceData.difficulty || 'Intermedio',
        studyElements: dedupStudy,
        gameelement: {
          matchUp,
          quiz,
          groupSort,
          anagram,
          openTheBox,
          findTheMatch,
        },
      }

      const saveCombined: CreateResourceData = {
        user_id: user.id,
        title: `${resourceData.subject}: ${resourceData.topic}`,
        subject: subj,
        topic: topc,
        difficulty: formData.difficulty || 'Intermedio',
        content: combinedContent,
        selected_elements: selectedElements,
      }
      const { data: savedCombined, error: saveErrCombined } = await saveEducationalResource(saveCombined)
      if (saveErrCombined) throw saveErrCombined

      try {
        const c = savedCombined?.content as import('../../services/types').GeneratedResource | undefined
        void c
      } catch (e) {
        console.warn('log recurso completo error:', e)
      }

      toast({ title: 'Recurso creado', description: 'Se generaron todos los elementos seleccionados.', status: 'success', duration: 4000, isClosable: true })

      // Resetear formulario y cerrar el modal
      setFormData({ subject: '', topic: '', difficulty: 'Intermedio' })
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
            {isGenerating && (
              <HStack justify="center" align="center">
                <Spinner />
                <Text color="gray.600">Generando recurso con IA…</Text>
              </HStack>
            )}
         
            
            <HStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Materia / Curso</FormLabel>
                <Input
                  placeholder="Ej: Matemáticas, Historia, Programación, Biología..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: sanitizeStrict(e.target.value) })}
                  onBlur={(e) => setFormData({ ...formData, subject: normalizeFirstUpper(e.target.value) })}
                  size="lg"
                  isDisabled={isGenerating}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Tema</FormLabel>
                <Input
                  placeholder="Ej: Ecuaciones cuadráticas, Segunda Guerra Mundial, Funciones en JavaScript..."
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: sanitizeStrict(e.target.value) })}
                  onBlur={(e) => setFormData({ ...formData, topic: normalizeFirstUpper(e.target.value) })}
                  size="lg"
                  isDisabled={isGenerating}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Dificultad</FormLabel>
                <Select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as ResourceFormData['difficulty'] })}
                  size="lg"
                  isDisabled={isGenerating}
                >
                  <option value="Básico">Básico</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                </Select>
              </FormControl>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              No se permiten números ni caracteres especiales; las tildes se eliminan automáticamente.
            </Text>

            <VStack align="stretch" spacing={4}>
              <FormLabel>Elementos de Aprendizaje</FormLabel>
              <CheckboxGroup colorScheme="green" value={selectedLearning} onChange={(v) => setSelectedLearning(v as string[])} isDisabled={isGenerating}>
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
              <CheckboxGroup colorScheme="blue" value={selectedGame} onChange={(v) => setSelectedGame(v as string[])} isDisabled={isGenerating}>
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
  const normalizeFirstUpper = (s: string) => {
    const t = (s || '').trim()
    if (!t) return ''
    const lower = t.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }
