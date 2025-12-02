import { Box, Flex, VStack, useColorModeValue, useDisclosure, useToast } from '@chakra-ui/react'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
 
import AppHeader from '../components/layout/AppHeader'
import AppSidebar from '../components/layout/AppSidebar'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import NewResourceModal from '../components/modals/NewResourceModal'

import { getUserResourcesPaginated, type EducationalResource } from '../services/resources'
import { supabase } from '../services/supabase'
import { getResourceProgress } from '../services/resourceProgress'
import { computeResourceProgressPct } from '../utils/progress'
 
import StatsWidgets from '../components/dashboard/StatsWidgets'
import RecentResources from '../components/dashboard/RecentResources'
 
import WelcomeHero from '../components/dashboard/WelcomeHero'
 
 
import { getUserTotalPoints } from '../services/attempts'
// import { getUserTotalStudySeconds } from '../services/resourceSessions' // Reemplazado por cálculo basado en intentos completados
// Ranking se maneja en su propia página: no se usa en Dashboard
// Eliminado soporte H5P

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { playResourceId?: string; forceNew?: boolean } }
const toast = useToast()
  // Dashboard solo muestra overview. Se eliminaron estados de secciones y ranking.
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [resources, setResources] = useState<EducationalResource[]>([])
  // Paginación de recursos
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 12
  const [totalResourcesCount, setTotalResourcesCount] = useState<number>(0)
const [loadingResources, setLoadingResources] = useState(false)
  const [, setResourcesError] = useState<string | null>(null)
  
  // Temporizador eliminado
  const [, setActiveResourceIds] = useState<Set<string>>(new Set())
  const [, setCompletedResourceIds] = useState<Set<string>>(new Set())
  const [startedResourceIds, setStartedResourceIds] = useState<Set<string>>(new Set())
  // Mapas para progreso (%) y puntaje (0-100) por recurso
  const [resourceProgressMap, setResourceProgressMap] = useState<Record<string, number>>({})
  const [resourceScoreMap, setResourceScoreMap] = useState<Record<string, number>>({})
  const [resourceElementScoresMap, setResourceElementScoresMap] = useState<Record<string, Array<{ element_type: string; element_name: string; points_scored: number }>>>({})
  // Carga específica para tarjetas de "Recursos recientes" hasta que se calcule progreso y puntaje
