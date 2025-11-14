import { useEffect, useState } from 'react'
import { Box, Flex, VStack, HStack, Text, Card, CardBody, Icon, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorModeValue, Image, Badge, Button, Spinner } from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { FiBookOpen, FiClock } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import logoImage from '../assets/Logo-IA.png'
import { getUserResources, type EducationalResource } from '../services/resources'
import { supabase } from '../services/supabase'

export default function Progress() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const headerBg = useColorModeValue('white', 'gray.800')
  const sidebarBg = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, to: '/dashboard' },
    { id: 'recursos', label: 'Recursos', icon: MdLibraryBooks, to: '/recursos' },
    { id: 'ranking', label: 'Ranking', icon: MdLeaderboard, to: '/ranking' },
  ]

  const [resources, setResources] = useState<EducationalResource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadResources = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await getUserResources(user.id)
      setResources((data || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (e) {
      console.error('Error cargando recursos para la línea de tiempo:', e)
      setError('No se pudo cargar la línea de tiempo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadResources()
  }, [user?.id])

  // Suscripción en tiempo real a creaciones/actualizaciones/borrados del usuario
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`progress-resources-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'educational_resources', filter: `user_id=eq.${user.id}` },
        () => { void loadResources() }
      )
      .subscribe()
    return () => { try { supabase.removeChannel(channel) } catch {} }
  }, [user?.id])

  const handleSignOut = async () => {
    try { await signOut(); navigate('/login') } catch {}
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString()
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
              <Flex key={item.id} align="center" gap={3} px={4} py={3} borderRadius="lg" cursor="pointer" bg={item.id === 'dashboard' ? 'transparent' : 'transparent'} color={'gray.600'} _hover={{ bg: 'gray.100' }} transition="all 0.2s" onClick={() => { try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {}; navigate(item.to) }} w="full">
                <Icon as={item.icon} boxSize={5} />
                <Text fontSize="sm" fontWeight={'medium'}>{item.label}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>

        {/* Main content */}
        <Box flex={1} p={6} w="100%">
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="2xl" fontWeight="bold">Tu Progreso</Text>
              <Text color="gray.600">Línea de tiempo de tus recursos creados</Text>
            </Box>

            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor} overflow="hidden">
              <CardBody>
                {loading ? (
                  <HStack justify="center" py={8}><Spinner /></HStack>
                ) : error ? (
                  <VStack spacing={2} py={6}>
                    <Text color="red.500">{error}</Text>
                    <Text color="gray.500" fontSize="sm">Intenta nuevamente más tarde.</Text>
                  </VStack>
                ) : resources.length === 0 ? (
                  <VStack spacing={4} py={8}>
                    <Icon as={FiBookOpen} boxSize={12} color="gray.400" />
                    <Text fontSize="lg" color="gray.600">Aún no has creado recursos</Text>
                    <Text color="gray.500" textAlign="center">Crea tu primer recurso desde el Dashboard para ver tu progreso aquí.</Text>
                  </VStack>
                ) : (
                  <Box position="relative">
                    {/* Línea vertical */}
                    <Box position="absolute" left={{ base: '18px', md: '28px' }} top={0} bottom={0} width="2px" bg={borderColor} zIndex={0} />

                    <VStack spacing={6} align="stretch">
                      {resources.map((r, idx) => (
                        <HStack key={r.id} align="flex-start" spacing={4} position="relative">
                          {/* Punto */}
                          <Box position="relative" pl={{ base: '40px', md: '60px' }} w="full">
                            <Box position="absolute" left={{ base: '10px', md: '20px' }} top="10px" w="16px" h="16px" borderRadius="full" bg="blue.500" boxShadow="0 0 0 4px rgba(59,130,246,0.15)" zIndex={1} />
                            <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} shadow="xs">
                              <CardBody>
                                <VStack align="start" spacing={2}>
                                  <HStack justify="space-between" w="full">
                                    <HStack>
                                      <Icon as={FiBookOpen} color="blue.500" />
                                      <Text fontWeight="semibold">{r.title}</Text>
                                    </HStack>
                                    <HStack>
                                      <Icon as={FiClock} color="gray.500" />
                                      <Text color="gray.600" fontSize="sm">{formatDate(r.created_at)}</Text>
                                    </HStack>
                                  </HStack>
                                  <HStack spacing={2} wrap="wrap">
                                    <Badge colorScheme="purple">{r.subject}</Badge>
                                    <Badge colorScheme="green">{r.topic}</Badge>
                                    <Badge colorScheme={r.difficulty === 'Avanzado' ? 'red' : r.difficulty === 'Intermedio' ? 'yellow' : 'blue'}>{r.difficulty}</Badge>
                                  </HStack>
                                  <HStack>
                                    <Button size="sm" variant="outline" onClick={() => navigate(`/review/${r.id}`)}>Ver recurso</Button>
                                    <Button size="sm" onClick={() => navigate('/recursos')}>Ver en lista</Button>
                                  </HStack>
                                </VStack>
                              </CardBody>
                            </Card>
                          </Box>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}
              </CardBody>
            </Card>
          </VStack>
        </Box>
      </Flex>
    </Box>
  )
}