import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Icon,
  SimpleGrid,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  useDisclosure,
  Image,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  useToast
} from '@chakra-ui/react'
import { 
  FiBook, 
  FiTrendingUp, 
  FiPlus,
  FiBookOpen,
  FiAward,
  FiClock,
  FiPlay,
  FiRefreshCw
} from 'react-icons/fi'
import { 
  MdDashboard, 
  MdLibraryBooks, 
  MdLeaderboard
} from 'react-icons/md'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import NewResourceModal from '../components/modals/NewResourceModal'
import MatchUpLines from '../components/templates/MatchUpLines'
import MatchUpImages from '../components/templates/MatchUpImages'
import Quiz from '../components/templates/Quiz'
import GroupSort from '../components/templates/GroupSort'
import Anagram from '../components/templates/Anagram'
import OpenTheBox from '../components/templates/OpenTheBox'
import CoursePresentation from '../components/templates/CoursePresentation'
import AccordionNotes from '../components/templates/AccordionNotes'
import Timeline from '../components/templates/Timeline'
import FindTheMatch from '../components/templates/FindTheMatch'
import type { MatchUpContent, StudyElement, QuizContent, GroupSortContent, AnagramContent, OpenTheBoxContent, FindTheMatchContent } from '../services/types'
import logoImage from '../assets/Logo-IA.png'

