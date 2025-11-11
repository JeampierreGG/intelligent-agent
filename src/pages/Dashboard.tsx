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
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react'
import { Progress } from '@chakra-ui/react'
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
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import NewResourceModal from '../components/modals/NewResourceModal'
import MatchUpLines from '../components/templates/MatchUpLines'
// MatchUpImages desactivado
import Quiz from '../components/templates/Quiz'
import GroupSort from '../components/templates/GroupSort'
import Anagram from '../components/templates/Anagram'
import OpenTheBox from '../components/templates/OpenTheBox'
import CoursePresentation from '../components/templates/CoursePresentation'
import AccordionNotes from '../components/templates/AccordionNotes'
import Timeline from '../components/templates/Timeline'
import FindTheMatch from '../components/templates/FindTheMatch'
import Nemotecnia from '../components/templates/Nemotecnia'
import MnemonicPractice from '../components/templates/MnemonicPractice'
import Debate from '../components/templates/Debate'
import type { MatchUpContent, StudyElement, QuizContent, GroupSortContent, AnagramContent, OpenTheBoxContent, FindTheMatchContent, MatchUpPair, FindTheMatchPair, DebateContent } from '../services/types'
import logoImage from '../assets/Logo-IA.png'

import { getUserResourcesPaginated, type EducationalResource } from '../services/resources'
import { supabase } from '../services/supabase'
import { getResourceProgress, saveResourceProgress, clearResourceProgress } from '../services/resourceProgress'
import { clearTimelineProgressForResource } from '../services/timelineProgress'
import { startNewAttempt, completeAttempt, saveAttemptFinalScore, getAttemptCount } from '../services/attempts'
import { persistMnemonic } from '../services/mnemonics.ts'
import { getGlobalRanking, type GlobalRankingEntry } from '../services/ranking'
// Eliminado soporte H5P

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const toast = useToast()
  const [activeSection, setActiveSection] = useState('dashboard')
  // Ranking global
  const [ranking, setRanking] = useState<GlobalRankingEntry[]>([])
  const [loadingRanking, setLoadingRanking] = useState<boolean>(false)
  const [rankingError, setRankingError] = useState<string | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [resources, setResources] = useState<EducationalResource[]>([])
  // Paginación de recursos
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 12
  const [totalResourcesCount, setTotalResourcesCount] = useState<number>(0)
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
  // Mapas para progreso (%) y puntaje (0-100) por recurso
  const [resourceProgressMap, setResourceProgressMap] = useState<Record<string, number>>({})
  const [resourceScoreMap, setResourceScoreMap] = useState<Record<string, number>>({})
  const [studyIndex, setStudyIndex] = useState<number>(0)
const [matchUpStage, setMatchUpStage] = useState<'study' | 'mnemonic_practice' | 'quiz' | 'quiz_summary' | 'lines' | 'lines_summary' | 'group_sort' | 'group_sort_summary' | 'find_the_match' | 'find_the_match_summary' | 'open_box' | 'anagram' | 'debate' | 'summary' | null>(null)
  const [linesCompleted, setLinesCompleted] = useState<boolean>(false)
  // Imágenes desactivadas
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false)
  const [groupSortCompleted, setGroupSortCompleted] = useState<boolean>(false)
  const [playingTitle, setPlayingTitle] = useState<string>('')
  const [linesResults, setLinesResults] = useState<Array<{ term: string; chosen: string; expected: string; correct: boolean }>>([])
  // Resultados de imágenes desactivados
  const [quizResults, setQuizResults] = useState<Array<{ prompt: string; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>>([])
  const [groupSortResults, setGroupSortResults] = useState<Array<{ item: string; chosenGroup: string; expectedGroup: string; correct: boolean }>>([])
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null)
  const [playingQuiz, setPlayingQuiz] = useState<QuizContent | null>(null)
  const [playingGroupSort, setPlayingGroupSort] = useState<GroupSortContent | null>(null)
  const [playingAnagram, setPlayingAnagram] = useState<AnagramContent | null>(null)
  const [playingOpenBox, setPlayingOpenBox] = useState<OpenTheBoxContent | null>(null)
