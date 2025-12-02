import { useEffect, useMemo, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardBody, HStack, Spinner, Text, VStack, useColorModeValue, Flex, Image, Icon, Avatar, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { useAuth } from '../contexts/useAuth'
import { getAttemptsForResource, type Attempt, getAttemptSummarySnapshot, type SummarySnapshot } from '../services/attempts'
import ResourceSummary from '../components/summaries/ResourceSummary'
//
// Temporizador eliminado
import { getResourceById } from '../services/resources'
import type { EducationalResource } from '../services/resources'
//
import type { GeneratedResource } from '../services/types'
import logoImage from '../assets/Logo-IA.png'

type BreakdownItem = { name: string; weight: number; totalItems: number; correct: number; contribution: number }

export default function ReviewResource() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { resourceId } = useParams()
  const location = useLocation() as { state?: { attemptNumber?: number } }
  const initialAttempt: number | undefined = location.state?.attemptNumber

  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const headerBg = useColorModeValue('white', 'gray.800')
  const sidebarBg = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')
  //

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [resource, setResource] = useState<EducationalResource | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState<'dashboard' | 'recursos' | 'ranking'>('recursos')
  // Temporizador eliminado
  //

  // Derivar contenidos para mostrar nombres de grupos, etc.
  const groupSortContent = useMemo(() => {
    const c = resource?.content as GeneratedResource | undefined
    const bundle = c?.gameelement?.groupSort
    const root = c?.groupSort
    return bundle || root || null
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
        const deduped = (() => {
          const m = new Map<number, Attempt>()
          for (const a of list) {
            if (!m.has(a.attempt_number)) m.set(a.attempt_number, a)
          }
          return Array.from(m.values()).sort((a, b) => a.attempt_number - b.attempt_number)
        })()
        setAttempts(deduped)
        if (list.length > 0) {
          const last = list[list.length - 1].attempt_number
          setSelectedAttempt(initialAttempt ?? last)
        } else {
          setSelectedAttempt(null)
        }
        //
      } catch (e) {
        console.error('Error cargando recurso o intentos para revisión:', e)
        setError('No se pudo cargar la revisión del recurso.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, resourceId, initialAttempt])

  //

  const current = useMemo(() => attempts.find(a => a.attempt_number === selectedAttempt) || null, [attempts, selectedAttempt])
  const attemptId = current?.id || null
  const localSummary = attemptId ? getAttemptSummarySnapshot(attemptId) : null
  const snapshot: SummarySnapshot | null = (current?.summary_snapshot as SummarySnapshot | undefined) || localSummary || null
  const finalScore = snapshot?.score ?? (current?.final_score ?? null)
  const breakdown: BreakdownItem[] = snapshot?.breakdown ?? (current?.final_score_breakdown ?? [])

  //

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, to: '/dashboard' },
    { id: 'recursos', label: 'Recursos', icon: MdLibraryBooks, to: '/recursos' },
    { id: 'ranking', label: 'Ranking', icon: MdLeaderboard, to: '/ranking' }
  ] as const

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.warn('sign out error:', err)
    }
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
                    setActiveSection(item.id as 'dashboard' | 'recursos' | 'ranking')
                    navigate(item.to)
                    try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch (err) { console.warn('scroll error:', err) }
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
                <Flex key={item.id} align="center" gap={3} px={4} py={3} borderRadius="lg" cursor="pointer" bg={activeSection === item.id ? 'black' : 'transparent'} color={activeSection === item.id ? 'white' : 'gray.600'} _hover={{ bg: activeSection === item.id ? 'black' : 'gray.100' }} transition="all 0.2s" onClick={() => { setActiveSection(item.id as 'dashboard' | 'recursos' | 'ranking'); navigate(item.to); try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch (err) { console.warn('scroll error:', err) } }} w="full">
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
                <Button mt={4} onClick={() => navigate('/recursos')}>Volver</Button>
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
              <Flex key={item.id} align="center" gap={3} px={4} py={3} borderRadius="lg" cursor="pointer" bg={activeSection === item.id ? 'black' : 'transparent'} color={activeSection === item.id ? 'white' : 'gray.600'} _hover={{ bg: activeSection === item.id ? 'black' : 'gray.100' }} transition="all 0.2s" onClick={() => { setActiveSection(item.id as 'dashboard' | 'recursos' | 'ranking'); navigate(item.to); try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch (err) { console.warn('scroll error:', err) } }} w="full">
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
                <Button onClick={() => navigate('/recursos')}>Volver a Recursos</Button>
              </HStack>

              {/* Se eliminan Progreso/Barra y Tiempo del HUD superior según requerimiento */}

            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  {attempts.length > 0 && (
                    <HStack spacing={2} flexWrap="wrap">
                      {attempts.map((att, idx) => (
                        <Button
                          key={att.id ? `att-${att.id}` : `att-${att.attempt_number}-${idx}`}
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

                  {snapshot ? (
                    <ResourceSummary
                      score={Number(finalScore || 0)}
                      breakdown={breakdown || []}
                      openBoxResults={snapshot?.openBoxResults || []}
                      findMatchResults={snapshot?.findMatchResults || []}
                      quizResults={snapshot?.quizResults || []}
                      groupSortResults={snapshot?.groupSortResults || []}
                      groupNames={groupSortContent?.groups?.map((g) => g.name) ?? []}
                      linesResults={snapshot?.linesResults || []}
                      anagramResults={snapshot?.anagramResults || []}
                      debateLevel={snapshot?.debate_level ?? 0}
                      onExit={() => { try { navigate('/dashboard', { state: { section: 'recursos' } }) } finally { try { setTimeout(() => window.location.reload(), 50) } catch (err) { console.warn('reload schedule error:', err) } } }}
                      onRetry={() => navigate(`/play/${resource?.id}?new=1`)}
                    />
                  ) : (
                    <Box p={3} borderWidth="1px" borderRadius="md">
                      <Text color="gray.600">No hay resumen del intento para mostrar.</Text>
                      <HStack mt={2}>
                        <Button colorScheme="blue" onClick={() => navigate(`/play/${resource?.id}`)}>Comenzar</Button>
                        <Button variant="outline" onClick={() => navigate('/recursos')}>Volver</Button>
                      </HStack>
                    </Box>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </Box>
      </Flex>
    </Box>
  )
}