const [, setLoadingRecentCards] = useState<boolean>(false)
  const [totalBestPoints, setTotalBestPoints] = useState<number>(0)
  
  
  // Bloqueo posterior a "Aumentar dificultad" hasta que el usuario inicie el primer intento con la nueva dificultad
  // ID de MatchUp Images desactivado
  // Estado para revisión por intentos (panel de revisión inline eliminado)
  // Eliminado: reviewResourceId, reviewAttempts, selectedReviewAttempt
  
  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  // Confirmación de salida del recurso
  
  
  // Eliminada sincronización de secciones: cada vista tiene su propia ruta top-level


  // Eliminado: computeWeightedFinalScore y saveStage (orquestación del juego vive en PlayResource)

  const computeCardProgress = useCallback((resource: EducationalResource, prog: ReturnType<typeof getResourceProgress> | null): number => {
    return computeResourceProgressPct(resource, prog)
  }, [])

  // Cargar recursos del usuario
  useEffect(() => {
    const loadUserResources = async () => {
      if (user?.id) {
        setLoadingResources(true)
        setLoadingRecentCards(true)
        setResourcesError(null)
        try {
          const { data, count, error } = await getUserResourcesPaginated(user.id, currentPage, pageSize)
          if (error) {
            throw error
          }
          setResources(data || [])
          setTotalResourcesCount(count || 0)
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
            const started = new Set<string>()
            const progressMap: Record<string, number> = {}
            const scoreMap: Record<string, number> = {}
            for (const r of (data || [])) {
              const prog = getResourceProgress(user.id, r.id)
              if (prog && prog.stage) {
                started.add(r.id)
              }
              if (prog?.stage === 'summary') {
                completed.add(r.id)
              }
              // Progreso y puntaje desde el intento con mayor progreso
              try {
                const { data: rows } = await supabase
                  .from('user_scores')
                  .select('score, progress_pct')
                  .eq('user_id', user.id)
                  .eq('resource_id', r.id)
                  .order('progress_pct', { ascending: false })
                  .limit(1)
                const bestRow = rows?.[0] as { score?: number | null; progress_pct?: number | null } | undefined
                const bestProgress = (bestRow?.progress_pct ?? null)
                const bestScore = (bestRow?.score ?? null)
                if (bestProgress != null && !isNaN(bestProgress)) {
                  progressMap[r.id] = Math.round(bestProgress)
                } else {
                  progressMap[r.id] = computeCardProgress(r, prog)
                }
                if (bestScore != null && !isNaN(bestScore)) {
                  scoreMap[r.id] = Math.round(bestScore)
                } else {
                  const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                  scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
                }
              } catch (err) {
                console.warn('No se pudo cargar progreso/puntaje desde user_scores:', err)
                progressMap[r.id] = computeCardProgress(r, prog)
                const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
              }

              // Desglose por elemento del último intento
              try {
                const { data: att } = await supabase
                  .from('educational_resource_attempts')
                  .select('id, attempt_number')
                  .eq('user_id', user.id)
                  .eq('resource_id', r.id)
                  .order('attempt_number', { ascending: false })
                  .limit(1)
                const attemptId = (att?.[0]?.id as string | undefined) || undefined
                if (attemptId) {
                  const { data: rows } = await supabase
                    .from('educational_attempt_element_scores')
                    .select('element_type, element_name, points_scored')
                    .eq('attempt_id', attemptId)
                  resourceElementScoresMap[r.id] = (rows || []) as Array<{ element_type: string; element_name: string; points_scored: number }>
                } else {
                  resourceElementScoresMap[r.id] = []
                }
              } catch (err) {
                console.warn('No se pudo cargar desglose por elemento:', err)
                resourceElementScoresMap[r.id] = []
              }
            }
            setCompletedResourceIds(completed)
            setStartedResourceIds(started)
            setResourceProgressMap(progressMap)
            // Marcar si existe al menos un intento para cada recurso (para alternar botones)
            try {
              const attemptPresence: Record<string, boolean> = {}
              for (const r of data || []) {
                try {
                  const { data: att } = await supabase
                    .from('educational_resource_attempts')
                    .select('attempt_number')
                    .eq('user_id', user.id)
                    .eq('resource_id', r.id)
                    .order('attempt_number', { ascending: false })
                    .limit(1)
                  attemptPresence[r.id] = Array.isArray(att) && att.length > 0
                } catch {
                  attemptPresence[r.id] = false
                }
              }
              setHasAttemptMap(attemptPresence)
            } catch (err) {
              console.warn('attempt presence compute error:', err)
            }
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
            } catch (err) {
              console.warn('score local fallback error:', err)
            }
            setResourceScoreMap(scoreMap)
            setResourceElementScoresMap(resourceElementScoresMap)
          } catch (e) {
            console.warn('No se pudo leer progreso para estado de completado:', e)
          }
        } catch (error) {
          console.error('❌ Error cargando recursos del usuario:', error)
          setResourcesError('Error al cargar los recursos')
        } finally {
          setLoadingResources(false)
          setLoadingRecentCards(false)
        }
      }
    }

    loadUserResources()
  }, [user?.id, currentPage, computeCardProgress])

  // Arrancar reproducción si venimos desde /recursos con un playResourceId en el state
  useEffect(() => {
    try {
      const playResourceId: string | undefined = location?.state?.playResourceId
      const forceNew: boolean | undefined = location?.state?.forceNew
      if (playResourceId) {
        navigate(`/play/${playResourceId}${forceNew ? '?new=1' : ''}`)
      }
    } catch (err) {
      console.warn('navigate from state error:', err)
    }
  }, [location?.state, navigate])

  // Cargar widgets: puntos totales (suma de todos los intentos)
  useEffect(() => {
    const loadWidgets = async () => {
      if (!user?.id) return
      try {
        const total = await getUserTotalPoints(user.id)
        setTotalBestPoints(total)
      } catch (e) {
        console.warn('No se pudo calcular Puntos Totales:', e)
        setTotalBestPoints(0)
      }

      // Temporizador eliminado
    }
    void loadWidgets()
  }, [user?.id])

  // Eliminado: efecto dependiente de finalScoreSaved (se recalcula por suscripción en tiempo real)

  // Suscripción en tiempo real para actualizar widgets y conteo de recursos sin recargar
  useEffect(() => {
    if (!user?.id) return
    let isCleaning = false

    const recomputeTotals = async () => {
      if (!user?.id) return
      try {
        const total = await getUserTotalPoints(user.id)
        if (!isCleaning) setTotalBestPoints(total)
      } catch (err) {
        console.warn('recomputeTotals error:', err)
      }
      // Temporizador eliminado
    }

    const reloadResources = async () => {
      try {
        const { data, count, error } = await getUserResourcesPaginated(user.id, currentPage, pageSize)
        if (error) throw error
        if (!isCleaning) {
          setResources(data || [])
          setTotalResourcesCount(count || 0)
        }
      } catch (err) {
        console.warn('reloadResources error:', err)
      }
    }

    const channel = supabase
      .channel(`dashboard-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_scores', filter: `user_id=eq.${user.id}` },
        () => { void recomputeTotals() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'educational_resources', filter: `user_id=eq.${user.id}` },
        () => { void reloadResources() }
      )
      .subscribe()

    return () => {
      isCleaning = true
      try { supabase.removeChannel(channel) } catch (err) { console.warn('removeChannel error:', err) }
    }
  }, [user?.id, currentPage, pageSize])

  // Eliminada carga de ranking: el ranking vive en /ranking

  

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Temporizador eliminado: no se acumula tiempo ni se muestra
  // Mapa para saber si un recurso ya tiene al menos un intento (para alternar Comenzar/Reintentar)
  const [hasAttemptMap, setHasAttemptMap] = useState<Record<string, boolean>>({})

  // Temporizador eliminado

  

  // Prefetch de imágenes desactivado

  

  const handleResourceModalClose = () => {
    onClose()
    // Temporizador eliminado
    // Recargar recursos después de crear uno nuevo
    if (user?.id) {
      const loadUserResources = async () => {
        setLoadingResources(true)
        setLoadingRecentCards(true)
        try {
          const { data, count, error } = await getUserResourcesPaginated(user.id, currentPage, pageSize)
          if (error) throw error
          const list = data || []
          setResources(list)
          setTotalResourcesCount(count || 0)
          // Recalcular progreso y puntaje como en la carga principal
          try {
            const completed = new Set<string>()
            const progressMap: Record<string, number> = {}
            const scoreMap: Record<string, number> = {}
            for (const r of list) {
              const prog = getResourceProgress(user.id, r.id)
              if (prog?.stage === 'summary') {
                completed.add(r.id)
              }
              progressMap[r.id] = computeCardProgress(r, prog)
              try {
                const { data: rows } = await supabase
                  .from('user_scores')
                  .select('score, progress_pct')
                  .eq('user_id', user.id)
                  .eq('resource_id', r.id)
                  .order('progress_pct', { ascending: false })
                  .limit(1)
                const bestRow = rows?.[0] as { score?: number | null; progress_pct?: number | null } | undefined
                const bestProgress = (bestRow?.progress_pct ?? null)
                const bestScore = (bestRow?.score ?? null)
                if (bestProgress != null && !isNaN(bestProgress)) {
                  progressMap[r.id] = Math.round(bestProgress)
                } else {
                  progressMap[r.id] = computeCardProgress(r, prog)
                }
                if (bestScore != null && !isNaN(bestScore)) {
                  scoreMap[r.id] = Math.round(bestScore)
                } else {
                  const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                  scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
                }
              } catch {
                const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
              }
            }
            setCompletedResourceIds(completed)
            setResourceProgressMap(progressMap)
            // Fallback local para puntajes faltantes
            try {
              for (const r of list) {
                if (scoreMap[r.id] == null || isNaN(scoreMap[r.id])) {
                  const ps = localStorage.getItem(`partial_score_${user.id}_${r.id}`)
                  if (ps != null) {
                    const parsed = Math.round(parseFloat(ps))
                    if (!isNaN(parsed)) scoreMap[r.id] = parsed
                  } else {
                    const fs = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                    const parsed = fs ? Math.round(parseFloat(fs)) : 0
                    scoreMap[r.id] = isNaN(parsed) ? 0 : parsed
                  }
                }
              }
            } catch (err) {
              console.warn('score local recompute error:', err)
            }
            setResourceScoreMap(scoreMap)
          } catch (e) {
            console.warn('No se pudo recomputar progreso tras cerrar modal:', e)
          }
        } catch (error) {
          console.error('❌ Error recargando recursos:', error)
        } finally {
          setLoadingResources(false)
          setLoadingRecentCards(false)
        }
      }
      loadUserResources()
    }
  }

  const handlePlayResource = async (resource: EducationalResource, options?: { forceNewSession?: boolean }) => {
    try {
      setStartedResourceIds(prev => new Set([...prev, resource.id]))
      const query = options?.forceNewSession ? '?new=1' : ''
      navigate(`/play/${resource.id}${query}`)
    } catch (err) {
      console.warn('start resource error:', err)
      toast({ title: 'No se pudo iniciar el recurso', status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handleReviewResource = (resource: EducationalResource) => {
    try {
      navigate(`/review/${resource.id}`)
    } catch (err) {
      console.error('Error al abrir revisión de intentos:', err)
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

  // Sidebar items moved to AppSidebar component

  const renderContent = () => {
    // El Dashboard solo muestra su vista principal. "Recursos" y "Ranking" viven en /recursos y /ranking.
    return (
          <VStack spacing={6} align="stretch">
            <WelcomeHero user={user} onNewResource={onOpen} onViewAll={() => navigate('/recursos')} onViewProgress={() => navigate('/progreso')} />

            <StatsWidgets totalResourcesCount={totalResourcesCount} totalBestPoints={totalBestPoints} />

            <RecentResources
              resources={resources}
              loadingResources={loadingResources}
              resourceProgressMap={resourceProgressMap}
              resourceScoreMap={resourceScoreMap}
              startedResourceIds={startedResourceIds}
              hasAttemptMap={hasAttemptMap}
              onStart={(r, opts) => handlePlayResource(r, opts)}
              onReview={(r) => handleReviewResource(r)}
              onRetake={(r) => handlePlayResource(r, { forceNewSession: true })}
              onViewAll={() => navigate('/recursos')}
              getDifficultyColor={getDifficultyColor}
              formatDate={formatDate}
            />
          </VStack>
        )
  }

  // Vista H5P eliminada

  return (
    <Box minH="100vh" bg={bgColor} w="100%" maxW="100vw">
      <AppHeader user={user} onSignOut={handleSignOut} />

      <Flex>
        <AppSidebar items={[
          { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, to: '/dashboard' },
          { id: 'recursos', label: 'Recursos', icon: MdLibraryBooks, to: '/recursos' },
          { id: 'ranking', label: 'Ranking', icon: MdLeaderboard, to: '/ranking' },
        ]} />

        {/* Main Content */}
        <Box flex={1} p={6} w="100%">
          {renderContent()}
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