import { getUserResources, type EducationalResource } from '../services/resources'
import { supabase } from '../services/supabase'
import { getResourceProgress, saveResourceProgress, clearResourceProgress } from '../services/resourceProgress'
import { clearTimelineProgressForResource } from '../services/timelineProgress'
import { startNewAttempt, completeAttempt } from '../services/attempts'
// Eliminado soporte H5P

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [activeSection, setActiveSection] = useState('dashboard')
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [resources, setResources] = useState<EducationalResource[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [resourcesError, setResourcesError] = useState<string | null>(null)
  // Eliminado estado para reproducción H5P
  const [playingMatchUp, setPlayingMatchUp] = useState<MatchUpContent | null>(null)
  const [playingStudyElements, setPlayingStudyElements] = useState<StudyElement[] | null>(null)
  const [studyItemCompleted, setStudyItemCompleted] = useState<boolean>(false)
  const [playingResourceId, setPlayingResourceId] = useState<string | null>(null)
  // Temporizador y sesiones activas
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [activeResourceIds, setActiveResourceIds] = useState<Set<string>>(new Set())
  const [completedResourceIds, setCompletedResourceIds] = useState<Set<string>>(new Set())
  const [studyIndex, setStudyIndex] = useState<number>(0)
const [matchUpStage, setMatchUpStage] = useState<'study' | 'quiz' | 'quiz_summary' | 'lines' | 'lines_summary' | 'images' | 'group_sort' | 'group_sort_summary' | 'find_the_match' | 'open_box' | 'anagram' | 'summary' | null>(null)
  const [linesCompleted, setLinesCompleted] = useState<boolean>(false)
  const [imagesCompleted, setImagesCompleted] = useState<boolean>(false)
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false)
  const [groupSortCompleted, setGroupSortCompleted] = useState<boolean>(false)
  const [playingTitle, setPlayingTitle] = useState<string>('')
  const [linesResults, setLinesResults] = useState<Array<{ term: string; chosen: string; expected: string; correct: boolean }>>([])
  const [imagesResults, setImagesResults] = useState<Array<{ expected: string; chosen?: string; imageDescription: string; imageUrl?: string }>>([])
  const [quizResults, setQuizResults] = useState<Array<{ prompt: string; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>>([])
  const [groupSortResults, setGroupSortResults] = useState<Array<{ item: string; chosenGroup: string; expectedGroup: string; correct: boolean }>>([])
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null)
  const [playingQuiz, setPlayingQuiz] = useState<QuizContent | null>(null)
  const [playingGroupSort, setPlayingGroupSort] = useState<GroupSortContent | null>(null)
  const [playingAnagram, setPlayingAnagram] = useState<AnagramContent | null>(null)
  const [playingOpenBox, setPlayingOpenBox] = useState<OpenTheBoxContent | null>(null)
  const [playingFindTheMatch, setPlayingFindTheMatch] = useState<FindTheMatchContent | null>(null)
  const [anagramCompleted, setAnagramCompleted] = useState<boolean>(false)
  const [openBoxCompleted, setOpenBoxCompleted] = useState<boolean>(false)
  const [findMatchCompleted, setFindMatchCompleted] = useState<boolean>(false)
  const [anagramResults, setAnagramResults] = useState<Array<{ answer: string; userAnswer: string; correct: boolean; clue?: string }>>([])
  const [openBoxResults, setOpenBoxResults] = useState<Array<{ question: string; options: string[]; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>>([])
  const [findMatchResults, setFindMatchResults] = useState<Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>>([])
  // Mostrar estado de carga cuando se inicia un nuevo intento para evitar parpadeo de selecciones previas
  const [startingNewAttempt, setStartingNewAttempt] = useState<boolean>(false)
  // IDs persistidos en BD para poder asociar puntajes
  const [matchupLinesId, setMatchupLinesId] = useState<string | null>(null)
  const [matchupImagesId, setMatchupImagesId] = useState<string | null>(null)
  
  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const headerBg = useColorModeValue('white', 'gray.800')
  const sidebarBg = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')



  // Cargar recursos del usuario
  useEffect(() => {
    const loadUserResources = async () => {
      if (user?.id) {
        setLoadingResources(true)
        setResourcesError(null)
        try {
          const { data, error } = await getUserResources(user.id)
          if (error) {
            throw error
          }
          setResources(data || [])
          console.log('✅ Recursos del usuario cargados:', data)
          // Cargar sesiones activas del usuario para mostrar "Continuar"
          try {
            const { getActiveSessionsForUser } = await import('../services/resourceSessions')
            const sessions = await getActiveSessionsForUser(user.id)
            setActiveResourceIds(new Set(sessions.map(s => s.resource_id)))
          } catch (e) {
            console.warn('No se pudieron cargar sesiones activas:', e)
          }
          // Marcar recursos completados (llegaron al resumen) para ajustar estados de botones
          try {
            const completed = new Set<string>()
            for (const r of (data || [])) {
              const prog = getResourceProgress(user.id, r.id)
              if (prog?.stage === 'summary') {
                completed.add(r.id)
              }
            }
            setCompletedResourceIds(completed)
          } catch (e) {
            console.warn('No se pudo leer progreso para estado de completado:', e)
          }
        } catch (error) {
          console.error('❌ Error cargando recursos del usuario:', error)
          setResourcesError('Error al cargar los recursos')
        } finally {
          setLoadingResources(false)
        }
      }
    }

    loadUserResources()
  }, [user?.id])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Base acumulada para el recurso (persistida en BD)
  const [baseAccumulatedSeconds, setBaseAccumulatedSeconds] = useState<number>(0)

  // Tick del temporizador
  useEffect(() => {
    // No iniciar tick si no hay inicio de sesión o si está en pausa
    if (!sessionStartMs || isPaused) {
      return
    }
    const id = setInterval(() => {
      const delta = Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000))
      setElapsedSeconds(baseAccumulatedSeconds + delta)
    }, 1000)
    return () => clearInterval(id)
  }, [sessionStartMs, isPaused, baseAccumulatedSeconds])

  const finalizeSession = async () => {
    if (currentSessionId) {
      const { endResourceSession, addAccumulatedSeconds } = await import('../services/resourceSessions')
      // Antes de finalizar, acumular cualquier intervalo en curso
      if (sessionStartMs != null && !isPaused) {
        const additionalSeconds = Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000))
        await addAccumulatedSeconds(currentSessionId, additionalSeconds)
      }
      await endResourceSession(currentSessionId)
      setCurrentSessionId(null)
      setSessionStartMs(null)
      setElapsedSeconds(0)
      if (playingResourceId) {
        setActiveResourceIds(prev => {
          const next = new Set([...prev])
          next.delete(playingResourceId)
          return next
        })
      }
    }
  }

  // Mínimo: obtener IDs existentes de matchups para este recurso (sin insertar todavía)
  const ensureMatchupElementsPersisted = async (resource: EducationalResource) => {
    try {
      const { data: linesRow } = await supabase
        .from('educational_matchup_lines')
        .select('id')
        .eq('resource_id', resource.id)
        .limit(1)
        .maybeSingle()
      setMatchupLinesId(linesRow?.id ?? null)

      const { data: imagesRow } = await supabase
        .from('educational_matchup_images')
        .select('id')
        .eq('resource_id', resource.id)
        .limit(1)
        .maybeSingle()
      setMatchupImagesId(imagesRow?.id ?? null)
    } catch (e) {
      console.warn('ensureMatchupElementsPersisted error:', e)
    }
  }

  // Prefetch de imágenes de MatchUp para que estén listas antes de llegar al último elemento
  const preloadMatchUpImages = async (matchUp?: MatchUpContent) => {
    try {
      const items = matchUp?.imagesMode?.items || []
      if (!items || items.length === 0) return
      await Promise.allSettled(items.map((it) => new Promise<void>((resolve) => {
        const url = it.imageUrl
        if (!url) return resolve()
        const img: HTMLImageElement = document.createElement('img')
        img.onload = () => resolve()
        img.onerror = () => resolve()
        // Iniciar descarga en segundo plano
        img.src = url
      })))
    } catch (e) {
      console.warn('No se pudo hacer prefetch de imágenes de MatchUp:', e)
    }
  }

  // Guardado de puntajes (no-op si ids/resultado no están listos)
  const saveScoresForCurrentResource = async (mode?: 'lines' | 'images' | 'both') => {
    if (!user?.id || !playingResourceId) return
    try {
      // Helper: realizar upsert manual (select -> update/insert) para evitar errores 400
      const upsertUserScore = async (payload: any, kind: 'lines' | 'images') => {
        // Construir filtro según tipo (evitar usar onConflict cuando el índice único no existe)
        const baseFilter = supabase.from('user_scores').select('id').eq('user_id', payload.user_id).eq('resource_id', payload.resource_id)
        const { data: existing, error: selErr } = kind === 'lines'
          ? await baseFilter.eq('matchup_lines_id', payload.matchup_lines_id).is('matchup_images_id', null).maybeSingle()
          : await baseFilter.is('matchup_lines_id', null).eq('matchup_images_id', payload.matchup_images_id).maybeSingle()
        if (selErr && selErr.code !== 'PGRST116') { // PGRST116: No rows found
          console.warn('user_scores select error', selErr)
        }
        if (existing?.id) {
          const { error: updErr } = await supabase.from('user_scores').update(payload).eq('id', existing.id)
          if (updErr) console.warn('user_scores update error', updErr)
        } else {
          const { error: insErr } = await supabase.from('user_scores').insert(payload)
          if (insErr) console.warn('user_scores insert error', insErr)
        }
      }
      const toSave: Array<'lines' | 'images'> = mode === 'both' ? ['lines', 'images'] : (mode ? [mode] : ['lines', 'images'])
      for (const t of toSave) {
        if (t === 'lines' && matchupLinesId && linesResults.length > 0) {
          const total = linesResults.length
          const correct = linesResults.filter(r => r.correct).length
          // Usar puntaje entero (0-100) para compatibilidad con esquemas remotos que definen score como INTEGER
          const score = total > 0 ? Math.round((correct / total) * 100) : 0
          await upsertUserScore({
            user_id: user.id,
            resource_id: playingResourceId,
            matchup_lines_id: matchupLinesId,
            matchup_images_id: null,
            total_questions: total,
            correct_answers: correct,
            score,
            computed_at: new Date().toISOString()
          }, 'lines')
        }
        if (t === 'images' && matchupImagesId && imagesResults.length > 0) {
          const total = imagesResults.length
          const correct = imagesResults.filter(r => r.chosen === r.expected).length
          // Usar puntaje entero (0-100) para compatibilidad con esquemas remotos que definen score como INTEGER
          const score = total > 0 ? Math.round((correct / total) * 100) : 0
          await upsertUserScore({
            user_id: user.id,
            resource_id: playingResourceId,
            matchup_lines_id: null,
            matchup_images_id: matchupImagesId,
            total_questions: total,
            correct_answers: correct,
            score,
            computed_at: new Date().toISOString()
          }, 'images')
        }
      }
    } catch (e) {
      console.warn('saveScoresForCurrentResource error:', e)
    }
  }

  const handleResourceModalClose = () => {
    onClose()
    // Pausar automáticamente el temporizador si hay una sesión en curso
    // al cerrar el modal de recurso.
    if (currentSessionId && sessionStartMs != null && !isPaused) {
      const additionalSeconds = Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000))
      import('../services/resourceSessions').then(async ({ addAccumulatedSeconds }) => {
        await addAccumulatedSeconds(currentSessionId, additionalSeconds)
      }).catch(() => {})
      setIsPaused(true)
      setSessionStartMs(null)
    }
    // Recargar recursos después de crear uno nuevo
    if (user?.id) {
      const loadUserResources = async () => {
        setLoadingResources(true)
        try {
          const { data, error } = await getUserResources(user.id)
          if (error) throw error
          setResources(data || [])
        } catch (error) {
          console.error('❌ Error recargando recursos:', error)
        } finally {
          setLoadingResources(false)
        }
      }
      loadUserResources()
    }
  }

  const handlePlayResource = async (resource: EducationalResource, options?: { forceNewSession?: boolean }) => {
    try {
  const matchUp = resource.content?.gameelement?.matchUp || resource.content?.matchUp || (resource.content as any)?.gameElements
      const studyEls = resource.content?.studyElements || []
      const quiz = resource.content?.gameelement?.quiz || (resource.content as any)?.quiz || (resource.content as any)?.gameElements?.quiz
      const groupSort = resource.content?.gameelement?.groupSort || (resource.content as any)?.groupSort || (resource.content as any)?.gameElements?.groupSort
      const anagram = resource.content?.gameelement?.anagram || (resource.content as any)?.anagram || (resource.content as any)?.gameElements?.anagram
      const openTheBox = resource.content?.gameelement?.openTheBox || (resource.content as any)?.openTheBox || (resource.content as any)?.gameElements?.openTheBox
      const findTheMatch = resource.content?.gameelement?.findTheMatch || (resource.content as any)?.findTheMatch || (resource.content as any)?.gameElements?.findTheMatch
      // Si se fuerza un nuevo intento, limpiar inmediatamente el estado local y el identificador del intento
      // para que la UI se muestre en blanco mientras se crea el nuevo intento en segundo plano.
      if (options?.forceNewSession) {
        setStartingNewAttempt(true)
        setCurrentAttemptId(null)
        setLinesCompleted(false)
        setImagesCompleted(false)
        setQuizCompleted(false)
        setGroupSortCompleted(false)
        setAnagramCompleted(false)
        setOpenBoxCompleted(false)
        setFindMatchCompleted(false)
        setLinesResults([])
        setImagesResults([])
        setQuizResults([])
        setGroupSortResults([])
        setAnagramResults([])
        setOpenBoxResults([])
        setFindMatchResults([])
      }
      if (matchUp && matchUp.templateType === 'match_up' && matchUp.linesMode?.pairs?.length > 0) {
        setPlayingMatchUp(matchUp)
        const preparedStudy = studyEls.slice(0, 2)
        setPlayingStudyElements(preparedStudy)
        setPlayingQuiz(quiz || null)
        setPlayingGroupSort(groupSort || null)
        setPlayingResourceId(resource.id)
        setStudyIndex(0)
        setPlayingTitle(resource.title)
        setMatchUpStage(studyEls.length > 0 ? 'study' : (quiz ? 'quiz' : 'lines'))
        setLinesCompleted(false)
        setActiveSection('recursos') // mantener contexto de sección
        setLinesResults([])
        setImagesResults([])
        setQuizResults([])
        setGroupSortResults([])
        setQuizCompleted(false)
        setGroupSortCompleted(false)
        setPlayingAnagram(anagram || null)
        setPlayingOpenBox(openTheBox || null)
        setPlayingFindTheMatch(findTheMatch || null)
        setAnagramCompleted(false)
        setOpenBoxCompleted(false)
        setFindMatchCompleted(false)
        setAnagramResults([])
        setOpenBoxResults([])
        setFindMatchResults([])
        // Iniciar/Reanudar sesión del recurso (temporizador)
        if (user?.id) {
          const { getActiveResourceSession, startResourceSession, endResourceSession } = await import('../services/resourceSessions')
          const active = await getActiveResourceSession(user.id, resource.id)
          if (options?.forceNewSession) {
            if (active) {
              await endResourceSession(active.id)
            }
            const started = await startResourceSession(user.id, resource.id)
            if (started) {
              setCurrentSessionId(started.id)
              // Iniciar desde ahora para evitar desfases por zona horaria
              setSessionStartMs(Date.now())
              setIsPaused(false)
              setBaseAccumulatedSeconds(0)
              setElapsedSeconds(0)
            }
            // Limpiar progreso local guardado y registrar nuevo intento desde cero
            clearResourceProgress(user.id, resource.id)
            // Limpiar progreso de la línea de tiempo (si el recurso lo tiene)
            try { await clearTimelineProgressForResource(resource.id) } catch (e) { console.warn('No se pudo limpiar progreso de timeline:', e) }
            try {
              const attempt = await startNewAttempt(resource.id, user.id)
              setCurrentAttemptId(attempt.id || null)
            } catch (e) {
              console.warn('No se pudo iniciar intento nuevo:', e)
            } finally {
              setStartingNewAttempt(false)
            }
          } else if (active) {
            setCurrentSessionId(active.id)
            const acc = (active.accumulated_seconds ?? 0)
            // Reanudar: usar acumulado como base y empezar nuevo tramo desde ahora
            setBaseAccumulatedSeconds(acc)
            setSessionStartMs(Date.now())
            setIsPaused(false)
          } else {
            const started = await startResourceSession(user.id, resource.id)
            if (started) {
              setCurrentSessionId(started.id)
              // Iniciar desde ahora para evitar desfases por zona horaria
              setSessionStartMs(Date.now())
              setIsPaused(false)
              setBaseAccumulatedSeconds(0)
              setElapsedSeconds(0)
            }
          }
          setActiveResourceIds(prev => new Set([...prev, resource.id]))
        }
        // Persistir elementos de juego para tener IDs al guardar puntajes
        await ensureMatchupElementsPersisted(resource)
        // Prefetch de imágenes del modo imágenes desde el inicio
        await preloadMatchUpImages(matchUp)
        // Reiniciar estado de completado de estudio
        setStudyItemCompleted(false)

        // Rehidratar progreso si existe (solo si no se forzó nueva sesión)
        if (user?.id && !options?.forceNewSession) {
          const prog = getResourceProgress(user.id, resource.id)
          if (prog) {
            const validIndex = Math.min(Math.max(0, prog.studyIndex || 0), Math.max(0, preparedStudy.length - 1))
            setStudyIndex(validIndex)
            setStudyItemCompleted(!!prog.studyItemCompleted)
            setLinesCompleted(!!prog.linesCompleted)
            setImagesCompleted(!!prog.imagesCompleted)
            const desiredStage = preparedStudy.length > 0 ? prog.stage : (quiz ? 'quiz' : 'lines')
            setMatchUpStage(desiredStage)
          }
        }
      } else {
        toast({
          title: 'Recurso sin contenido interactivo',
          description: 'Este recurso no contiene una plantilla de emparejamiento (Match up) válida.',
          status: 'warning',
          duration: 4000,
          isClosable: true,
        })
      }
    } catch (error) {
      console.error('❌ Error al iniciar reproducción del recurso:', error)
      toast({
        title: 'Error al iniciar el recurso',
        description: 'No se pudo iniciar la actividad. Intenta nuevamente.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Básico': return 'green'
      case 'Intermedio': return 'yellow'
      case 'Avanzado': return 'red'
      default: return 'gray'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Eliminada función updateUserStats: ya no se utiliza

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard },
    { id: 'recursos', label: 'Recursos', icon: MdLibraryBooks },
    { id: 'ranking', label: 'Ranking', icon: MdLeaderboard }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <VStack spacing={6} align="stretch">
            {/* Sección de Bienvenida */}
            <Box
              bg="linear-gradient(135deg, #000000 0%, #2d2d2d 100%)"
              color="white"
              p={8}
              borderRadius="xl"
              position="relative"
              overflow="hidden"
            >
              <VStack spacing={4} align="start">
                <Text fontSize="3xl" fontWeight="bold">
                  ¡Bienvenida de vuelta, {(() => {
                    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
                    return name.split(' ').map((word: string) => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                  })()}!
                </Text>
                <Text fontSize="lg" opacity={0.9}>
                  Continúa tu aprendizaje con la metodología MINERVA
                </Text>
                <HStack spacing={4} mt={6}>
                  <Button
                  leftIcon={<Icon as={FiPlus} />}
                  bg="white"
                  color="black"
                  variant="solid"
                  onClick={onOpen}
                  _hover={{ transform: 'translateY(-2px)', shadow: 'lg', bg: 'gray.100' }}
                  transition="all 0.2s"
                >
                  Nuevo Recurso
                </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    color="white"
                    borderColor="white"
                    leftIcon={<Icon as={FiBookOpen} />}
                    isDisabled
                    _hover={{ bg: 'whiteAlpha.200' }}
                  >
                    Ver Progreso
                  </Button>
                </HStack>
              </VStack>
            </Box>

            {/* Estadísticas */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={3} align="start">
                    <HStack>
                      <Icon as={FiBookOpen} color="blue.500" boxSize={6} />
                      <Text fontWeight="semibold">Recursos Creados</Text>
                    </HStack>
                    <Text fontSize="2xl" fontWeight="bold">{resources.length}</Text>
                    <Text fontSize="sm" color="gray.600">
                      Materiales de estudio generados
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={3} align="start">
                    <HStack>
                      <Icon as={FiAward} color="green.500" boxSize={6} />
                      <Text fontWeight="semibold">Puntos Totales</Text>
                    </HStack>
                    <Text fontSize="2xl" fontWeight="bold">0</Text>
                    <Text fontSize="sm" color="gray.600">
                      Puntos acumulados jugando
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={3} align="start">
                    <HStack>
                      <Icon as={FiClock} color="purple.500" boxSize={6} />
                      <Text fontWeight="semibold">Tiempo de Estudio</Text>
                    </HStack>
                    <Text fontSize="2xl" fontWeight="bold">0h</Text>
                    <Text fontSize="sm" color="gray.600">
                      Tiempo total invertido
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>

            {/* Recursos Recientes */}
            {resources.length > 0 && (
              <Box>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="xl" fontWeight="bold">Recursos Recientes</Text>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setActiveSection('recursos')}
                  >
                    Ver todos
                  </Button>
                </HStack>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {resources.slice(0, 4).map((resource) => (
                    <Card key={resource.id} bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                      <CardBody>
                        <VStack align="start" spacing={3}>
                          <HStack justify="space-between" w="100%">
                            <Badge colorScheme={getDifficultyColor(resource.difficulty)}>
                              {resource.difficulty}
                            </Badge>
                            <Text fontSize="sm" color="gray.500">
                              {formatDate(resource.created_at)}
                            </Text>
                          </HStack>
                          <Text fontWeight="bold" fontSize="md" noOfLines={2}>
                            {resource.title}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {resource.subject} • {resource.topic}
                          </Text>
                          <Button
                            size="sm"
                            colorScheme="blue"
                            leftIcon={<Icon as={FiPlay} />}
                            onClick={() => handlePlayResource(resource)}
                            isDisabled={!activeResourceIds.has(resource.id) && completedResourceIds.has(resource.id)}
                            w="100%"
                          >
                            {activeResourceIds.has(resource.id) ? 'Continuar' : 'Comenzar'}
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>
            )}
          </VStack>
        )
      
      case 'recursos':
        return (
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between">
              <Box>
                <Text fontSize="2xl" fontWeight="bold">Mis Recursos</Text>
                <Text color="gray.600">Gestiona tus materiales de estudio</Text>
              </Box>
              <Button 
                bg="black"
                color="white"
                _hover={{ bg: "gray.800" }}
                leftIcon={<Icon as={FiPlus} />} 
                onClick={onOpen}
              >
                Nuevo Recurso
              </Button>
            </HStack>
            
            {loadingResources ? (
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={4} py={8}>
                    <Spinner size="xl" color="blue.500" />
                    <Text fontSize="lg" color="gray.600">
                      Cargando recursos...
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ) : resourcesError ? (
              <Alert status="error">
                <AlertIcon />
                {resourcesError}
              </Alert>
            ) : resources.length === 0 ? (
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={4} py={8}>
                    <Icon as={FiBook} boxSize={12} color="gray.400" />
                    <Text fontSize="lg" color="gray.600">
                      Aún no tienes recursos creados
                    </Text>
                    <Text color="gray.500" textAlign="center">
                      Crea tu primer recurso educativo personalizado
                    </Text>
                    <Button 
                      bg="black"
                      color="white"
                      _hover={{ bg: "gray.800" }}
                      leftIcon={<Icon as={FiPlus} />}
                      onClick={onOpen}
                    >
                      Crear Primer Recurso
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {resources.map((resource) => (
                  <Card key={resource.id} bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                    <CardBody>
                      <VStack align="start" spacing={4}>
                        <HStack justify="space-between" w="100%">
                          <Badge colorScheme={getDifficultyColor(resource.difficulty)}>
                            {resource.difficulty}
                          </Badge>
                          <Text fontSize="sm" color="gray.500">
                            {formatDate(resource.created_at)}
                          </Text>
                        </HStack>
                        
                        <VStack align="start" spacing={2} w="100%">
                          <Text fontWeight="bold" fontSize="lg" noOfLines={2}>
                            {resource.title}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {resource.subject} • {resource.topic}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Recurso Educativo
                          </Text>
                        </VStack>

                        <VStack spacing={2} w="100%">
                          <Button
                            colorScheme="blue"
                            leftIcon={<Icon as={FiPlay} />}
                            onClick={() => handlePlayResource(resource)}
                            isDisabled={!activeResourceIds.has(resource.id) && completedResourceIds.has(resource.id)}
                            w="100%"
                          >
                            {activeResourceIds.has(resource.id) ? 'Continuar' : 'Comenzar'}
                          </Button>
                          <HStack spacing={2} w="100%">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Icon as={FiRefreshCw} />}
                              flex={1}
                              isDisabled={!(activeResourceIds.has(resource.id) || completedResourceIds.has(resource.id))}
                              isLoading={startingNewAttempt}
                              onClick={() => handlePlayResource(resource, { forceNewSession: true })}
                            >
                              Comenzar de nuevo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Icon as={FiBookOpen} />}
                              flex={1}
                              isDisabled
                            >
                              Revisar
                            </Button>
                          </HStack>
                        </VStack>

                        {/* Se eliminó la visualización de juegos seleccionados para simplificar el formato del recurso */}
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </VStack>
        )

      case 'ranking':
        return (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="2xl" fontWeight="bold">Ranking Global</Text>
              <Text color="gray.600">Compite con otros estudiantes</Text>
            </Box>
            
            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4} py={8}>
                  <Icon as={FiTrendingUp} boxSize={12} color="gray.400" />
                  <Text fontSize="lg" color="gray.600">
                    Ranking próximamente disponible
                  </Text>
                  <Text color="gray.500" textAlign="center">
                    Completa algunos recursos para aparecer en el ranking
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        )
      
      default:
        return null
    }
  }

  // Vista H5P eliminada

  return (
    <Box minH="100vh" bg={bgColor} w="100%" maxW="100vw">
      {/* Header */}
      <Box
        bg={headerBg}
        borderBottom="1px"
        borderColor={borderColor}
        px={6}
        py={2}
        position="sticky"
        top={0}
        zIndex={1000}
        w="100%"
      >
        <Flex justify="space-between" align="center">
          {/* Logo */}
          <Flex align="center" gap={3}>
            <Image
              src={logoImage}
              alt="Learn Playing"
              height="32px"
              width="auto"
            />
            <Text fontSize="xl" fontWeight="bold" color="gray.800">
              Learn Playing
            </Text>
          </Flex>

          {/* User Menu */}
          <Menu>
            <MenuButton
              as={Box}
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              px={3}
              py={2}
              borderRadius="md"
              transition="all 0.2s"
              minW="fit-content"
              w="auto"
              height="40px"
            >
              <Flex direction="row" align="center" gap={2} height="100%">
                <Avatar
                  size="sm"
                  name={`${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || user?.email}
                  bg="blue.500"
                  flexShrink={0}
                />
                <Text 
                  fontSize="sm" 
                  fontWeight="medium"
                  whiteSpace="nowrap"
                  flexShrink={0}
                >
                  {(() => {
                    const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || '';
                    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
                  })()}
                </Text>
                <Text 
                  fontSize="sm" 
                  fontWeight="medium"
                  whiteSpace="nowrap"
                  flexShrink={0}
                >
                  {(() => {
                    const lastName = user?.user_metadata?.last_name || '';
                    return lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : '';
                  })()}
                </Text>
                <ChevronDownIcon flexShrink={0} />
              </Flex>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleSignOut}>
                Cerrar Sesión
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      <Flex>
        {/* Sidebar */}
        <Box
          bg={sidebarBg}
          borderRight="1px"
          borderColor={borderColor}
          w="250px"
          h="calc(100vh - 60px)"
          position="sticky"
          top="60px"
          p={4}
        >
          <VStack spacing={2} align="stretch">
            {sidebarItems.map((item) => (
              <Flex
                key={item.id}
                align="center"
                gap={3}
                px={4}
                py={3}
                borderRadius="lg"
                cursor="pointer"
                bg={activeSection === item.id ? 'black' : 'transparent'}
                color={activeSection === item.id ? 'white' : 'gray.600'}
                _hover={{ bg: activeSection === item.id ? 'black' : 'gray.100' }}
                transition="all 0.2s"
                onClick={() => setActiveSection(item.id)}
                w="full"
              >
                <Icon as={item.icon} boxSize={5} />
                <Text fontSize="sm" fontWeight={activeSection === item.id ? 'semibold' : 'medium'}>
                  {item.label}
                </Text>
              </Flex>
            ))}
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex={1} p={6} w="100%">
          {playingMatchUp ? (
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Text fontSize="2xl" fontWeight="bold">{playingTitle}</Text>
                <Button 
                  variant="outline" 
                  onClick={() => { 
                    setPlayingMatchUp(null); 
                    setPlayingStudyElements(null); 
                    setMatchUpStage(null); 
                    setLinesCompleted(false); 
                    setLinesResults([]); 
                    setImagesResults([]); 
                    // Pausar temporizador sin finalizar sesión (se reanuda al continuar)
                    if (currentSessionId && sessionStartMs != null && !isPaused) {
                      const additionalSeconds = Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000))
                      import('../services/resourceSessions').then(async ({ addAccumulatedSeconds }) => {
                        await addAccumulatedSeconds(currentSessionId, additionalSeconds)
                      }).catch(() => {})
                    }
                    // Guardar progreso actual antes de salir
                    if (user?.id && playingResourceId) {
                      saveResourceProgress(user.id, playingResourceId, {
                          stage: (matchUpStage ?? 'study') as any,
                        studyIndex,
                        studyItemCompleted,
                        linesCompleted,
                        imagesCompleted,
                      })
                    }
                    setIsPaused(true);
                    setSessionStartMs(null);
                  }}
                >
                  Volver
                </Button>
              </HStack>
              {sessionStartMs && !isPaused && (
                <HStack justify="flex-start" mt={2}>
                  <HStack>
                    <Icon as={FiClock} />
                    <Text fontSize="sm">Tiempo: {new Date(elapsedSeconds * 1000).toISOString().substring(11, 19)}</Text>
                  </HStack>
                </HStack>
              )}
              {startingNewAttempt && (
                <HStack mt={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="gray.600">Iniciando nuevo intento...</Text>
                </HStack>
              )}
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  {matchUpStage === 'study' && playingStudyElements && playingStudyElements.length > 0 && (
                    <>
                      {(() => {
                        const el = playingStudyElements[studyIndex]
                        if (!el) return null
                        if (el.type === 'course_presentation') {
                          return (
                            <>
                              <CoursePresentation key={`cp-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}-${studyIndex}`} title={playingTitle} content={el.content} onCompleted={() => {
                                setStudyItemCompleted(true)
                                // Guardar progreso del estudio actual como completado
                                if (user?.id && playingResourceId) {
                                  saveResourceProgress(user.id, playingResourceId, {
                                    stage: 'study',
                                    studyIndex,
                                    studyItemCompleted: true,
                                  })
                                }
                                // La transición se realizará con el botón Continuar habilitado
                              }} />
                              <HStack mt={4}>
                                <Button colorScheme="blue" isDisabled={!studyItemCompleted} onClick={() => {
                                  const next = studyIndex + 1
                                  setStudyItemCompleted(false)
                                  if (next < playingStudyElements.length) {
                                    setStudyIndex(next)
                                    if (user?.id && playingResourceId) {
                                      saveResourceProgress(user.id, playingResourceId, {
                                        stage: 'study',
                                        studyIndex: next,
                                        studyItemCompleted: false,
                                      })
                                    }
                                  } else {
                                    setMatchUpStage(playingQuiz ? 'quiz' : 'lines')
                                    if (user?.id && playingResourceId) {
                                      saveResourceProgress(user.id, playingResourceId, { stage: playingQuiz ? 'quiz' : 'lines' })
                                    }
                                  }
                                }}>Continuar</Button>
                              </HStack>
                            </>
                          )
                        } else if (el.type === 'accordion_notes') {
                          return (
                            <>
                              <AccordionNotes key={`an-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}-${studyIndex}`} title={playingTitle} content={el.content} onCompleted={() => {
                                setStudyItemCompleted(true)
                                if (user?.id && playingResourceId) {
                                  saveResourceProgress(user.id, playingResourceId, {
                                    stage: 'study',
                                    studyIndex,
                                    studyItemCompleted: true,
                                  })
                                }
                              }} />
                              <HStack mt={4}>
                                <Button colorScheme="blue" isDisabled={!studyItemCompleted} onClick={() => {
                                  const next = studyIndex + 1
                                  setStudyItemCompleted(false)
                                  if (next < playingStudyElements.length) {
                                    setStudyIndex(next)
                                    if (user?.id && playingResourceId) {
                                      saveResourceProgress(user.id, playingResourceId, {
                                        stage: 'study',
                                        studyIndex: next,
                                        studyItemCompleted: false,
                                      })
                                    }
                                  } else {
                                    setMatchUpStage(playingQuiz ? 'quiz' : 'lines')
                                    if (user?.id && playingResourceId) {
                                      saveResourceProgress(user.id, playingResourceId, { stage: playingQuiz ? 'quiz' : 'lines' })
                                    }
                                  }
                                }}>Continuar</Button>
                              </HStack>
                            </>
                          )
                        } else if (el.type === 'timeline') {
                          return (
                            <>
                              <Timeline key={`tl-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}-${studyIndex}`} title={playingTitle} content={el.content} resourceId={playingResourceId ?? undefined} onCompleted={() => {
                                setStudyItemCompleted(true)
                                if (user?.id && playingResourceId) {
                                  saveResourceProgress(user.id, playingResourceId, {
                                    stage: 'study',
                                    studyIndex,
                                    studyItemCompleted: true,
                                  })
                                }
                              }} />
                              <HStack mt={4}>
                                <Button colorScheme="blue" isDisabled={!studyItemCompleted} onClick={() => {
                                  const next = studyIndex + 1
                                  setStudyItemCompleted(false)
                                  if (next < playingStudyElements.length) {
                                    setStudyIndex(next)
                                    if (user?.id && playingResourceId) {
                                      saveResourceProgress(user.id, playingResourceId, {
                                        stage: 'study',
                                        studyIndex: next,
                                        studyItemCompleted: false,
                                      })
                                    }
                                  } else {
                                    setMatchUpStage('lines')
                                    if (user?.id && playingResourceId) {
                                      saveResourceProgress(user.id, playingResourceId, { stage: 'lines' })
                                    }
                                  }
                                }}>Continuar</Button>
                              </HStack>
                            </>
                          )
                        }
                        return null
                      })()}
                    </>
                  )}
                  {matchUpStage === 'quiz' && playingQuiz && (
                    <>
                      <Quiz
                        key={`quiz-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        content={playingQuiz}
                        onComplete={(result) => {
                          setQuizCompleted(true)
                          setQuizResults(result.details || [])
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'quiz' })
                          }
                        }}
                      />
                      <HStack mt={4}>
                        <Button colorScheme="blue" onClick={() => {
                          // Ir directamente al siguiente elemento de juego después del quiz
                          setMatchUpStage('lines')
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'lines' })
                          }
                        }} isDisabled={!quizCompleted}>Continuar</Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'quiz_summary' && (
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="lg" fontWeight="bold">Resumen del Quiz</Text>
                      {quizResults.length === 0 ? (
                        <Text fontSize="sm" color="gray.600">No hay resultados para mostrar.</Text>
                      ) : (
                        quizResults.map((q, idx) => (
                          <Box key={`quiz-sum-${idx}`} p={3} borderWidth="1px" borderRadius="md" borderColor={q.correct ? 'green.300' : 'red.300'} bg={q.correct ? 'green.50' : 'red.50'}>
                            <Text fontSize="sm" fontWeight="semibold">{q.prompt}</Text>
                            <Text fontSize="sm">Tu respuesta: {q.chosenText || 'Sin respuesta'}</Text>
                            {!q.correct && (
                              <Text fontSize="xs" color="red.600">Correcta: {q.correctText}</Text>
                            )}
                            {q.explanation && (
                              <Text fontSize="xs" color="gray.600">Explicación: {q.explanation}</Text>
                            )}
                          </Box>
                        ))
                      )}
                      <HStack mt={2}>
                        <Button colorScheme="blue" onClick={() => {
                          setMatchUpStage('lines')
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'lines' })
                          }
                        }}>Continuar</Button>
                      </HStack>
                    </VStack>
                  )}
                  {matchUpStage === 'lines' && (
                    <>
                      <MatchUpLines
                        key={`lines-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        content={playingMatchUp}
                        onProgress={(results, _allCorrect) => {
                          setLinesResults(results)
                          // Habilitar "Continuar" cuando TODAS las parejas estén conectadas, aunque haya errores
                          const allAssigned = results.every(r => (r.chosen && r.chosen.length > 0))
                          setLinesCompleted(allAssigned)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'lines', linesCompleted: allAssigned })
                          }
                        }}
                        onCompleted={(results) => {
                          setLinesResults(results)
                          setLinesCompleted(true)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'lines', linesCompleted: true })
                          }
                          saveScoresForCurrentResource?.('lines')
                        }}
                      />
                      <HStack mt={4}>
                        <Button colorScheme="blue" onClick={async () => { 
                          // Guardar puntaje de líneas y mostrar resumen
                          await saveScoresForCurrentResource?.('lines')
                          setMatchUpStage('lines_summary')
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'lines_summary' as any })
                          }
                        }} isDisabled={!linesCompleted}>
                          Continuar
                        </Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'lines_summary' && (
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="lg" fontWeight="bold">Resumen de Emparejar líneas</Text>
                      {linesResults.length === 0 ? (
                        <Text fontSize="sm" color="gray.600">No hay resultados para mostrar.</Text>
                      ) : (
                        linesResults.map((r, idx) => (
                          <Box key={`lines-sum-${idx}`} p={3} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
                            <Text fontSize="sm" fontWeight="semibold">{r.term}</Text>
                            <Text fontSize="sm">Tu emparejamiento: {r.chosen || 'Sin respuesta'}</Text>
                            {!r.correct && (
                              <Text fontSize="xs" color="red.600">Correcto: {r.expected}</Text>
                            )}
                          </Box>
                        ))
                      )}
                      <HStack mt={2}>
                        {playingMatchUp.imagesMode && playingMatchUp.imagesMode.items && playingMatchUp.imagesMode.items.length > 0 ? (
                          <Button colorScheme="blue" onClick={() => {
                            setMatchUpStage('images')
                            if (user?.id && playingResourceId) {
                              saveResourceProgress(user.id, playingResourceId, { stage: 'images' })
                            }
                          }}>Continuar</Button>
                        ) : (
                          <Button colorScheme="blue" onClick={async () => {
                            await finalizeSession()
                            setMatchUpStage('summary')
                            if (user?.id && playingResourceId) {
                              saveResourceProgress(user.id, playingResourceId, { stage: 'summary' })
                              setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                            }
                          }}>Finalizar</Button>
                        )}
                      </HStack>
                    </VStack>
                  )}
                  {matchUpStage === 'images' && playingMatchUp.imagesMode && (
                    <>
                      <MatchUpImages
                        key={`images-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        content={playingMatchUp}
                        onProgress={(results, _allCorrect) => {
                          setImagesResults(results)
                          // Habilitar "Finalizar" cuando TODAS las imágenes tengan algún término asignado
                          const allAssigned = results.every(r => (r.chosen && r.chosen.length > 0))
                          setImagesCompleted(allAssigned)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'images', imagesCompleted: allAssigned })
                          }
                        }}
                        onCompleted={(results) => { 
                          setImagesResults(results); 
                          setImagesCompleted(true); 
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'images', imagesCompleted: true })
                          }
                          saveScoresForCurrentResource?.('images') 
                        }}
                      />
                      <HStack mt={4}>
                        <Button colorScheme="blue" onClick={async () => { 
                          // Guardar puntaje de imágenes al finalizar
                          await saveScoresForCurrentResource?.('images')
                          if (playingGroupSort) {
                            setMatchUpStage('group_sort')
                            if (user?.id && playingResourceId) {
                              saveResourceProgress(user.id, playingResourceId, { stage: 'group_sort' })
                            }
                          } else {
                            await finalizeSession()
                            setMatchUpStage('summary')
                            if (user?.id && playingResourceId) {
                              saveResourceProgress(user.id, playingResourceId, { stage: 'summary' })
                              setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                            }
                          }
                        }} isDisabled={!imagesCompleted}>
                          Continuar
                        </Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'group_sort' && playingGroupSort && (
                    <>
                      <GroupSort
                        key={`gs-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        content={playingGroupSort}
                        onComplete={(res) => {
                          setGroupSortCompleted(true)
                          // Calcular resultados: item -> (grupo elegido vs esperado)
                          const expectedMap: Record<string, string> = {}
                          playingGroupSort.groups.forEach(g => g.items.forEach(i => { expectedMap[i] = g.name }))
                          const results = Object.entries(res.placements).map(([item, grp]) => ({
                            item,
                            chosenGroup: grp || '',
                            expectedGroup: expectedMap[item],
                            correct: (grp || '') === expectedMap[item]
                          }))
                          setGroupSortResults(results)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'group_sort' })
                          }
                        }}
                      />
                      <HStack mt={4}>
                        <Button colorScheme="blue" onClick={async () => {
                          await finalizeSession()
                          setMatchUpStage('group_sort_summary')
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'group_sort_summary' as any })
                          }
                        }} isDisabled={!groupSortCompleted}>Continuar</Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'group_sort_summary' && (
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="lg" fontWeight="bold">Resumen de Ordenar por grupo</Text>
                      {groupSortResults.length === 0 ? (
                        <Text fontSize="sm" color="gray.600">No hay resultados para mostrar.</Text>
                      ) : (
                        (() => {
                          const groupNames = playingGroupSort?.groups.map(g => g.name) ?? []
                          const grouped: Record<string, Array<{ item: string; correct: boolean; expectedGroup: string }>> = {}
                          groupNames.forEach(name => { grouped[name] = [] })
                          // No mostrar el cuadro de 'Sin grupo' en el resumen
                          groupSortResults.forEach(r => {
                            const key = r.chosenGroup || ''
                            if (!key) return // omitir elementos sin grupo para no renderizar 'Sin grupo'
                            if (!grouped[key]) grouped[key] = []
                            grouped[key].push({ item: r.item, correct: r.correct, expectedGroup: r.expectedGroup })
                          })
                          return (
                            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                              {Object.entries(grouped).map(([grp, items]) => (
                                <Box key={`gs-sum-grp-${grp}`} p={3} borderWidth="1px" borderRadius="md">
                                  <Text fontWeight="semibold" mb={2}>{grp}</Text>
                                  <HStack flexWrap="wrap" gap={2}>
                                    {items.length === 0 && (
                                      <Text fontSize="sm" color="gray.500">(sin elementos)</Text>
                                    )}
                                    {items.map((it, iidx) => (
                                      <Box key={`gs-sum-item-${grp}-${iidx}`} px={2} py={1} borderWidth="1px" borderRadius="md" borderColor={it.correct ? 'green.300' : 'red.300'} bg={it.correct ? 'green.50' : 'red.50'}>
                                        <Text fontSize="sm">{it.item}</Text>
                                        {!it.correct && (
                                          <Text fontSize="xs" color="red.600">Correcto: {it.expectedGroup}</Text>
                                        )}
                                      </Box>
                                    ))}
                                  </HStack>
                                </Box>
                              ))}
                            </SimpleGrid>
                          )
                        })()
                      )}
                      <HStack mt={2}>
                        <Button colorScheme="blue" onClick={() => {
                          const nextStage = playingFindTheMatch ? 'find_the_match' : (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : 'summary'))
                          setMatchUpStage(nextStage as any)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: nextStage as any })
                            if (nextStage === 'summary') {
                              setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                            }
                          }
                        }}>Continuar</Button>
                      </HStack>
                    </VStack>
                  )}
                  {matchUpStage === 'find_the_match' && playingFindTheMatch && (
                    <>
                      <FindTheMatch
                        key={`ftm-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        content={playingFindTheMatch}
                        onComplete={(details) => {
                          setFindMatchCompleted(true)
                          setFindMatchResults(details)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'find_the_match' as any })
                          }
                        }}
                      />
                      <HStack mt={4}>
                        <Button colorScheme="blue" onClick={async () => {
                          await finalizeSession()
                          const nextStage = playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : 'summary')
                          setMatchUpStage(nextStage as any)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: nextStage as any })
                            if (nextStage === 'summary') {
                              setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                            }
                          }
                        }} isDisabled={!findMatchCompleted}>Continuar</Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'open_box' && playingOpenBox && (
                    <>
                      <OpenTheBox
                        key={`otb-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        content={playingOpenBox}
                        onComplete={(details) => {
                          setOpenBoxCompleted(true)
                          setOpenBoxResults(details)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'open_box' })
                          }
                        }}
                      />
                      <HStack mt={4}>
                        <Button colorScheme="blue" onClick={async () => {
                          await finalizeSession()
                          const nextStage = playingAnagram ? 'anagram' : 'summary'
                          setMatchUpStage(nextStage)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: nextStage as any })
                            if (nextStage === 'summary') {
                              setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                            }
                          }
                        }} isDisabled={!openBoxCompleted}>Continuar</Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'anagram' && playingAnagram && (
                    <>
                      <Anagram
                        key={`an-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        content={playingAnagram}
                        onComplete={(details) => {
                          setAnagramCompleted(true)
                          setAnagramResults(details)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'anagram' as any })
                          }
                        }}
                      />
                      <HStack mt={4}>
                        <Button colorScheme="blue" onClick={async () => {
                          await finalizeSession()
                          setMatchUpStage('summary')
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'summary' })
                            setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                          }
                        }} isDisabled={!anagramCompleted}>Continuar</Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'summary' && (
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="lg" fontWeight="bold">Resumen del recurso</Text>
                      {openBoxResults.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <Text fontWeight="semibold">Abrecajas</Text>
                          {openBoxResults.map((r, idx) => (
                            <Box key={`sum-otb-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
                              <Text fontSize="sm"><strong>{r.question}</strong></Text>
                              <Text fontSize="sm">Tu respuesta: {r.chosenText || 'Sin respuesta'}</Text>
                              {!r.correct && (
                                <Text fontSize="xs" color="red.600">Correcta: {r.correctText}</Text>
                              )}
                              {r.explanation && (
                                <Text fontSize="xs" color="gray.600">Explicación: {r.explanation}</Text>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      )}
                      {findMatchResults.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <Text fontWeight="semibold">Cada oveja con su pareja</Text>
                          {findMatchResults.map((r, idx) => (
                            <Box key={`sum-ftm-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
                              <Text fontSize="sm"><strong>{r.concept}</strong> → {r.chosen || 'Sin respuesta'}</Text>
                              {!r.correct && (
                                <Text fontSize="xs" color="red.600">Correcta: {r.expected}</Text>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      )}
                      {quizResults.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <Text fontWeight="semibold">Quiz</Text>
                          {quizResults.map((q, idx) => (
                            <Box key={`sum-quiz-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={q.correct ? 'green.300' : 'red.300'} bg={q.correct ? 'green.50' : 'red.50'}>
                              <Text fontSize="sm"><strong>{q.prompt}</strong></Text>
                              <Text fontSize="sm">Tu respuesta: {q.chosenText || 'Sin respuesta'}</Text>
                              {!q.correct && (
                                <Text fontSize="xs" color="red.600">Correcta: {q.correctText}</Text>
                              )}
                              {q.explanation && (
                                <Text fontSize="xs" color="gray.600">Explicación: {q.explanation}</Text>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      )}
                      {groupSortResults.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <Text fontWeight="semibold">Ordenar por grupo</Text>
                          {(() => {
                            const groupNames = playingGroupSort?.groups.map(g => g.name) ?? []
                            const grouped: Record<string, Array<{ item: string; correct: boolean; expectedGroup: string }>> = {}
                            groupNames.forEach(name => { grouped[name] = [] })
                            // No incluir 'Sin grupo' en el resumen final
                            groupSortResults.forEach(r => {
                              const key = r.chosenGroup || ''
                              if (!key) return
                              if (!grouped[key]) grouped[key] = []
                              grouped[key].push({ item: r.item, correct: r.correct, expectedGroup: r.expectedGroup })
                            })
                            return (
                              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                                {Object.entries(grouped).map(([grp, items]) => (
                                  <Box key={`sum-gs-grp-${grp}`} p={3} borderWidth="1px" borderRadius="md">
                                    <Text fontWeight="semibold" mb={2}>{grp}</Text>
                                    <HStack flexWrap="wrap" gap={2}>
                                      {items.length === 0 && (
                                        <Text fontSize="sm" color="gray.500">(sin elementos)</Text>
                                      )}
                                      {items.map((it, iidx) => (
                                        <Box key={`sum-gs-item-${grp}-${iidx}`} px={2} py={1} borderWidth="1px" borderRadius="md" borderColor={it.correct ? 'green.300' : 'red.300'} bg={it.correct ? 'green.50' : 'red.50'}>
                                          <Text fontSize="sm">{it.item}</Text>
                                          {!it.correct && (
                                            <Text fontSize="xs" color="red.600">Correcto: {it.expectedGroup}</Text>
                                          )}
                                        </Box>
                                      ))}
                                    </HStack>
                                  </Box>
                                ))}
                              </SimpleGrid>
                            )
                          })()}
                        </VStack>
                      )}
                      <VStack align="stretch" spacing={2}>
                        <Text fontWeight="semibold">Emparejamientos (líneas)</Text>
                        {linesResults.map((r, idx) => (
                          <Box key={`sum-line-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
                            <Text fontSize="sm"><strong>{r.term}</strong> → {r.chosen || 'Sin respuesta'}</Text>
                            {!r.correct && (
                              <Text fontSize="xs" color="red.600">Correcta: {r.expected}</Text>
                            )}
                          </Box>
                        ))}
                      </VStack>
                      {imagesResults.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <Text fontWeight="semibold">Emparejamientos (imágenes)</Text>
                          {imagesResults.map((r, idx) => {
                            const correct = r.chosen && r.chosen === r.expected
                            return (
                              <Box key={`sum-img-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={correct ? 'green.300' : 'red.300'} bg={correct ? 'green.50' : 'red.50'}>
                                <Text fontSize="sm"><strong>{r.expected}</strong> → {r.chosen || 'Sin respuesta'}</Text>
                                {!correct && (
                                  <Text fontSize="xs" color="red.600">Correcta: {r.expected}</Text>
                                )}
                                {r.imageDescription && (
                                  <Text fontSize="xs" color="gray.600">Imagen: {r.imageDescription}</Text>
                                )}
                              </Box>
                            )
                          })}
                        </VStack>
                      )}
                      {anagramResults.length > 0 && (
                        <VStack align="stretch" spacing={2}>
                          <Text fontWeight="semibold">Anagrama</Text>
                          {anagramResults.map((a, idx) => (
                            <Box key={`sum-an-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={a.correct ? 'green.300' : 'red.300'} bg={a.correct ? 'green.50' : 'red.50'}>
                              <Text fontSize="sm">Tu respuesta: {a.userAnswer || 'Sin respuesta'}</Text>
                              {!a.correct && (
                                <Text fontSize="xs" color="red.600">Correcta: {a.answer}</Text>
                              )}
                              {a.clue && (
                                <Text fontSize="xs" color="gray.600">Pista: {a.clue}</Text>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      )}
                      <HStack>
                        <Button colorScheme="blue" onClick={async () => { 
                          await finalizeSession(); 
                          // Completar intento si existe
                          if (currentAttemptId) {
                            try { await completeAttempt(currentAttemptId) } catch {}
                            setCurrentAttemptId(null)
                          }
                          // No limpiar progreso para mantener estado de "completado" en Mis Recursos
                          setPlayingMatchUp(null); 
                          setPlayingStudyElements(null); 
                          setMatchUpStage(null); 
                          setLinesCompleted(false); 
                          setImagesCompleted(false); 
                          setLinesResults([]); 
                          setImagesResults([]); 
                          setActiveSection('recursos') 
                        }}>Salir</Button>
                        <Button variant="outline" isLoading={startingNewAttempt} onClick={async () => {
                          // Reiniciar completamente desde cero forzando nueva sesión y nuevo intento
                          const res = resources.find(r => r.id === playingResourceId)
                          if (res) {
                            await handlePlayResource(res, { forceNewSession: true })
                          }
                        }}>Comenzar de nuevo</Button>
                      </HStack>
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </VStack>
          ) : (
            renderContent()
          )}
        </Box>
      </Flex>

      {/* Modal de Nuevo Recurso */}
      <NewResourceModal 
        isOpen={isOpen} 
        onClose={handleResourceModalClose}
      />
    </Box>
  )
}