const [playingFindTheMatch, setPlayingFindTheMatch] = useState<FindTheMatchContent | null>(null)
  const [playingDebate, setPlayingDebate] = useState<DebateContent | null>(null)
  const [anagramCompleted, setAnagramCompleted] = useState<boolean>(false)
  const [mnemonicPracticeCompleted, setMnemonicPracticeCompleted] = useState<boolean>(false)
  // const [mnemonicPracticeResults, setMnemonicPracticeResults] = useState<Array<{ prompt: string; answer: string; userAnswer: string; correct: boolean }>>([])
  // Estado para mnemotecnia
  const [mnemonicAuto, setMnemonicAuto] = useState<string>('')
  const [mnemonicDraft, setMnemonicDraft] = useState<string>('')
  const [isSavingMnemonic, setIsSavingMnemonic] = useState<boolean>(false)
  const [openBoxCompleted, setOpenBoxCompleted] = useState<boolean>(false)
  // const [findMatchCompleted, setFindMatchCompleted] = useState<boolean>(false)
  const [anagramResults, setAnagramResults] = useState<Array<{ answer: string; userAnswer: string; correct: boolean; clue?: string }>>([])
  const [openBoxResults, setOpenBoxResults] = useState<Array<{ question: string; options: string[]; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>>([])
  const [findMatchResults, setFindMatchResults] = useState<Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>>([])
  // Mostrar estado de carga cuando se inicia un nuevo intento para evitar parpadeo de selecciones previas
  const [startingNewAttempt, setStartingNewAttempt] = useState<boolean>(false)
  const [finalScoreSaved, setFinalScoreSaved] = useState<boolean>(false)
  // IDs persistidos en BD para poder asociar puntajes
  const [matchupLinesId, setMatchupLinesId] = useState<string | null>(null)
  // Intento actual (número) para asociar puntajes parciales correctamente
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState<number | null>(null)
  // ID de MatchUp Images desactivado
  // Estado para revisión por intentos (panel de revisión inline eliminado)
  // Eliminado: reviewResourceId, reviewAttempts, selectedReviewAttempt
  
  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const headerBg = useColorModeValue('white', 'gray.800')
  const sidebarBg = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')
  // Confirmación de salida del recurso
  const { isOpen: isExitOpen, onOpen: onExitOpen, onClose: onExitClose } = useDisclosure()
  const exitCancelRef = useRef<HTMLButtonElement | null>(null)
  
  // Permitir que la navegación externa seleccione la sección activa (por ejemplo, desde la página de revisión)
  useEffect(() => {
    try {
      const section = location?.state?.section as string | undefined
      if (section) {
        setActiveSection(section)
      }
    } catch {}
  }, [location?.state?.section])



  // Computa la puntuación final del recurso en base a 100 puntos,
  // distribuyendo el peso equitativamente entre los elementos de juego presentes.
  // IMPORTANTE: Los elementos de estudio NO suman puntos a la calificación.
  // Para elementos con preguntas/ítems, el peso del elemento se divide entre la
  // cantidad de preguntas/ítems y solo las respuestas correctas aportan a la puntuación.
  const computeWeightedFinalScore = useCallback(() => {
    type BreakdownItem = {
      name: string
      weight: number
      totalItems: number
      correct: number
      contribution: number
    }

    const elements: Array<{ name: string; denom: number; correct: number }> = []

    // Progreso persistido para controlar cuándo sumar puntuaciones (solo al presionar Continuar)
    const prog = (user?.id && playingResourceId) ? getResourceProgress(user.id, playingResourceId) : null

    // Elementos de estudio: NO aportan a la calificación (se excluyen totalmente)

    // Quiz
    if (playingQuiz) {
      const denom = playingQuiz.questions?.length ?? 0
      const correct = quizResults.filter(q => q.correct).length
      // Solo contar resultado una vez que el usuario confirme con Continuar
      elements.push({ name: 'Quiz', denom, correct: prog?.quizConfirmed ? correct : 0 })
    }

    // Emparejamientos (líneas)
    if (playingMatchUp) {
      const denom = playingMatchUp.linesMode?.pairs?.length ?? 0
      const correct = linesResults.filter(r => r.correct).length
      // Solo contar resultado tras presionar Continuar
      elements.push({ name: 'Emparejamientos (líneas)', denom, correct: prog?.linesConfirmed ? correct : 0 })
    }

    // Ordenar por grupo
    if (playingGroupSort) {
      const denom = (playingGroupSort.groups ?? []).reduce((sum, g) => sum + g.items.length, 0)
      const correct = groupSortResults.filter(r => r.correct).length
      elements.push({ name: 'Ordenar por grupo', denom, correct: prog?.groupSortConfirmed ? correct : 0 })
    }

    // Abrecajas
    if (playingOpenBox) {
      const denom = playingOpenBox.items?.length ?? 0
      const correct = openBoxResults.filter(r => r.correct).length
      elements.push({ name: 'Abrecajas', denom, correct: prog?.openBoxConfirmed ? correct : 0 })
    }

    // Anagrama
    if (playingAnagram) {
      const denom = playingAnagram.items?.length ?? 0
      const correct = anagramResults.filter(a => a.correct).length
      elements.push({ name: 'Anagrama', denom, correct: prog?.anagramConfirmed ? correct : 0 })
    }

    // Cada oveja con su pareja
    if (playingFindTheMatch) {
      const denom = playingFindTheMatch.pairs?.length ?? 0
      const correct = findMatchResults.filter(r => r.correct).length
      elements.push({ name: 'Cada oveja con su pareja', denom, correct: prog?.findTheMatchConfirmed ? correct : 0 })
    }

    const totalElements = elements.length
    if (totalElements === 0) {
      return { score: 0, breakdown: [] as BreakdownItem[] }
    }

    const weightPerElement = 100 / totalElements
    let sum = 0
    const breakdown: BreakdownItem[] = elements.map(e => {
      const perItem = e.denom > 0 ? weightPerElement / e.denom : weightPerElement
      const contrib = perItem * e.correct
      sum += contrib
      return {
        name: e.name,
        weight: weightPerElement,
        totalItems: e.denom,
        correct: e.correct,
        contribution: contrib,
      }
    })

    const score = Math.round(sum * 100) / 100 // dos decimales
    return { score, breakdown }
  }, [
    playingQuiz,
    playingMatchUp,
    playingGroupSort,
    playingOpenBox,
    playingAnagram,
    playingFindTheMatch,
    quizResults,
    linesResults,
    groupSortResults,
    openBoxResults,
    anagramResults,
    findMatchResults,
    user?.id,
    playingResourceId,
  ])

  // Calcula el porcentaje de progreso para mostrar en la card del recurso
  const computeCardProgress = useCallback((resource: EducationalResource, prog: ReturnType<typeof getResourceProgress> | null): number => {
    try {
      const content = resource.content as any
      const studyCount: number = (content?.studyElements?.length || 0)
      const quizPresent: boolean = !!(content?.gameelement?.quiz || content?.quiz || content?.gameElements?.quiz)
      const groupSortPresent: boolean = !!(content?.gameelement?.groupSort || content?.groupSort || content?.gameElements?.groupSort)
      const findPresent: boolean = !!(content?.gameelement?.findTheMatch || content?.findTheMatch || content?.gameElements?.findTheMatch)
      const openBoxPresent: boolean = !!(content?.gameelement?.openTheBox || content?.openTheBox || content?.gameElements?.openTheBox)
      const anagramPresent: boolean = !!(content?.gameelement?.anagram || content?.anagram || content?.gameElements?.anagram)
      // Las líneas siempre están presentes en nuestro flujo
      const linesPresent = true

      const order = ['group_sort', 'find_the_match', 'open_box', 'anagram'] as const
      const presentMap: Record<string, boolean> = {
        group_sort: groupSortPresent,
        find_the_match: findPresent,
        open_box: openBoxPresent,
        anagram: anagramPresent,
      }

      // El progreso solo refleja avance de elementos (no páginas de resumen ni respuestas correctas)
      const totalSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0) + (findPresent ? 1 : 0) + (openBoxPresent ? 1 : 0) + (anagramPresent ? 1 : 0)

      if (!prog) return 0
      let completedSegments = 0
      switch (prog.stage) {
        case 'study':
          completedSegments = Math.min(prog.studyIndex ?? 0, studyCount)
          break
        case 'quiz':
          completedSegments = studyCount
          break
        case 'quiz_summary':
          // El resumen del quiz no aumenta progreso; mostrar igual que en etapa 'quiz'
          completedSegments = studyCount
          break
        case 'lines':
          completedSegments = studyCount + (quizPresent ? 1 : 0)
          break
        case 'lines_summary':
          // El resumen de líneas no aumenta progreso; pero las líneas ya se consideran completadas
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0)
          break
        case 'group_sort':
        case 'find_the_match':
        case 'open_box':
        case 'anagram': {
          // Base: estudio + (quiz si existe) + líneas completadas
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0)
          // Juegos completados antes del actual, respetando el orden
          for (const st of order) {
            if (st === prog.stage) break
            if (presentMap[st]) completedSegments += 1
          }
          break
        }
        case 'group_sort_summary': {
          // Mostrar progreso como si 'group_sort' estuviera completado
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0)
          break
        }
        case 'find_the_match_summary': {
          // Respuestas correctas (solo si se omitió). No aumenta progreso del elemento.
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0)
          break
        }
        case 'summary':
          // En resumen, todos los elementos se consideran completados (sin sumar página de resumen)
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0) + (findPresent ? 1 : 0) + (openBoxPresent ? 1 : 0) + (anagramPresent ? 1 : 0)
          break
        default:
          completedSegments = 0
      }
      const pct = totalSegments > 0 ? Math.round((completedSegments / totalSegments) * 100) : 0
      return Math.max(0, Math.min(100, pct))
    } catch (e) {
      console.warn('computeCardProgress error:', e)
      return 0
    }
  }, [])

  // Cargar recursos del usuario
  useEffect(() => {
    const loadUserResources = async () => {
      if (user?.id) {
        setLoadingResources(true)
        setResourcesError(null)
        try {
          const { data, count, error } = await getUserResourcesPaginated(user.id, currentPage, pageSize)
          if (error) {
            throw error
          }
          setResources(data || [])
          setTotalResourcesCount(count || 0)
          console.log('✅ Recursos del usuario (página', currentPage, ') cargados:', data)
          // Ajustar página si excede el total
          const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))
          if (currentPage > totalPages) {
            setCurrentPage(totalPages)
          }
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
            const progressMap: Record<string, number> = {}
            const scoreMap: Record<string, number> = {}
            for (const r of (data || [])) {
              const prog = getResourceProgress(user.id, r.id)
              if (prog?.stage === 'summary') {
                completed.add(r.id)
              }
              // Progreso por recurso
              progressMap[r.id] = computeCardProgress(r, prog)
              // Puntaje final del último intento (si existe)
              try {
                const { data: att } = await supabase
                  .from('educational_resource_attempts')
                  .select('final_score, attempt_number')
                  .eq('user_id', user.id)
                  .eq('resource_id', r.id)
                  .order('attempt_number', { ascending: false })
                  .limit(1)
                const finalScore = (att?.[0]?.final_score as number | null) ?? null
                if (finalScore != null) {
                  scoreMap[r.id] = Math.round(finalScore)
                } else {
                  // Sin puntaje final: mostrar puntaje parcial más reciente (por ahora, líneas) si existe
                  try {
                    const { data: ps } = await supabase
                      .from('user_scores')
                      .select('score, computed_at')
                      .eq('user_id', user.id)
                      .eq('resource_id', r.id)
                      .order('computed_at', { ascending: false })
                      .limit(1)
                    const partial = (ps?.[0]?.score as number | null) ?? null
                    if (partial != null) {
                      scoreMap[r.id] = Math.round(partial)
                    } else {
                      // Fallback local
                      const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                      scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
                    }
                  } catch (e2) {
                    // Fallback local
                    const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                    scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
                  }
                }
              } catch (e) {
                console.warn('No se pudo cargar puntaje final:', e)
              }
            }
            setCompletedResourceIds(completed)
            setResourceProgressMap(progressMap)
            // Fallback adicional: si alguna tarjeta quedó sin puntaje por falta de datos remotos,
            // intenta cargar un puntaje parcial almacenado localmente.
            try {
              if (user?.id) {
                for (const r of data || []) {
                  if (scoreMap[r.id] == null || isNaN(scoreMap[r.id])) {
                    const ps = localStorage.getItem(`partial_score_${user.id}_${r.id}`)
                    if (ps != null) {
                      const parsed = Math.round(parseFloat(ps))
                      if (!isNaN(parsed)) {
                        scoreMap[r.id] = parsed
                      }
                    } else {
                      const fs = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                      const parsed = fs ? Math.round(parseFloat(fs)) : 0
                      scoreMap[r.id] = isNaN(parsed) ? 0 : parsed
                    }
                  }
                }
              }
            } catch {}
            setResourceScoreMap(scoreMap)
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
  }, [user?.id, currentPage])

  // Cargar ranking global cuando se selecciona la sección "ranking"
  useEffect(() => {
    const loadRanking = async () => {
      if (activeSection !== 'ranking') return
      setLoadingRanking(true)
      setRankingError(null)
      try {
        const list = await getGlobalRanking(50)
        setRanking(list)
      } catch (e) {
        console.error('Error cargando ranking global:', e)
        setRankingError('No se pudo cargar el ranking global')
      } finally {
        setLoadingRanking(false)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadRanking()
  }, [activeSection])

  // Guardar puntaje final cuando se llega al resumen
  useEffect(() => {
    const persistFinalScore = async () => {
      if (matchUpStage === 'summary' && currentAttemptId && !finalScoreSaved) {
        const res = computeWeightedFinalScore()
        const rounded = Math.round(res.score)
        // Preparar snapshot completo del resumen para revisión futura
        // Tiempo del intento (en segundos) tomando la sesión activa si existe
        const attemptSeconds = (() => {
          try {
            if (sessionStartMs && !isPaused) {
              const delta = Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000))
              return (baseAccumulatedSeconds ?? 0) + delta
            }
            return (totalResourceSeconds ?? baseAccumulatedSeconds ?? 0)
          } catch {
            return 0
          }
        })()

        // Progreso del intento (%) usando la misma lógica del HUD
        const attemptProgressPct = (() => {
          try {
            const resObj = resources.find(r => r.id === playingResourceId)
            const prog = (user?.id && playingResourceId) ? getResourceProgress(user.id, playingResourceId) : null
            return resObj ? computeCardProgress(resObj, prog) : 0
          } catch (e) {
            console.warn('attempt_progress_pct compute error:', e)
            return 0
          }
        })()

        const summarySnapshot = {
          score: rounded,
          breakdown: res.breakdown,
          quizResults,
          linesResults,
          groupSortResults,
          openBoxResults,
          anagramResults,
          findMatchResults,
          attempt_time_seconds: attemptSeconds,
          attempt_progress_pct: attemptProgressPct,
        }
        const ok = await saveAttemptFinalScore(currentAttemptId, rounded, res.breakdown, summarySnapshot)
        if (ok) {
          setFinalScoreSaved(true)
          if (user?.id && playingResourceId) {
            localStorage.setItem(`final_score_${user.id}_${playingResourceId}`, String(rounded))
            setResourceScoreMap(prev => ({ ...prev, [playingResourceId!]: rounded }))
          }
        }
      }
    }
    persistFinalScore()
  }, [matchUpStage, currentAttemptId, finalScoreSaved, computeWeightedFinalScore, quizResults, linesResults, groupSortResults, openBoxResults, anagramResults, findMatchResults])

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
  // Tiempo total del recurso (capturado al finalizar la sesión)
  const [totalResourceSeconds, setTotalResourceSeconds] = useState<number | null>(null)

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
        // Capturar tiempo total del recurso para mostrar en el resumen
        setTotalResourceSeconds((baseAccumulatedSeconds ?? 0) + additionalSeconds)
      } else {
        // Si la sesión ya estaba en pausa, usar el acumulado base
        setTotalResourceSeconds(baseAccumulatedSeconds ?? 0)
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

      // No cargar ID de imágenes: modo desactivado
    } catch (e) {
      console.warn('ensureMatchupElementsPersisted error:', e)
    }
  }

  // Prefetch de imágenes desactivado

  // Guardado de puntajes (imágenes desactivadas)
  const saveScoresForCurrentResource = async () => {
    if (!user?.id || !playingResourceId) return
    try {
      // Helper: realizar upsert manual (select -> update/insert) para evitar errores 400
      const upsertUserScore = async (payload: any) => {
        // Construir filtro según tipo (evitar usar onConflict cuando el índice único no existe)
        let baseFilter = supabase.from('user_scores').select('id').eq('user_id', payload.user_id).eq('resource_id', payload.resource_id)
        if (payload.attempt_number != null) {
          baseFilter = baseFilter.eq('attempt_number', payload.attempt_number)
        }
        const { data: existing, error: selErr } = await baseFilter.eq('matchup_lines_id', payload.matchup_lines_id).is('matchup_images_id', null).maybeSingle()
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
      // Guardar solo puntajes de líneas
      if (matchupLinesId && linesResults.length > 0) {
        const total = linesResults.length
        const correct = linesResults.filter(r => r.correct).length
        const score = total > 0 ? Math.round((correct / total) * 100) : 0
        // Intento actual: usar estado si existe, si no, obtener el conteo como número de intento
        let attemptNum: number | null = currentAttemptNumber ?? null
        try {
          if (attemptNum == null && user?.id && playingResourceId) {
            attemptNum = await getAttemptCount(playingResourceId, user.id)
          }
        } catch {}
        // Tiempo acumulado del intento hasta ahora
        const additional = (sessionStartMs != null && !isPaused) ? Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000)) : 0
        const timeSeconds = Math.max(0, (baseAccumulatedSeconds || 0) + additional)
        // Progreso del recurso (para porcentaje)
        let progressPct = 0
        try {
          const resObj = resources.find(r => r.id === playingResourceId)
          const latestProg = user?.id ? getResourceProgress(user.id, playingResourceId) : null
          progressPct = resObj ? computeCardProgress(resObj, latestProg) : 0
        } catch {}
        await upsertUserScore({
          user_id: user.id,
          resource_id: playingResourceId,
          matchup_lines_id: matchupLinesId,
          matchup_images_id: null,
          total_questions: total,
          correct_answers: correct,
          score,
          percentage: score,
          max_score: 100,
          time_spent_seconds: timeSeconds,
          progress_pct: progressPct,
          attempt_number: attemptNum ?? null,
          attempt_id: currentAttemptId ?? null,
          computed_at: new Date().toISOString()
        })
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
    // Guardar puntajes parciales del recurso actual (por ahora, líneas) al cerrar el modal
    try {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      saveScoresForCurrentResource()
    } catch (e) {
      console.warn('No se pudieron guardar puntajes parciales al cerrar modal:', e)
    }
    // Recargar recursos después de crear uno nuevo
    if (user?.id) {
      const loadUserResources = async () => {
        setLoadingResources(true)
        try {
          const { data, count, error } = await getUserResourcesPaginated(user.id, currentPage, pageSize)
          if (error) throw error
          setResources(data || [])
          setTotalResourcesCount(count || 0)
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
        // Imágenes desactivadas
        setQuizCompleted(false)
        setGroupSortCompleted(false)
        setAnagramCompleted(false)
        setOpenBoxCompleted(false)
        setLinesResults([])
        // Imágenes desactivadas
        setQuizResults([])
        setGroupSortResults([])
        setAnagramResults([])
        setOpenBoxResults([])
        setFindMatchResults([])
      }
      if (matchUp && matchUp.templateType === 'match_up' && matchUp.linesMode?.pairs?.length > 0) {
        setPlayingMatchUp(matchUp)
        // Preparar elementos de estudio (máx. 2) y añadir Nemotecnia si hay material
        const preparedStudyBase = studyEls.slice(0, 2)
        const mnemonicSourcePairs = (findTheMatch?.pairs && findTheMatch.pairs.length >= 4)
          ? findTheMatch.pairs.slice(0, 4).map((p: FindTheMatchPair) => ({ prompt: p.concept, answer: p.affirmation }))
          : ((matchUp.linesMode?.pairs?.slice(0, 4) as MatchUpPair[]) || []).map((p: MatchUpPair) => ({ prompt: p.left, answer: p.right }))
        const preparedStudy = [...preparedStudyBase]
        if (mnemonicSourcePairs.length === 4) {
          preparedStudy.push({
            type: 'mnemonic_creator',
            content: {
              title: 'Mnemotecnia',
              items: mnemonicSourcePairs,
              topic: resource.content?.gameelement?.matchUp?.topic || (resource.content as any)?.topic || undefined,
              subject: resource.content?.gameelement?.matchUp?.subject || (resource.content as any)?.subject || undefined,
              exampleText: 'Para recordar una secuencia, puedes crear una frase con las iniciales de cada palabra clave.'
            }
          })
        }
        setPlayingStudyElements(preparedStudy)
        setPlayingQuiz(quiz || null)
        setPlayingGroupSort(groupSort || null)
        setPlayingResourceId(resource.id)
        setStudyIndex(0)
        setPlayingTitle(resource.title)
        setMatchUpStage(preparedStudy.length > 0 ? 'study' : (quiz ? 'quiz' : 'lines'))
        setMnemonicAuto('')
        setMnemonicDraft('')
        setIsSavingMnemonic(false)
        setLinesCompleted(false)
        setActiveSection('recursos') // mantener contexto de sección
        try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {}
        setLinesResults([])
        // Imágenes desactivadas
        setQuizResults([])
        setGroupSortResults([])
        setQuizCompleted(false)
        setGroupSortCompleted(false)
        setPlayingAnagram(anagram || null)
        setPlayingOpenBox(openTheBox || null)
        setPlayingFindTheMatch(findTheMatch || null)
        // Preparar contenido para Debate final (sin puntaje)
        setPlayingDebate({
          templateType: 'debate',
          title: resource.title,
          subject: resource.content?.gameelement?.matchUp?.subject || (resource.content as any)?.subject || 'General',
          topic: resource.content?.gameelement?.matchUp?.topic || (resource.content as any)?.topic || resource.title,
          instructions: 'Debate: el sistema generará una pregunta con posturas a favor y en contra. Comparte tu opinión y continúa las rondas cuando lo desees.'
        })
        setAnagramCompleted(false)
        setOpenBoxCompleted(false)
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
              setCurrentAttemptNumber(attempt.attemptNumber || null)
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
            try {
              const cnt = await getAttemptCount(resource.id, user.id)
              setCurrentAttemptNumber(cnt || null)
            } catch {}
          } else {
            const started = await startResourceSession(user.id, resource.id)
            if (started) {
              setCurrentSessionId(started.id)
              // Iniciar desde ahora para evitar desfases por zona horaria
              setSessionStartMs(Date.now())
              setIsPaused(false)
              setBaseAccumulatedSeconds(0)
              setElapsedSeconds(0)
              try {
                const cnt = await getAttemptCount(resource.id, user.id)
                setCurrentAttemptNumber(cnt || null)
              } catch {}
            }
          }
          setActiveResourceIds(prev => new Set([...prev, resource.id]))
        }
        // Persistir elementos de juego para tener IDs al guardar puntajes
        await ensureMatchupElementsPersisted(resource)
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
            // Imágenes desactivadas
            let desiredStage = preparedStudy.length > 0 ? (prog.stage as any) : (quiz ? 'quiz' : 'lines')
            if (desiredStage === 'images') {
              desiredStage = groupSort ? 'group_sort' : 'summary'
            }
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

  const handleReviewResource = (resource: EducationalResource) => {
    try {
      navigate(`/review/${resource.id}`)
    } catch (e) {
      console.error('Error al navegar a la revisión del recurso:', e)
      toast({ title: 'No se pudo abrir la revisión', status: 'error', duration: 3000, isClosable: true })
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
                    <Text fontSize="2xl" fontWeight="bold">{totalResourcesCount}</Text>
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
            {totalResourcesCount > 0 && (
              <Box>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="xl" fontWeight="bold">Recursos Recientes</Text>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setActiveSection('recursos')
                      try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {}
                    }}
                  >
                    Ver todos
                  </Button>
                </HStack>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {resources.slice(0, 6).map((resource) => (
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
                            <Text fontWeight="bold" fontSize="lg" noOfLines={2} minH="48px">
                              {resource.title}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {resource.subject} • {resource.topic}
                            </Text>
                            <HStack justify="space-between" w="100%">
                              <Text fontSize="sm" color="gray.700">Progreso: {resourceProgressMap[resource.id] ?? 0}%</Text>
                              <Text fontSize="sm" color="gray.700">Puntuación: {(resourceScoreMap[resource.id] ?? 0)}/100</Text>
                            </HStack>
                            <Progress value={resourceProgressMap[resource.id] ?? 0} size="sm" colorScheme="blue" w="100%" />
                          </VStack>

                          <VStack spacing={2} w="100%">
                            <Button
                              colorScheme="blue"
                              leftIcon={<Icon as={FiPlay} />}
                              onClick={() => handlePlayResource(resource)}
                              isDisabled={(resourceProgressMap[resource.id] ?? 0) >= 100 || completedResourceIds.has(resource.id)}
                              w="100%"
                            >
                              {(() => {
                                const prog = resourceProgressMap[resource.id] ?? 0
                                return prog > 0 && prog < 100 ? 'Reanudar' : 'Comenzar'
                              })()}
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
                                Reintentar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Icon as={FiBookOpen} />}
                                flex={1}
                                onClick={() => handleReviewResource(resource)}
                              >
                                Revisar
                              </Button>
                            </HStack>
                          </VStack>
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
            
            {/* La revisión por intentos ahora se muestra en una página dedicada (/review/:resourceId) */}
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
            ) : totalResourcesCount === 0 ? (
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
              <>
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
                          <Text fontWeight="bold" fontSize="lg" noOfLines={2} minH="48px">
                            {resource.title}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {resource.subject} • {resource.topic}
                          </Text>
                          <HStack justify="space-between" w="100%">
                            <Text fontSize="sm" color="gray.700">Progreso: {resourceProgressMap[resource.id] ?? 0}%</Text>
                            <Text fontSize="sm" color="gray.700">Puntuación: {(resourceScoreMap[resource.id] ?? 0)}/100</Text>
                          </HStack>
                          <Progress value={resourceProgressMap[resource.id] ?? 0} size="sm" colorScheme="blue" w="100%" />
                        </VStack>

                        <VStack spacing={2} w="100%">
                          <Button
                            colorScheme="blue"
                            leftIcon={<Icon as={FiPlay} />}
                            onClick={() => handlePlayResource(resource)}
                            isDisabled={(resourceProgressMap[resource.id] ?? 0) >= 100 || completedResourceIds.has(resource.id)}
                            w="100%"
                          >
                            {(() => {
                              const prog = resourceProgressMap[resource.id] ?? 0
                              return prog > 0 && prog < 100 ? 'Reanudar' : 'Comenzar'
                            })()}
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
                              Reintentar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Icon as={FiBookOpen} />}
                              flex={1}
                              onClick={() => handleReviewResource(resource)}
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
              {/* Controles de paginación */}
              {totalResourcesCount > 0 && (
                <HStack justify="space-between" align="center" mt={4}>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    isDisabled={currentPage <= 1}
                  >
                    Anterior
                  </Button>
                  <Text color="gray.600">
                    Página {currentPage} de {Math.max(1, Math.ceil(totalResourcesCount / pageSize))}
                  </Text>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalResourcesCount / pageSize)), p + 1))}
                    isDisabled={currentPage >= Math.max(1, Math.ceil(totalResourcesCount / pageSize))}
                  >
                    Siguiente
                  </Button>
                </HStack>
              )}
              </>
            )}
          </VStack>
        )

      case 'ranking':
        return (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="2xl" fontWeight="bold">Ranking Global</Text>
              <Text color="gray.600">Compite con otros estudiantes</Text>
              <Text color="gray.500" fontSize="sm">El "Total" corresponde a la suma de tus puntajes finales por recurso (último intento).</Text>
            </Box>
            
            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                {loadingRanking ? (
                  <HStack justify="center" py={8}><Spinner /></HStack>
                ) : rankingError ? (
                  <VStack spacing={2} py={6}>
                    <Text color="red.500">{rankingError}</Text>
                    <Text color="gray.500" fontSize="sm">Intenta nuevamente más tarde.</Text>
                  </VStack>
                ) : ranking.length === 0 ? (
                  <VStack spacing={4} py={8}>
                    <Icon as={FiTrendingUp} boxSize={12} color="gray.400" />
                    <Text fontSize="lg" color="gray.600">Aún no hay datos de ranking</Text>
                    <Text color="gray.500" textAlign="center">Completa recursos para sumar puntos y aparecer en el ranking</Text>
                  </VStack>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {ranking.map((entry, idx) => {
                      const position = idx + 1
                      const isTop3 = position <= 3
                      const isCurrentUser = entry.user_id === user?.id
                      const trophyColor = position === 1 ? '#DAA520' : position === 2 ? '#C0C0C0' : position === 3 ? '#CD7F32' : undefined
                      const bg = isTop3 ? (position === 1 ? 'yellow.50' : position === 2 ? 'gray.50' : 'orange.50') : 'transparent'
                      const displayName = (() => {
                        if (isCurrentUser) {
                          const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Yo'
                          const lastName = user?.user_metadata?.last_name || ''
                          return `${firstName}${lastName ? ' ' + lastName : ''}`
                        }
                        // Fallback: mostrar parte del user_id
                        const uid = entry.user_id
                        return `Usuario ${uid.slice(0, 4)}…${uid.slice(-4)}`
                      })()
                      return (
                        <HStack key={entry.user_id} spacing={4} p={3} borderRadius="md" bg={bg} borderWidth={isTop3 ? '1px' : '0'} borderColor={borderColor}>
                          <HStack minW="80px" w="80px">
                            <Badge colorScheme="blue" fontSize="md">{position}°</Badge>
                            {isTop3 && <Icon as={FiAward} color={trophyColor} />}
                          </HStack>
                          <HStack justify="space-between" flex={1}>
                            <Text fontWeight={isTop3 ? 'semibold' : 'normal'} color={isCurrentUser ? 'blue.600' : undefined}>{displayName}</Text>
                            <HStack>
                              <Badge colorScheme={isTop3 ? 'purple' : 'gray'}>Total</Badge>
                              <Text fontWeight="bold">{entry.total_score}</Text>
                            </HStack>
                          </HStack>
                        </HStack>
                      )
                    })}
                  </VStack>
                )}
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
        // Fijamos una altura consistente para alinear el sidenav con el nav superior
        h="60px"
        position="sticky"
        top={0}
        zIndex={1000}
        w="100%"
      >
        <Flex justify="space-between" align="center" h="100%">
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
                onClick={() => {
                  setActiveSection(item.id)
                  try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {}
                }}
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
                    // Mostrar advertencia de salida: se perderá lo avanzado
                    onExitOpen()
                  }}
                >
                  Volver
                </Button>
              </HStack>
              {/* HUD: Tiempo, Progreso y Calificación visible para todos los elementos */}
              <VStack align="stretch" spacing={2}>
                <HStack justify="flex-start">
                  <HStack>
                    <Icon as={FiClock} />
                    {(() => {
                      // Mostrar tiempo en curso si la sesión está activa; si no, mostrar acumulado/total
                      const secs = (sessionStartMs && !isPaused)
                        ? elapsedSeconds
                        : (totalResourceSeconds ?? baseAccumulatedSeconds)
                      const hhmmss = new Date((secs ?? 0) * 1000).toISOString().substring(11, 19)
                      return <Text fontSize="sm">Tiempo: {hhmmss}</Text>
                    })()}
                  </HStack>
                </HStack>
                <HStack justify="space-between" align="center">
                  {(() => {
                    // Progreso actual del recurso
                    const res = resources.find(r => r.id === playingResourceId)
                    const prog = (user?.id && playingResourceId) ? getResourceProgress(user.id, playingResourceId) : null
                    const pct = res ? computeCardProgress(res, prog) : 0
                    return (
                      <VStack align="stretch" spacing={1} flex={1} mr={4}>
                        <Text fontSize="xs" color="gray.600">Progreso: {pct}%</Text>
                        <Progress value={pct} size="sm" colorScheme="blue" w="100%" />
                      </VStack>
                    )
                  })()}
                  {(() => {
                    // Calificación dinámica basada en el avance actual
                    const { score } = computeWeightedFinalScore()
                    return (
                      <Text fontSize="sm" color="gray.700" minW="120px" textAlign="right">Calificación: {score.toFixed(2)} / 100</Text>
                    )
                  })()}
                </HStack>
              </VStack>
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
                              <HStack mt={4} justify="flex-end">
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
                              <AccordionNotes
                                key={`an-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}-${studyIndex}`}
                                title={playingTitle}
                                content={el.content}
                                persistKey={`res-${playingResourceId ?? 'nores'}-att-${currentAttemptId ?? 'noattempt'}-study-${studyIndex}`}
                                onCompleted={() => {
                                  setStudyItemCompleted(true)
                                  if (user?.id && playingResourceId) {
                                    saveResourceProgress(user.id, playingResourceId, {
                                      stage: 'study',
                                      studyIndex,
                                      studyItemCompleted: true,
                                    })
                                  }
                                }}
                              />
                              <HStack mt={4} justify="flex-end">
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
                              <HStack mt={4} justify="flex-end">
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
                        } else if (el.type === 'mnemonic_creator') {
                          return (
                            <>
                              <Nemotecnia
                                key={`mn-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}-${studyIndex}`}
                                title={playingTitle}
                                content={el.content as any}
                                onAutoGenerated={(text) => setMnemonicAuto(text)}
                                onDraftChange={(text) => setMnemonicDraft(text)}
                                onCompleted={() => {
                                  // Marca como listo pero NO guarda aún; el guardado ocurrirá al presionar Continuar
                                  setStudyItemCompleted(true)
                                  if (user?.id && playingResourceId) {
                                    saveResourceProgress(user.id, playingResourceId, {
                                      stage: 'study',
                                      studyIndex,
                                      studyItemCompleted: true,
                                    })
                                  }
                                }}
                              />
                              <HStack mt={4} justify="flex-end">
                                <Button colorScheme="blue" isLoading={isSavingMnemonic} onClick={async () => {
                                  // Guardar mnemotecnia al presionar Continuar
                                  if (user?.id && playingResourceId) {
                                    try {
                                      setIsSavingMnemonic(true)
                                      await persistMnemonic(playingResourceId, user.id, (el.content as any), mnemonicAuto, mnemonicDraft)
                                      // Tras guardar, continuar flujo
                                      const next = studyIndex + 1
                                      setStudyItemCompleted(false)
                                      setIsSavingMnemonic(false)
                                      if (next < playingStudyElements.length) {
                                        setStudyIndex(next)
                                        saveResourceProgress(user.id, playingResourceId, {
                                          stage: 'study',
                                          studyIndex: next,
                                          studyItemCompleted: false,
                                        })
                                      } else {
                                        // Después de crear la mnemotecnia, llevar a práctica antes de juegos
                                        setMatchUpStage('mnemonic_practice')
                                        saveResourceProgress(user.id, playingResourceId, { stage: 'mnemonic_practice' })
                                      }
                                    } catch (e) {
                                      setIsSavingMnemonic(false)
                                      // Continuar incluso si falla, pero notificar
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
                                        setMatchUpStage('mnemonic_practice')
                                        if (user?.id && playingResourceId) {
                                          saveResourceProgress(user.id, playingResourceId, { stage: 'mnemonic_practice' })
                                        }
                                      }
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
                      <HStack mt={4} justify="flex-end">
                        <Button colorScheme="blue" onClick={() => {
                          // Ir directamente al siguiente elemento de juego después del quiz
                          setMatchUpStage('lines')
                          if (user?.id && playingResourceId) {
                            console.debug('Progress confirmed: quiz → lines', { resourceId: playingResourceId, quizConfirmed: true })
                            saveResourceProgress(user.id, playingResourceId, { stage: 'lines', quizConfirmed: true })
                          }
                        }} isDisabled={!quizCompleted}>Continuar</Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'mnemonic_practice' && playingStudyElements && playingStudyElements[studyIndex]?.type === 'mnemonic_creator' && (
                    <>
                      <MnemonicPractice
                        key={`mnprac-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        content={(playingStudyElements[studyIndex]?.content as any)}
                        mnemonicText={mnemonicDraft || mnemonicAuto}
                        onComplete={(_results, score) => {
                          // resultados disponibles en 'results' si se requiere mostrar un resumen más adelante
                          setMnemonicPracticeCompleted(true)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'mnemonic_practice', mnemonicPracticeCompleted: true })
                          }
                          toast({ title: 'Práctica de mnemotecnia', description: `Tu puntuación: ${score}/100`, status: 'success', duration: 3000 })
                        }}
                      />
                      <HStack mt={4} justify="flex-end">
                        <Button colorScheme="blue" onClick={() => {
                          // Continuar al siguiente elemento de juego
                          setMatchUpStage(playingQuiz ? 'quiz' : 'lines')
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: playingQuiz ? 'quiz' : 'lines' })
                          }
                        }} isDisabled={!mnemonicPracticeCompleted}>Continuar</Button>
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
                          saveScoresForCurrentResource?.()
                        }}
                      />
                      <HStack mt={4} justify="flex-end">
                        <Button colorScheme="blue" onClick={async () => { 
                          // Guardar puntaje de líneas y mostrar resumen
                          await saveScoresForCurrentResource?.()
                          setMatchUpStage('lines_summary')
                          if (user?.id && playingResourceId) {
                            console.debug('Progress confirmed: lines → lines_summary', { resourceId: playingResourceId, linesConfirmed: true })
                            saveResourceProgress(user.id, playingResourceId, { stage: 'lines_summary' as any, linesConfirmed: true })
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
                      <HStack mt={2} justify="flex-end">
                        {playingGroupSort ? (
                          <Button colorScheme="blue" onClick={() => {
                            setMatchUpStage('group_sort')
                            if (user?.id && playingResourceId) {
                              saveResourceProgress(user.id, playingResourceId, { stage: 'group_sort' })
                            }
                          }}>Continuar</Button>
                        ) : (
                          <Button colorScheme="blue" onClick={async () => {
                            await finalizeSession()
                            setMatchUpStage('debate')
                            if (user?.id && playingResourceId) {
                              saveResourceProgress(user.id, playingResourceId, { stage: 'debate' })
                            }
                          }}>Finalizar</Button>
                        )}
                      </HStack>
                    </VStack>
                  )}
                  {/* Modo imágenes desactivado */}
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
                      <HStack mt={4} justify="flex-end">
                        <Button colorScheme="blue" onClick={async () => {
                          await finalizeSession()
                          setMatchUpStage('group_sort_summary')
                          if (user?.id && playingResourceId) {
                            console.debug('Progress confirmed: group_sort → group_sort_summary', { resourceId: playingResourceId, groupSortConfirmed: true })
                            saveResourceProgress(user.id, playingResourceId, { stage: 'group_sort_summary' as any, groupSortConfirmed: true })
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
                      <HStack mt={2} justify="flex-end">
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
                        onComplete={async (details, omitted) => {
                          setFindMatchResults(details)
                          // Solo mostrar la página de respuestas correctas si se presionó Omitir
                          const nextStage = omitted ? 'find_the_match_summary' : (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : 'summary'))
                          if (!omitted && nextStage === 'summary') {
                            await finalizeSession()
                          }
                          setMatchUpStage(nextStage as any)
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: nextStage as any })
                            if (!omitted && nextStage === 'summary') {
                              setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                            }
                          }
                        }}
                      />
                      {/* No se muestra botón Continuar aquí; se presentará en el resumen de FindTheMatch */}
                    </>
                  )}
                  {matchUpStage === 'find_the_match_summary' && (
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="lg" fontWeight="bold">Respuestas correctas - Cada oveja con su pareja</Text>
                      {findMatchResults.length === 0 ? (
                        <Text fontSize="sm" color="gray.600">No hay resultados para mostrar.</Text>
                      ) : (
                        findMatchResults.map((r, idx) => (
                          <Box key={`ftm-sum-${idx}`} p={3} borderWidth="1px" borderRadius="md" borderColor={'red.300'} bg={'red.50'}>
                            <Text fontSize="sm"><strong>{r.concept}</strong> → {r.expected}</Text>
                          </Box>
                        ))
                      )}
                      <HStack mt={2} justify="space-between">
                        <Button variant="outline" onClick={() => {
                          // Mostrar confirmación de salida (se perderá lo avanzado)
                          onExitOpen()
                        }}>Volver</Button>
                        <Button colorScheme="blue" onClick={async () => {
                          const nextStage = playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : 'summary')
                          // Si vamos a resumen, finalizar sesión para capturar tiempo total
                          if (nextStage === 'summary') {
                            await finalizeSession()
                          }
                          setMatchUpStage(nextStage as any)
                          if (user?.id && playingResourceId) {
                            console.debug('Progress confirmed: find_the_match_summary → ' + nextStage, { resourceId: playingResourceId, findTheMatchConfirmed: true })
                            saveResourceProgress(user.id, playingResourceId, { stage: nextStage as any, findTheMatchConfirmed: true })
                            if (nextStage === 'summary') {
                              setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                            }
                          }
                        }}>Continuar</Button>
                      </HStack>
                    </VStack>
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
                        renderContinueButton={
                          <Button colorScheme="blue" onClick={async () => {
                            await finalizeSession()
                            const nextStage = playingAnagram ? 'anagram' : 'debate'
                            setMatchUpStage(nextStage)
                            if (user?.id && playingResourceId) {
                              console.debug('Progress confirmed: open_box → ' + nextStage, { resourceId: playingResourceId, openBoxConfirmed: true })
                              saveResourceProgress(user.id, playingResourceId, { stage: nextStage as any, openBoxConfirmed: true })
                            }
                          }} isDisabled={!openBoxCompleted}>Continuar</Button>
                        }
                      />
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
                        renderContinueButton={
                          <Button colorScheme="blue" onClick={async () => {
                            await finalizeSession()
                            setMatchUpStage('debate')
                            if (user?.id && playingResourceId) {
                              console.debug('Progress confirmed: anagram → debate', { resourceId: playingResourceId, anagramConfirmed: true })
                              saveResourceProgress(user.id, playingResourceId, { stage: 'debate', anagramConfirmed: true })
                            }
                          }} isDisabled={!anagramCompleted}>Continuar</Button>
                        }
                      />
                    </>
                  )}
                  {matchUpStage === 'debate' && playingDebate && (
                    <>
                      <Debate
                        key={`deb-${currentAttemptId ?? 'noattempt'}-${playingResourceId ?? 'nores'}`}
                        title={playingTitle}
                        content={playingDebate}
                        onComplete={async () => {
                          await finalizeSession()
                          setMatchUpStage('summary')
                          if (user?.id && playingResourceId) {
                            saveResourceProgress(user.id, playingResourceId, { stage: 'summary', debateCompleted: true })
                            setCompletedResourceIds(prev => new Set([...prev, playingResourceId]))
                          }
                        }}
                      />
                      <HStack mt={4} justify="flex-end">
                        <Button variant="outline" onClick={() => setMatchUpStage('summary')}>Saltar</Button>
                      </HStack>
                    </>
                  )}
                  {matchUpStage === 'summary' && (
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="lg" fontWeight="bold">Resumen del recurso</Text>
                      {(() => {
                        const { score, breakdown } = computeWeightedFinalScore()
                        return (
                          <Box p={3} borderWidth="1px" borderRadius="md" bg="blue.50" borderColor="blue.200">
                            <HStack justify="space-between" align="center">
                              <Text fontSize="md" fontWeight="semibold" color="blue.800">Puntuación final</Text>
                              <Text fontSize="xl" fontWeight="bold" color="blue.900">{score.toFixed(2)} / 100</Text>
                            </HStack>
                            {breakdown.length > 0 && (
                              <VStack align="stretch" spacing={1} mt={2}>
                                {breakdown.map((b, idx) => (
                                  <HStack key={`sum-br-${idx}`} justify="space-between">
                                    <Text fontSize="sm" color="gray.800">{b.name}</Text>
                                    <Text fontSize="sm" color="gray.700">{b.contribution.toFixed(2)} / {(b.weight).toFixed(2)} pts</Text>
                                  </HStack>
                                ))}
                              </VStack>
                            )}
                          </Box>
                        )
                      })()}
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
                      {/* Resultados de imágenes desactivados */}
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
                          setLinesResults([]); 
                          setActiveSection('recursos')
                          try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {}
                        }}>Salir</Button>
                        <Button variant="outline" isLoading={startingNewAttempt} onClick={async () => {
                          // Reiniciar completamente desde cero forzando nueva sesión y nuevo intento
                          const res = resources.find(r => r.id === playingResourceId)
                          if (res) {
                            await handlePlayResource(res, { forceNewSession: true })
                          }
                        }}>Reintentar</Button>
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

      {/* Confirmación de salida del recurso (descartar solo elemento actual) */}
      <AlertDialog isOpen={isExitOpen} leastDestructiveRef={exitCancelRef} onClose={onExitClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>¿Salir del recurso?</AlertDialogHeader>
            <AlertDialogBody>
              Estás a punto de salir. Solo se descartará el progreso del elemento actual; el avance general del recurso se conservará. ¿Deseas continuar?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={exitCancelRef as any} onClick={onExitClose} variant="ghost">Cancelar</Button>
              <Button colorScheme="red" onClick={async () => {
                try {
                  // Finalizar sesión actual (sin ir a resumen)
                  if (currentSessionId) {
                    const { endResourceSession, addAccumulatedSeconds } = await import('../services/resourceSessions')
                    if (sessionStartMs != null && !isPaused) {
                      const additionalSeconds = Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000))
                      await addAccumulatedSeconds(currentSessionId, additionalSeconds)
                    }
                    await endResourceSession(currentSessionId)
                    setCurrentSessionId(null)
                    setSessionStartMs(null)
                    setElapsedSeconds(0)
                  }
                  // Guardar puntajes parciales antes de limpiar estados locales para que la tarjeta se actualice sin recargar
                  try {
                    await saveScoresForCurrentResource()
                  } catch (e) {
                    console.warn('No se pudieron guardar puntajes parciales al salir:', e)
                  }
                  // Descartar SOLO el avance del elemento actual (mantener progreso global del recurso)
                  if (user?.id && playingResourceId) {
                    try {
                      const prog = getResourceProgress(user.id, playingResourceId)
                      // Si estaba en estudio, asegurarse de marcar el elemento actual como no completado
                      if (prog?.stage === 'study') {
                        saveResourceProgress(user.id, playingResourceId, { stage: 'study', studyIndex: prog.studyIndex, studyItemCompleted: false })
                      }
                      // Para otros elementos (quiz, líneas, group sort, etc.), no hay estado de respuesta persistido que limpiar,
                      // y mantener el stage actual permitirá reanudar desde el inicio del elemento.
                      // Recalcular y reflejar inmediatamente el progreso y la puntuación en la tarjeta del recurso
                      const resObj = resources.find(r => r.id === playingResourceId)
                      if (resObj) {
                        const latestProg = getResourceProgress(user.id, playingResourceId)
                        const pct = computeCardProgress(resObj, latestProg)
                        setResourceProgressMap(prev => ({ ...prev, [playingResourceId!]: pct }))
                        // Usar la calificación dinámica basada en el avance confirmado (sin esperar a resumen)
                        const { score } = computeWeightedFinalScore()
                        const rounded = Math.round(score)
                        setResourceScoreMap(prev => ({ ...prev, [playingResourceId!]: rounded }))
                        try {
                          if (user?.id) {
                            localStorage.setItem(`partial_score_${user.id}_${playingResourceId}`, String(rounded))
                          }
                        } catch {}
                      }
                    } catch (e) {
                      console.warn('No se pudo ajustar progreso del elemento actual al salir:', e)
                    }
                  }
                  // Limpiar estados locales
                  setPlayingMatchUp(null)
                  setPlayingStudyElements(null)
                  setMatchUpStage(null)
                  setLinesCompleted(false)
                  setLinesResults([])
                  setActiveSection('recursos')
                  try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {}
                } finally {
                  onExitClose()
                }
              }} ml={3}>Salir y descartar este elemento</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}