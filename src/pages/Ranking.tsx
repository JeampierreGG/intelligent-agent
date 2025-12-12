import { useEffect, useState } from 'react'
import { Box, Flex, VStack, HStack, Text, Card, CardBody, Icon, useColorModeValue, Badge, Spinner, SimpleGrid } from '@chakra-ui/react'
import AppHeader from '../components/layout/AppHeader'
import AppSidebar from '../components/layout/AppSidebar'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { FiTrendingUp, FiAward } from 'react-icons/fi'
import { useAuth } from '../contexts/useAuth'
import { useNavigate } from 'react-router-dom'
import { getGlobalRanking, type GlobalRankingEntry, getUsersPublicNames } from '../services/ranking'
import { supabase } from '../services/supabase'

export default function Ranking() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
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
        try {
          const ids = list.map(r => r.user_id)
          const names = await getUsersPublicNames(ids)
          setDisplayNames(names)
        } catch (e) {
          console.warn('No se pudieron cargar nombres públicos:', e)
        }
      } catch (e) {
        console.error('Error cargando ranking global:', e)
        setError('No se pudo cargar el ranking global')
      } finally {
        setLoading(false)
      }
    }
    void load()

    // Suscripción en tiempo real para actualizar el ranking cuando cambien intentos o puntajes finales
    let cleaning = false
    const channel = supabase
      .channel('ranking-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_scores' },
        () => { if (!cleaning) { void load() } }
      )
      .subscribe()

    return () => {
      cleaning = true
      try { supabase.removeChannel(channel) } catch (err) { console.warn('removeChannel error:', err) }
    }
  }, [])

  const [displayNamesMap, setDisplayNames] = useState<Record<string, { first_name?: string | null; last_name?: string | null }>>({})

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
            <VStack spacing={3} align="center" textAlign="center">
              <Box w="80px" h="80px" borderRadius="full" bgGradient="linear(to-br, teal.500, blue.500)" display="flex" alignItems="center" justifyContent="center">
                <Icon as={FiAward} boxSize={10} color="white" />
              </Box>
              <Text fontSize="3xl" fontWeight="bold">Ranking Global</Text>
              <Text color="gray.600">Compite con otros estudiantes y alcanza la cima</Text>
              <Text color="gray.500" fontSize="sm">El "Total" corresponde a la suma de todos tus intentos.</Text>
            </VStack>

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
                    <Text fontSize="lg" color="gray.600">Aún no tienes recursos. Crea tu primer recurso desde el Dashboard.</Text>
                    <Text color="gray.500" textAlign="center">Completa recursos para sumar puntos y aparecer en el ranking</Text>
                  </VStack>
                ) : (
                  <VStack spacing={6} align="stretch">
                    {ranking.length >= 3 && (
                      <SimpleGrid columns={3} spacing={4} alignItems="end">
                        {(() => {
                          const podium = [ranking[1], ranking[0], ranking[2]]
                          const styles = [
                            { bg: 'linear-gradient(to-b, rgba(160,160,160,0.15), transparent)', border: '2px solid rgba(160,160,160,0.2)', iconColor: 'gray.400', scale: 1 },
                            { bg: 'linear-gradient(to-b, rgba(218,165,32,0.15), transparent)', border: '2px solid rgba(218,165,32,0.2)', iconColor: 'yellow.500', scale: 1.08 },
                            { bg: 'linear-gradient(to-b, rgba(205,127,50,0.15), transparent)', border: '2px solid rgba(205,127,50,0.2)', iconColor: 'orange.500', scale: 1 },
                          ]
                          return podium.map((p, i) => {
                            const dn = displayNamesMap[p.user_id]
                            const name = `${dn?.first_name || ''}${dn?.last_name ? ' ' + dn.last_name : ''}`.trim() || `Usuario ${p.user_id.slice(0,4)}…${p.user_id.slice(-4)}`
                            const style = styles[i]
                            return (
                              <Card key={`podium-${i}`} bg={cardBg} style={{ transform: `scale(${style.scale})` }} borderRadius="xl" border={style.border}>
                                <CardBody textAlign="center" pb={4} bgGradient={style.bg}>
                                  <HStack justify="center" mb={2}>
                                    <Icon as={FiAward} boxSize={i === 1 ? 14 : 12} color={style.iconColor} />
                                  </HStack>
                                  <Text fontSize={i === 1 ? 'xl' : 'lg'} fontWeight="semibold">{name}</Text>
                                  <Text fontSize={i === 1 ? '3xl' : '2xl'} fontWeight="bold" mt={2}>{p.total_score}</Text>
                                  <Text fontSize="sm" color="gray.500">puntos</Text>
                                </CardBody>
                              </Card>
                            )
                          })
                        })()}
                      </SimpleGrid>
                    )}
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
                        const dn = displayNamesMap[entry.user_id]
                        const fn = (dn?.first_name || '')
                        const ln = (dn?.last_name || '')
                        const full = `${fn}${ln ? ' ' + ln : ''}`.trim()
                        if (full) return full
                        const uid = entry.user_id
                        return `Usuario ${uid.slice(0, 4)}…${uid.slice(-4)}`
                      })()
                      return (
                        <HStack key={entry.user_id} spacing={4} p={4} borderRadius="lg" bg={bg} borderWidth={isTop3 ? '1px' : '0'} borderColor={borderColor} transition="all 0.2s" _hover={{ bg: isTop3 ? bg : 'gray.50' }}>
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
