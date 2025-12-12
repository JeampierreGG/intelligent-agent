import { useEffect, useState, useCallback } from 'react'
import { Box, Flex, VStack, HStack, Text, Button, Card, CardBody, Icon, SimpleGrid, useColorModeValue, Spinner, useDisclosure } from '@chakra-ui/react'
import AppHeader from '../components/layout/AppHeader'
import AppSidebar from '../components/layout/AppSidebar'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { FiBookOpen, FiClock, FiPlus } from 'react-icons/fi'
import { useAuth } from '../contexts/useAuth'
import { useNavigate } from 'react-router-dom'
import { getUserResourcesPaginated, type EducationalResource } from '../services/resources'
import { getResourceProgress } from '../services/resourceProgress'
import { computeResourceProgressPct } from '../utils/progress'
import type { ResourceProgressData } from '../services/resourceProgress'
import { supabase } from '../services/supabase'
import NewResourceModal from '../components/modals/NewResourceModal'
import ResourceCard from '../components/resources/ResourceCard'

export default function Resources() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { isOpen, onOpen, onClose } = useDisclosure()
  

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
        const scoreMap: Record<string, number> = {}
        for (const r of data || []) {
          const prog = getResourceProgress(user.id, r.id)
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
        setResourceScoreMap(scoreMap)
      } catch (e) {
    
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user?.id, currentPage, pageSize, computeCardProgress])

  useEffect(() => {
    if (!user?.id) return
    let cleaning = false

    const reloadResources = async () => {
      if (!user?.id) return
      try {
        const { data, count, error } = await getUserResourcesPaginated(user.id, currentPage, pageSize)
        if (error) throw error
        if (!cleaning) {
          setResources(data || [])
          setTotalResourcesCount(count || 0)
          const progressMap: Record<string, number> = {}
          const scoreMap: Record<string, number> = {}
          for (const r of data || []) {
            const prog = getResourceProgress(user.id, r.id)
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
              console.warn('user_scores reload error:', err)
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
          setResourceScoreMap(scoreMap)
        }
      } catch (err) {
        console.warn('reloadResources (realtime) error:', err)
      }
    }

    const channel = supabase
      .channel(`resources-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'educational_resources', filter: `user_id=eq.${user.id}` },
        () => { void reloadResources() }
      )
      .subscribe()

    return () => {
      cleaning = true
      try { supabase.removeChannel(channel) } catch (err) { console.warn('removeChannel error:', err) }
    }
  }, [user?.id, currentPage, pageSize, computeCardProgress])

  const handleModalClose = () => {
    onClose()
    if (!user?.id) return
    const reload = async () => {
      setLoading(true)
      try {
        const { data, count, error } = await getUserResourcesPaginated(user.id, currentPage, pageSize)
        if (error) throw error
        setResources(data || [])
        setTotalResourcesCount(count || 0)
        const progressMap: Record<string, number> = {}
        const scoreMap: Record<string, number> = {}
        for (const r of data || []) {
          const prog = getResourceProgress(user.id, r.id)
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
            console.warn('user_scores reload (modal close) error:', err)
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
        setResourceScoreMap(scoreMap)
      } catch (err) {
        console.warn('reload after modal close error:', err)
      } finally {
        setLoading(false)
      }
    }
    void reload()
  }

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
<Button
  leftIcon={<Icon as={FiPlus} color="white" />}
  bg="#000000"
  color="white"
  _hover={{ bg: "#000000" }}   // para que no cambie de color al pasar el mouse
  onClick={onOpen}
>
  Nuevo Recurso
</Button>

              <HStack spacing={3} align="center">
                <HStack color="gray.600" spacing={2}>
                  <Icon as={FiClock} />
                  <Text fontSize="sm">Actualizado</Text>
                </HStack>
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
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      progress={resourceProgressMap[resource.id] ?? 0}
                      score={resourceScoreMap[resource.id] ?? 0}
                      disableStart={(resourceProgressMap[resource.id] ?? 0) > 0}
                        disableRetake={(resourceProgressMap[resource.id] ?? 0) === 0}
                    />
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
      <NewResourceModal isOpen={isOpen} onClose={handleModalClose} />
    </Box>
  )
}
