import { useEffect, useMemo, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardBody, HStack, SimpleGrid, Spinner, Text, VStack, useColorModeValue, Flex, Image, Icon, Avatar, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { useAuth } from '../contexts/AuthContext'
import { getAttemptsForResource } from '../services/attempts'
import { getResourceProgress } from '../services/resourceProgress'
import { getTotalAccumulatedSecondsForResource } from '../services/resourceSessions'
import { getResourceById } from '../services/resources'
import type { EducationalResource } from '../services/resources'
import logoImage from '../assets/Logo-IA.png'

type BreakdownItem = { name: string; weight: number; totalItems: number; correct: number; contribution: number }

export default function ReviewResource() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { resourceId } = useParams()
  const location = useLocation() as any
  const initialAttempt: number | undefined = location?.state?.attemptNumber

  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const headerBg = useColorModeValue('white', 'gray.800')
  const sidebarBg = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [resource, setResource] = useState<EducationalResource | null>(null)
  const [attempts, setAttempts] = useState<Array<{ id?: string; attempt_number: number; final_score?: number | null; final_score_breakdown?: any; summary_snapshot?: any }>>([])
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState<'dashboard' | 'recursos' | 'ranking'>('recursos')
  const [totalSeconds, setTotalSeconds] = useState<number>(0)
  const [progressPct, setProgressPct] = useState<number>(0)
  const [completedElements, setCompletedElements] = useState<string[]>([])

  // Derivar contenidos para mostrar nombres de grupos, etc.
  const groupSortContent = useMemo(() => {
    const c: any = resource?.content || {}
    return (c?.gameelement?.groupSort || c?.groupSort || c?.gameElements?.groupSort) ?? null
  }, [resource])

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.id || !resourceId) return
        setLoading(true)
        setError(null)
        const res = await getResourceById(resourceId, user.id)
        setResource(res?.data || null)
        const list = await getAttemptsForResource(user.id, resourceId)
        setAttempts(list)
        if (list.length > 0) {
          const last = list[list.length - 1].attempt_number
          setSelectedAttempt(initialAttempt ?? last)
        } else {
          setSelectedAttempt(null)
        }
        // Tiempo total acumulado en el recurso
        try {
          const secs = await getTotalAccumulatedSecondsForResource(user.id, resourceId)
          setTotalSeconds(secs || 0)
        } catch {}
        // Progreso actual y elementos completados
        try {
          const prog = getResourceProgress(user.id, resourceId)
          if (res?.data) {
            const pct = computeCardProgress(res.data as EducationalResource, prog)
            setProgressPct(pct)
            setCompletedElements(computeCompletedElements(res.data as any, prog))
          } else {
            setProgressPct(0)
            setCompletedElements([])
          }
        } catch {}
      } catch (e) {
        console.error('Error cargando recurso o intentos para revisión:', e)
        setError('No se pudo cargar la revisión del recurso.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, resourceId, initialAttempt])

  const current = useMemo(() => attempts.find(a => a.attempt_number === selectedAttempt) || null, [attempts, selectedAttempt])
  const snapshot = current?.summary_snapshot || null
  const finalScore = snapshot?.score ?? (current?.final_score ?? null)
  const breakdown: BreakdownItem[] = snapshot?.breakdown ?? (current?.final_score_breakdown ?? [])

  // Calcula el porcentaje de progreso para mostrar en revisión (copiado del Dashboard)
  const computeCardProgress = (resource: EducationalResource, prog: ReturnType<typeof getResourceProgress> | null): number => {
    try {
      const content: any = resource.content || {}
      const studyCount: number = (content?.studyElements?.length || 0)
      const quizPresent: boolean = !!(content?.gameelement?.quiz || content?.quiz || content?.gameElements?.quiz)
      const groupSortPresent: boolean = !!(content?.gameelement?.groupSort || content?.groupSort || content?.gameElements?.groupSort)
      const findPresent: boolean = !!(content?.gameelement?.findTheMatch || content?.findTheMatch || content?.gameElements?.findTheMatch)
      const openBoxPresent: boolean = !!(content?.gameelement?.openTheBox || content?.openTheBox || content?.gameElements?.openTheBox)
      const anagramPresent: boolean = !!(content?.gameelement?.anagram || content?.anagram || content?.gameElements?.anagram)
      const linesPresent = true

      const order = ['group_sort', 'find_the_match', 'open_box', 'anagram'] as const
      const presentMap: Record<string, boolean> = {
        group_sort: groupSortPresent,
        find_the_match: findPresent,
        open_box: openBoxPresent,
        anagram: anagramPresent,
      }

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
          completedSegments = studyCount
          break
        case 'lines':
          completedSegments = studyCount + (quizPresent ? 1 : 0)
          break
        case 'lines_summary':
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0)
          break
        case 'group_sort':
        case 'find_the_match':
        case 'open_box':
        case 'anagram': {
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0)
          for (const st of order) {
            if (st === prog.stage) break
            if (presentMap[st]) completedSegments += 1
          }
          break
        }
        case 'group_sort_summary': {
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0)
          break
        }
        case 'find_the_match_summary': {
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0)
          break
        }
        case 'summary':
          completedSegments = studyCount + (quizPresent ? 1 : 0) + (linesPresent ? 1 : 0) + (groupSortPresent ? 1 : 0) + (findPresent ? 1 : 0) + (openBoxPresent ? 1 : 0) + (anagramPresent ? 1 : 0)
          break
        default:
          completedSegments = 0
      }
      const pct = totalSegments > 0 ? Math.round((completedSegments / totalSegments) * 100) : 0
      return Math.max(0, Math.min(100, pct))
    } catch (e) {
      console.warn('computeCardProgress (Review) error:', e)
      return 0
    }
  }

  // Lista de elementos completados para mostrar en revisión
  const computeCompletedElements = (res: any, prog: ReturnType<typeof getResourceProgress> | null): string[] => {
    if (!prog || !res) return []
    const content: any = res.content || {}
    const studyCount: number = (content?.studyElements?.length || 0)
    const quizPresent: boolean = !!(content?.gameelement?.quiz || content?.quiz || content?.gameElements?.quiz)
    const groupSortPresent: boolean = !!(content?.gameelement?.groupSort || content?.groupSort || content?.gameElements?.groupSort)
    const findPresent: boolean = !!(content?.gameelement?.findTheMatch || content?.findTheMatch || content?.gameElements?.findTheMatch)
    const openBoxPresent: boolean = !!(content?.gameelement?.openTheBox || content?.openTheBox || content?.gameElements?.openTheBox)
    const anagramPresent: boolean = !!(content?.gameelement?.anagram || content?.anagram || content?.gameElements?.anagram)
    const done: string[] = []
    // Estudio: mostrar cuenta parcial
    if (prog.stage === 'study') {
      const n = Math.min(prog.studyIndex ?? 0, studyCount)
      if (n > 0) done.push(`Estudio: ${n}/${studyCount} secciones`)
    } else {
      if (studyCount > 0) done.push(`Estudio: ${studyCount}/${studyCount} secciones`)
    }
    // Quiz completo si se pasó a líneas o más allá
    if (quizPresent) {
      const quizDoneStages = new Set(['lines', 'lines_summary', 'group_sort', 'find_the_match', 'open_box', 'anagram', 'group_sort_summary', 'find_the_match_summary', 'summary'])
      if (quizDoneStages.has(prog.stage as any)) done.push('Quiz')
    }
    // Líneas completas si se pasó a otros juegos o resumen
    const linesDoneStages = new Set(['group_sort', 'find_the_match', 'open_box', 'anagram', 'group_sort_summary', 'find_the_match_summary', 'summary'])
    if (linesDoneStages.has(prog.stage as any)) done.push('Emparejamientos (líneas)')
    // Group Sort
    if (groupSortPresent) {
      const groupSortDoneStages = new Set(['find_the_match', 'open_box', 'anagram', 'group_sort_summary', 'summary'])
      if (groupSortDoneStages.has(prog.stage as any)) done.push('Ordenar por grupo')
    }
    // Find The Match
    if (findPresent) {
      const findDoneStages = new Set(['open_box', 'anagram', 'find_the_match_summary', 'summary'])
      if (findDoneStages.has(prog.stage as any)) done.push('Cada oveja con su pareja')
    }
    // Open The Box
    if (openBoxPresent) {
      const openBoxDoneStages = new Set(['anagram', 'summary'])
      if (openBoxDoneStages.has(prog.stage as any)) done.push('Abrecajas')
    }
    // Anagram
    if (anagramPresent) {
      if (prog.stage === 'summary') done.push('Anagrama')
    }
    return done
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard },
    { id: 'recursos', label: 'Recursos', icon: MdLibraryBooks },
    { id: 'ranking', label: 'Ranking', icon: MdLeaderboard }
  ] as const

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {}
  }

  if (loading) {
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
                      const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || '';
                      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
                    })()}
                  </Text>
                  <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap" flexShrink={0}>
                    {(() => {
                      const lastName = user?.user_metadata?.last_name || '';
                      return lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : '';
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
                    setActiveSection(item.id as any)
                    navigate('/dashboard', { state: { section: item.id } })
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
            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4} py={8}>
                  <Spinner size="xl" color="blue.500" />
                  <Text fontSize="lg" color="gray.600">Cargando revisión...</Text>
                </VStack>
              </CardBody>
            </Card>
          </Box>
        </Flex>
      </Box>
    )
  }

  if (error) {
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
                <Flex key={item.id} align="center" gap={3} px={4} py={3} borderRadius="lg" cursor="pointer" bg={activeSection === item.id ? 'black' : 'transparent'} color={activeSection === item.id ? 'white' : 'gray.600'} _hover={{ bg: activeSection === item.id ? 'black' : 'gray.100' }} transition="all 0.2s" onClick={() => { setActiveSection(item.id as any); navigate('/dashboard', { state: { section: item.id } }); try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {} }} w="full">
                  <Icon as={item.icon} boxSize={5} />
                  <Text fontSize="sm" fontWeight={activeSection === item.id ? 'semibold' : 'medium'}>{item.label}</Text>
                </Flex>
              ))}
            </VStack>
          </Box>

          {/* Main Content */}
          <Box flex={1} p={6} w="100%">
            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <Text color="red.600">{error}</Text>
                <Button mt={4} onClick={() => navigate('/dashboard', { state: { section: 'recursos' } })}>Volver</Button>
              </CardBody>
            </Card>
          </Box>
        </Flex>
      </Box>
    )
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
                    const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || '';
                    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
                  })()}
                </Text>
                <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap" flexShrink={0}>
                  {(() => {
                    const lastName = user?.user_metadata?.last_name || '';
                    return lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : '';
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
              <Flex key={item.id} align="center" gap={3} px={4} py={3} borderRadius="lg" cursor="pointer" bg={activeSection === item.id ? 'black' : 'transparent'} color={activeSection === item.id ? 'white' : 'gray.600'} _hover={{ bg: activeSection === item.id ? 'black' : 'gray.100' }} transition="all 0.2s" onClick={() => { setActiveSection(item.id as any); navigate('/dashboard', { state: { section: item.id } }); try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {} }} w="full">
                <Icon as={item.icon} boxSize={5} />
                <Text fontSize="sm" fontWeight={activeSection === item.id ? 'semibold' : 'medium'}>{item.label}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>

        {/* Main Content */}
          <Box flex={1} p={6} w="100%">
            <VStack spacing={6} align="stretch">
              <HStack justify="space-between">
                <Box>
                  <Text fontSize="2xl" fontWeight="bold">Revisión del recurso</Text>
                  <Text color="gray.600">{resource?.title ?? '(recurso)'}</Text>
                </Box>
                <Button onClick={() => navigate('/dashboard', { state: { section: 'recursos' } })}>Volver a Recursos</Button>
              </HStack>

              {/* Se eliminan Progreso/Barra y Tiempo del HUD superior según requerimiento */}

            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  {attempts.length > 0 && (
                    <HStack spacing={2} flexWrap="wrap">
                      {attempts.map(att => (
                        <Button
                          key={`att-${att.attempt_number}`}
                          size="sm"
                          variant={selectedAttempt === att.attempt_number ? 'solid' : 'outline'}
                          colorScheme={selectedAttempt === att.attempt_number ? 'blue' : 'gray'}
                          onClick={() => setSelectedAttempt(att.attempt_number)}
                        >
                          {att.attempt_number}
                        </Button>
                      ))}
                    </HStack>
                  )}

                  <VStack align="stretch" spacing={4}>
                    <Text fontSize="lg" fontWeight="bold">Resumen del recurso</Text>
                    <Box p={3} borderWidth="1px" borderRadius="md" bg="blue.50" borderColor="blue.200">
                      <HStack justify="space-between" align="center">
                        <Text fontSize="md" fontWeight="semibold" color="blue.800">Puntuación final</Text>
                        <Text fontSize="xl" fontWeight="bold" color="blue.900">{finalScore != null ? `${Number(finalScore).toFixed(2)} / 100` : '— / 100'}</Text>
                      </HStack>
                      {/* Métricas del intento (tiempo y progreso) si están disponibles en el snapshot */}
                      {(() => {
                        const attSecs: number | null = typeof snapshot?.attempt_time_seconds === 'number' ? snapshot.attempt_time_seconds : null
                        const attPct: number | null = typeof snapshot?.attempt_progress_pct === 'number' ? snapshot.attempt_progress_pct : null
                        const hhmmss = new Date(((attSecs ?? totalSeconds) || 0) * 1000).toISOString().substring(11, 19)
                        const pctToShow = attPct ?? progressPct
                        return (
                          <VStack align="stretch" spacing={1} mt={2}>
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.700">Tiempo del intento</Text>
                              <Text fontSize="sm" color="gray.800">{hhmmss}</Text>
                            </HStack>
                            <VStack align="stretch" spacing={1}>
                              <Text fontSize="xs" color="gray.600">Progreso del intento: {pctToShow}%</Text>
                              <Box w="100%" h="6px" bg={useColorModeValue('gray.200','gray.700')} borderRadius="md" overflow="hidden">
                                <Box h="6px" bg="blue.500" width={`${pctToShow}%`} />
                              </Box>
                            </VStack>
                          </VStack>
                        )
                      })()}
                      {/* Estudio: X/Y secciones debajo de la puntuación final (solo elementos de estudio) */}
                      {(() => {
                        const studyLabel = completedElements.find((s) => s.startsWith('Estudio:'))
                        return studyLabel ? (
                          <Box mt={3} p={2} borderWidth="1px" borderRadius="md" bg={useColorModeValue('green.50','green.900')} borderColor={useColorModeValue('green.200','green.700')}>
                            <Text fontSize="sm" fontWeight="semibold" mb={1} color={useColorModeValue('green.800','green.200')}>Estudio</Text>
                            <Text fontSize="sm" color={useColorModeValue('gray.800','gray.100')}>{studyLabel}</Text>
                          </Box>
                        ) : null
                      })()}
                      {Array.isArray(breakdown) && breakdown.length > 0 && (
                        <VStack align="stretch" spacing={1} mt={2}>
                          {breakdown.map((b, idx) => (
                            <HStack key={`sum-br-${idx}`} justify="space-between">
                              <Text fontSize="sm" color="gray.800">{b.name}</Text>
                              <Text fontSize="sm" color="gray.700">{Number(b.contribution).toFixed(2)} / {Number(b.weight).toFixed(2)} pts</Text>
                            </HStack>
                          ))}
                        </VStack>
                      )}
                    </Box>
                    {/* Close inner summary container */}
                    </VStack>

                {Array.isArray(snapshot?.openBoxResults) && snapshot.openBoxResults.length > 0 && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="semibold">Abrecajas</Text>
                    {snapshot.openBoxResults.map((r: any, idx: number) => (
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

                {Array.isArray(snapshot?.findMatchResults) && snapshot.findMatchResults.length > 0 && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="semibold">Cada oveja con su pareja</Text>
                    {snapshot.findMatchResults.map((r: any, idx: number) => (
                      <Box key={`sum-ftm-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
                        <Text fontSize="sm"><strong>{r.concept}</strong> → {r.chosen || 'Sin respuesta'}</Text>
                        {!r.correct && (
                          <Text fontSize="xs" color="red.600">Correcta: {r.expected}</Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                )}

                {Array.isArray(snapshot?.quizResults) && snapshot.quizResults.length > 0 && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="semibold">Quiz</Text>
                    {snapshot.quizResults.map((q: any, idx: number) => (
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

                {Array.isArray(snapshot?.groupSortResults) && snapshot.groupSortResults.length > 0 && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="semibold">Ordenar por grupo</Text>
                    {(() => {
                      const groupNames: string[] = groupSortContent?.groups?.map((g: any) => g.name) ?? []
                      const grouped: Record<string, Array<{ item: string; correct: boolean; expectedGroup: string }>> = {}
                      groupNames.forEach(name => { grouped[name] = [] })
                      // No incluir 'Sin grupo' en el resumen final
                      snapshot.groupSortResults.forEach((r: any) => {
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

                {Array.isArray(snapshot?.linesResults) && snapshot.linesResults.length > 0 && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="semibold">Emparejamientos (líneas)</Text>
                    {snapshot.linesResults.map((r: any, idx: number) => (
                      <Box key={`sum-line-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
                        <Text fontSize="sm"><strong>{r.term}</strong> → {r.chosen || 'Sin respuesta'}</Text>
                        {!r.correct && (
                          <Text fontSize="xs" color="red.600">Correcta: {r.expected}</Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                )}

                {Array.isArray(snapshot?.anagramResults) && snapshot.anagramResults.length > 0 && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="semibold">Anagrama</Text>
                    {snapshot.anagramResults.map((a: any, idx: number) => (
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
                    <Button colorScheme="blue" onClick={() => navigate('/dashboard', { state: { section: 'recursos' } })}>Salir</Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </Box>
      </Flex>
    </Box>
  )
}