import { useEffect, useState, useCallback } from 'react'
import { Box, Flex, VStack, HStack, Text, Button, Card, CardBody, Icon, SimpleGrid, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorModeValue, Image, Badge, Spinner, Progress, useToast } from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { FiBookOpen, FiClock } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import logoImage from '../assets/Logo-IA.png'
import { getUserResourcesPaginated, type EducationalResource, updateResource, appendGameElementsToResource, detectSelectedGameKeys } from '../services/resources'
import { generateGameElementsOnly } from '../services/openrouter'
import { getResourceProgress } from '../services/resourceProgress'
import { supabase } from '../services/supabase'

export default function Resources() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const headerBg = useColorModeValue('white', 'gray.800')
  const sidebarBg = useColorModeValue('white', 'gray.900')
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
  const [incLoadingMap, setIncLoadingMap] = useState<Record<string, boolean>>({})
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

  const computeCardProgress = useCallback((resource: EducationalResource, prog: any | null) => {
    try {
      const studyCount = (resource.content?.studyElements || []).length
      const quizPresent = !!(resource.content as any)?.gameElements?.quiz || !!(resource.content?.gameelement?.quiz)
      const linesPresent = !!(resource.content as any)?.gameElements?.matchUp || !!(resource.content?.gameelement?.matchUp)
      const groupSortPresent = !!(resource.content as any)?.gameElements?.groupSort || !!(resource.content?.gameelement?.groupSort)
      const openBoxPresent = !!(resource.content as any)?.gameElements?.openTheBox || !!(resource.content?.gameelement?.openTheBox)
      const anagramPresent = !!(resource.content as any)?.gameElements?.anagram || !!(resource.content?.gameelement?.anagram)
      const findPresent = !!(resource.content as any)?.gameElements?.findTheMatch || !!(resource.content?.gameelement?.findTheMatch)
      const order: Array<'study'|'quiz'|'match_up'|'group_sort'|'open_the_box'|'anagram'|'find_the_match'|'summary'> = ['study','quiz','match_up','group_sort','open_the_box','anagram','find_the_match','summary']
      const presentMap = {
        study: studyCount > 0,
        quiz: quizPresent,
        match_up: linesPresent,
        group_sort: groupSortPresent,
        open_the_box: openBoxPresent,
        anagram: anagramPresent,
        find_the_match: findPresent,
        summary: true
      }
      const totalSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0) + (openBoxPresent ? 1 : 0) + (anagramPresent ? 1 : 0) + (findPresent ? 1 : 0)
      if (!prog) return totalSegments > 0 ? Math.round((studyCount / totalSegments) * 100) : 0
      let completedSegments = 0
      switch (prog.stage) {
        case 'study': completedSegments = 0; break
        case 'quiz': completedSegments = studyCount; break
        case 'match_up': completedSegments = studyCount + (quizPresent ? 1 : 0); break
        case 'group_sort': completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0); break
        case 'open_the_box': completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0); break
        case 'anagram': completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0) + (openBoxPresent ? 1 : 0); break
        case 'find_the_match': completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0) + (openBoxPresent ? 1 : 0) + (anagramPresent ? 1 : 0); break
        case 'summary': completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0) + (openBoxPresent ? 1 : 0) + (anagramPresent ? 1 : 0) + (findPresent ? 1 : 0); break
        case 'match_up_lines_summary': {
          completedSegments = studyCount + (quizPresent ? 1 : 0)
          for (const st of order) { if (st === prog.stage) break; if (presentMap[st as keyof typeof presentMap]) completedSegments += 1 }
          break
        }
        case 'group_sort_summary': completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0); break
        case 'find_the_match_summary': completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0); break
        default: completedSegments = 0
      }
      const pct = totalSegments > 0 ? Math.round((completedSegments / totalSegments) * 100) : 0
      return Math.max(0, Math.min(100, pct))
    } catch {
      return 0
    }
  }, [])

  const getNextDifficulty = (current: string): 'Básico' | 'Intermedio' | 'Avanzado' | null => {
    if (current === 'Básico') return 'Intermedio'
    if (current === 'Intermedio') return 'Avanzado'
    return null
  }

  // detectSelectedGameKeys importado desde services/resources para evitar duplicación

  const handleIncreaseDifficulty = async (resource: EducationalResource) => {
    if (!user?.id) return
    const next = getNextDifficulty(resource.difficulty)
    if (!next) {
      toast({ title: 'Dificultad máxima', description: 'Este recurso ya está en Avanzado.', status: 'info', duration: 3000, isClosable: true })
      return
    }
    setIncLoadingMap(prev => ({ ...prev, [resource.id]: true }))
    try {
      // 1) Actualizar dificultad del recurso
      await updateResource(resource.id, user.id, { difficulty: next } as any)
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, difficulty: next } : r))

      // 2) Regenerar elementos de juego existentes con la nueva dificultad
      const selectedGameKeys = detectSelectedGameKeys(resource)
      if (selectedGameKeys.length > 0) {
        const formData = {
          subject: resource.subject,
          topic: resource.topic,
          userBirthData: {
            birth_day: user.user_metadata?.birth_day,
            birth_month: user.user_metadata?.birth_month,
            birth_year: user.user_metadata?.birth_year,
          },
          learningGoal: user.user_metadata?.learning_goal,
        }
        try {
          const gameBundle = await generateGameElementsOnly(formData as any, selectedGameKeys)
          await appendGameElementsToResource(resource.id, gameBundle, user.id)
        } catch (e) {
          console.warn('No se pudieron regenerar elementos de juego:', e)
        }
      }
      toast({ title: 'Dificultad aumentada', description: `Nueva dificultad: ${next}`, status: 'success', duration: 3000, isClosable: true })
    } catch (e) {
      console.error('Error al aumentar dificultad:', e)
      toast({ title: 'Error', description: 'No se pudo aumentar la dificultad.', status: 'error', duration: 4000, isClosable: true })
    } finally {
      setIncLoadingMap(prev => ({ ...prev, [resource.id]: false }))
    }
  }

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
          started[r.id] = !!(prog && (prog as any).stage)
          progressMap[r.id] = computeCardProgress(r, prog)
          try {
            const { data: att } = await supabase
              .from('educational_resource_attempts')
              .select('final_score, attempt_number')
              .eq('user_id', user.id)
              .eq('resource_id', r.id)
              .not('final_score', 'is', null)
              // Mostrar el mejor puntaje final entre todos los intentos
              .order('final_score', { ascending: false })
              .limit(1)
            const finalScore = (att?.[0]?.final_score as number | null) ?? null
            if (finalScore != null) {
              scoreMap[r.id] = Math.round(finalScore)
            } else {
              // Intentar puntaje parcial desde user_scores
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
                  const localPartial = localStorage.getItem(`partial_score_${user.id}_${r.id}`)
                  if (localPartial != null) {
                    const parsed = Math.round(parseFloat(localPartial))
                    scoreMap[r.id] = isNaN(parsed) ? 0 : parsed
                  } else {
                    const ls = localStorage.getItem(`final_score_${user.id}_${r.id}`)
                    scoreMap[r.id] = ls ? Math.round(parseFloat(ls)) : 0
                  }
                }
              } catch {
                // Fallback local
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
          } catch {
            // Fallback local si falla leer attempt
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load()
  }, [user?.id, currentPage, pageSize, computeCardProgress])

  const handleSignOut = async () => {
    try { await signOut(); navigate('/login') } catch {}
  }

  return (
    <Box minH="100vh" bg={bgColor} w="100%" maxW="100vw">
      {/* Header */}
      <Box bg={headerBg} borderBottom="1px" borderColor={borderColor} px={6} h="60px" position="sticky" top={0} zIndex={1000} w="100%">
        <Flex justify="space-between" align="center" h="100%">
          <Flex align="center" gap={3}>
            <Image src={logoImage} alt="Learn Playing" height="32px" width="auto" />
            <Text fontSize="xl" fontWeight="bold" color="gray.800">Learn Playing</Text>
          </Flex>
          <Menu>
            <MenuButton as={Box} cursor="pointer" _hover={{ bg: 'gray.50' }} px={3} py={2} borderRadius="md" transition="all 0.2s" minW="fit-content" w="auto" height="40px">
              <Flex direction="row" align="center" gap={2} height="100%">
                <Avatar size="sm" name={`${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || user?.email} bg="blue.500" flexShrink={0} />
                <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap" flexShrink={0}>
                  {(() => {
                    const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || ''
                    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
                  })()}
                </Text>
                <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap" flexShrink={0}>
                  {(() => {
                    const lastName = user?.user_metadata?.last_name || ''
                    return lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : ''
                  })()}
                </Text>
                <ChevronDownIcon flexShrink={0} />
              </Flex>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleSignOut}>Cerrar Sesión</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      <Flex>
        {/* Sidebar */}
        <Box bg={sidebarBg} borderRight="1px" borderColor={borderColor} w="250px" h="calc(100vh - 60px)" position="sticky" top="60px" p={4}>
          <VStack spacing={2} align="stretch">
            {sidebarItems.map((item) => (
              <Flex key={item.id} align="center" gap={3} px={4} py={3} borderRadius="lg" cursor="pointer" bg={item.id === 'recursos' ? 'black' : 'transparent'} color={item.id === 'recursos' ? 'white' : 'gray.600'} _hover={{ bg: item.id === 'recursos' ? 'black' : 'gray.100' }} transition="all 0.2s" onClick={() => { try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {}; navigate(item.to) }} w="full">
                <Icon as={item.icon} boxSize={5} />
                <Text fontSize="sm" fontWeight={item.id === 'recursos' ? 'semibold' : 'medium'}>{item.label}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>

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
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}><CardBody><Text color="gray.600">Aún no tienes recursos. Crea tu primer recurso desde el Dashboard.</Text></CardBody></Card>
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
                            <Text fontSize="sm" color="gray.600">{resource.subject} • {resource.topic}</Text>
                            <HStack justify="space-between" w="100%">
                              <Text fontSize="sm" color="gray.700">Progreso: {resourceProgressMap[resource.id] ?? 0}%</Text>
                              <Text fontSize="sm" color="gray.700">Puntuación: {(resourceScoreMap[resource.id] ?? 0)}/100</Text>
                            </HStack>
                            <Progress value={resourceProgressMap[resource.id] ?? 0} size="sm" colorScheme="blue" w="100%" borderRadius="md" />
                          </VStack>
                          <VStack spacing={2} w="100%">
                            <HStack spacing={2} w="100%">
                              <Button size="sm" colorScheme="blue" flex={1} onClick={() => navigate('/dashboard', { state: { playResourceId: resource.id, forceNew: false } })} isDisabled={!!startedMap[resource.id]}>Comenzar</Button>
                              <Button size="sm" variant="outline" leftIcon={<Icon as={FiBookOpen} />} flex={1} onClick={() => navigate(`/review/${resource.id}`)}>Revisar</Button>
                            </HStack>
                            <HStack spacing={2} w="100%">
                              <Button size="sm" variant="outline" flex={1} onClick={() => navigate('/dashboard', { state: { playResourceId: resource.id, forceNew: true } })}>Reintentar</Button>
                              <Button size="sm" variant="outline" colorScheme="purple" flex={1} onClick={() => handleIncreaseDifficulty(resource)} isDisabled={resource.difficulty === 'Avanzado'} isLoading={!!incLoadingMap[resource.id]}>Aumentar dificultad</Button>
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