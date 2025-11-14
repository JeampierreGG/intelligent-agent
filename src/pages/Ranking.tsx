import { useEffect, useState } from 'react'
import { Box, Flex, VStack, HStack, Text, Card, CardBody, Icon, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorModeValue, Image, Badge, Spinner } from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { FiTrendingUp, FiAward } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import logoImage from '../assets/Logo-IA.png'
import { getGlobalRanking, type GlobalRankingEntry } from '../services/ranking'
import { supabase } from '../services/supabase'

export default function Ranking() {
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

  const [ranking, setRanking] = useState<GlobalRankingEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await getGlobalRanking(50)
        setRanking(list)
      } catch (e) {
        console.error('Error cargando ranking global:', e)
        setError('No se pudo cargar el ranking global')
      } finally {
        setLoading(false)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load()

    // Suscripción en tiempo real para actualizar el ranking cuando cambien intentos o puntajes finales
    let cleaning = false
    const channel = supabase
      .channel('ranking-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'educational_resource_attempts' },
        () => { if (!cleaning) { void load() } }
      )
      .subscribe()

    return () => {
      cleaning = true
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [])

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
              <Flex key={item.id} align="center" gap={3} px={4} py={3} borderRadius="lg" cursor="pointer" bg={item.id === 'ranking' ? 'black' : 'transparent'} color={item.id === 'ranking' ? 'white' : 'gray.600'} _hover={{ bg: item.id === 'ranking' ? 'black' : 'gray.100' }} transition="all 0.2s" onClick={() => { try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch {}; navigate(item.to) }} w="full">
                <Icon as={item.icon} boxSize={5} />
                <Text fontSize="sm" fontWeight={item.id === 'ranking' ? 'semibold' : 'medium'}>{item.label}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>

        {/* Main content */}
        <Box flex={1} p={6} w="100%">
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="2xl" fontWeight="bold">Ranking Global</Text>
              <Text color="gray.600">Compite con otros estudiantes</Text>
              <Text color="gray.500" fontSize="sm">El "Total" corresponde a la suma de tu MEJOR puntaje final por cada recurso.</Text>
            </Box>

            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                {loading ? (
                  <HStack justify="center" py={8}><Spinner /></HStack>
                ) : error ? (
                  <VStack spacing={2} py={6}>
                    <Text color="red.500">{error}</Text>
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
        </Box>
      </Flex>
    </Box>
  )
}