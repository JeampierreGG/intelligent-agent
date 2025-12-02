import { useEffect, useState, useCallback } from 'react'
import { Box, Flex, VStack, HStack, Text, Button, Card, CardBody, Icon, SimpleGrid, useColorModeValue, Badge, Spinner } from '@chakra-ui/react'
import AppHeader from '../components/layout/AppHeader'
import AppSidebar from '../components/layout/AppSidebar'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { FiBookOpen, FiClock } from 'react-icons/fi'
import { useAuth } from '../contexts/useAuth'
import { useNavigate } from 'react-router-dom'
import { getUserResourcesPaginated, type EducationalResource } from '../services/resources'
import { getResourceProgress } from '../services/resourceProgress'
import { computeResourceProgressPct } from '../utils/progress'
import type { ResourceProgressData } from '../services/resourceProgress'
import { supabase } from '../services/supabase'

export default function Resources() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  

  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')

  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, to: '/dashboard' },
    { id: 'recursos', label: 'Recursos', icon: MdLibraryBooks, to: '/recursos' },
    { id: 'ranking', label: 'Ranking', icon: MdLeaderboard, to: '/ranking' },
  ]

  // State for list
  const [resources, setResources] = useState<EducationalResource[]>([])
  const [resourceProgressMap, setResourceProgressMap] = useState<Record<string, number>>({})
  const [resourceScoreMap, setResourceScoreMap] = useState<Record<string, number>>({})
  const [totalResourcesCount, setTotalResourcesCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize] = useState<number>(9)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [startedMap, setStartedMap] = useState<Record<string, boolean>>({})

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Básico': return 'green'
      case 'Intermedio': return 'yellow'
      case 'Avanzado': return 'red'
      default: return 'gray'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const computeCardProgress = useCallback((resource: EducationalResource, prog: ResourceProgressData | null) => {
    return computeResourceProgressPct(resource, prog)
  }, [])


  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      setError(null)
      try {
        const { data, count, error } = await getUserResourcesPaginated(user.id, currentPage, pageSize)
        if (error) throw error
        setResources(data || [])
        setTotalResourcesCount(count || 0)
        // progress and scores
        const progressMap: Record<string, number> = {}
        const started: Record<string, boolean> = {}
        const scoreMap: Record<string, number> = {}
        for (const r of data || []) {
          const prog = getResourceProgress(user.id, r.id)
          started[r.id] = !!(prog && prog.stage)
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
              const localPartial = localStorage.getItem(`partial_score_${user.id}_${r.id}`)
              if (localPartial != null) {
                const parsed = Math.round(parseFloat(localPartial))
                scoreMap[r.id] = isNaN(parsed) ? 0 : parsed
              } else {
                const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
              }
            }
          } catch (err) {
            console.warn('user_scores read error:', err)
            progressMap[r.id] = computeCardProgress(r, prog)
            const localPartial = localStorage.getItem(`partial_score_${user.id}_${r.id}`)
            if (localPartial != null) {
              const parsed = Math.round(parseFloat(localPartial))
              scoreMap[r.id] = isNaN(parsed) ? 0 : parsed
            } else {
              const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
              scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
            }
          }
        }
        setResourceProgressMap(progressMap)
        setStartedMap(started)
        setResourceScoreMap(scoreMap)
      } catch (e) {
        console.error('Error cargando recursos:', e)
        setError('Error al cargar los recursos')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user?.id, currentPage, pageSize, computeCardProgress])

  const handleSignOut = async () => {
    try { await signOut(); navigate('/login') } catch (err) { console.warn('signOut error:', err) }
  }

  return (
    <Box minH="100vh" bg={bgColor} w="100%" maxW="100vw">
      <AppHeader user={user} onSignOut={handleSignOut} />

      <Flex>
        <AppSidebar items={sidebarItems} />

        {/* Main content */}
        <Box flex={1} p={6} w="100%">
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between">
              <VStack spacing={0} align="start">
                <Text fontSize="2xl" fontWeight="bold">Recursos</Text>
                <Text color="gray.600">Todos tus recursos, con progreso y puntaje</Text>
              </VStack>
              <HStack color="gray.600" spacing={2}>
                <Icon as={FiClock} />
                <Text fontSize="sm">Actualizado</Text>
              </HStack>
            </HStack>

            {loading ? (
              <HStack justify="center" py={8}><Spinner /></HStack>
            ) : error ? (
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}><CardBody><Text color="red.600">{error}</Text></CardBody></Card>
            ) : totalResourcesCount === 0 ? (
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={4} py={4}>
                    <Icon as={FiBookOpen} boxSize={12} color="gray.400" />
                    <Text color="gray.600">Aún no tienes recursos. Crea tu primer recurso con el ícono "Nuevo Recurso" del Dashboard.</Text>
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
                            <Badge colorScheme={getDifficultyColor(resource.difficulty)}>{resource.difficulty}</Badge>
                            <Text fontSize="sm" color="gray.500">{formatDate(resource.created_at)}</Text>
                          </HStack>
                          <VStack align="start" spacing={2} w="100%">
                            <Text fontWeight="bold" fontSize="lg" noOfLines={2} minH="48px">{resource.title}</Text>
                            <HStack justify="space-between" w="100%">
                              <Text fontSize="sm" color="gray.700">Progreso: {resourceProgressMap[resource.id] ?? 0}%</Text>
                              <Text fontSize="sm" color="gray.700">Puntuación: {(resourceScoreMap[resource.id] ?? 0)}/200</Text>
                            </HStack>
                            
                          </VStack>
                          <VStack spacing={2} w="100%">
                            <HStack spacing={2} w="100%">
                              <Button size="sm" colorScheme="blue" flex={1} onClick={() => navigate(`/play/${resource.id}`)} isDisabled={!!startedMap[resource.id]}>Comenzar</Button>
                              <Button size="sm" variant="outline" leftIcon={<Icon as={FiBookOpen} />} flex={1} onClick={() => navigate(`/review/${resource.id}`)}>Revisar</Button>
                            </HStack>
                            <HStack spacing={2} w="100%">
                              <Button size="sm" variant="outline" flex={1} onClick={() => navigate(`/play/${resource.id}?new=1`)}>Reintentar</Button>
                            </HStack>
                          </VStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
                <HStack justify="space-between" align="center" mt={4}>
                  <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} isDisabled={currentPage <= 1}>Anterior</Button>
                  <Text color="gray.600">Página {currentPage} de {Math.max(1, Math.ceil(totalResourcesCount / pageSize))}</Text>
                  <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalResourcesCount / pageSize)), p + 1))} isDisabled={currentPage >= Math.max(1, Math.ceil(totalResourcesCount / pageSize))}>Siguiente</Button>
                </HStack>
              </>
            )}
          </VStack>
        </Box>
      </Flex>
    </Box>
  )
}
