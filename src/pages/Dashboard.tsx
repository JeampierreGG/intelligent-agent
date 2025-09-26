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
  Image
} from '@chakra-ui/react'
import { 
  FiBook, 
  FiTrendingUp, 
  FiSettings, 
  FiPlus,
  FiBookOpen,
  FiAward,
  FiClock
} from 'react-icons/fi'
import { 
  MdDashboard, 
  MdLibraryBooks, 
  MdLeaderboard, 
  MdSettings as MdSettingsIcon
} from 'react-icons/md'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import NewResourceModal from '../components/modals/NewResourceModal'
import logoImage from '../assets/Logo-IA.png'
import { getUserPreferences, mapFormatPreferencesToResourceTypes, mapInteractiveActivitiesToGames, type UserPreferences } from '../services/userPreferences'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  
  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const headerBg = useColorModeValue('white', 'gray.800')
  const sidebarBg = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')

  // Cargar preferencias del usuario
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user?.id) {
        try {
          const preferences = await getUserPreferences(user.id)
          setUserPreferences(preferences)
          console.log('✅ Preferencias del usuario cargadas:', preferences)
        } catch (error) {
          console.error('❌ Error cargando preferencias del usuario:', error)
        }
      }
    }

    loadUserPreferences()
  }, [user?.id])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard },
    { id: 'recursos', label: 'Recursos', icon: MdLibraryBooks },
    { id: 'ranking', label: 'Ranking', icon: MdLeaderboard },
    { id: 'preferencias', label: 'Preferencias', icon: MdSettingsIcon }
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
                    <Text fontSize="2xl" fontWeight="bold">0</Text>
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
              <Button colorScheme="blue" leftIcon={<Icon as={FiPlus} />} onClick={onOpen}>
                Nuevo Recurso
              </Button>
            </HStack>
            
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
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        )
      
      case 'ranking':
        return (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="2xl" fontWeight="bold">Ranking Global</Text>
              <Text color="gray.600">Compite con otros estudiantes</Text>
            </Box>
            
            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4} py={8}>
                  <Icon as={FiTrendingUp} boxSize={12} color="gray.400" />
                  <Text fontSize="lg" color="gray.600">
                    Ranking próximamente disponible
                  </Text>
                  <Text color="gray.500" textAlign="center">
                    Completa algunos recursos para aparecer en el ranking
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        )
      
      case 'preferencias':
        return (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="2xl" fontWeight="bold">Preferencias</Text>
              <Text color="gray.600">Personaliza tu experiencia de aprendizaje</Text>
            </Box>
            
            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4} py={8}>
                  <Icon as={FiSettings} boxSize={12} color="gray.400" />
                  <Text fontSize="lg" color="gray.600">
                    Configuración próximamente disponible
                  </Text>
                  <Text color="gray.500" textAlign="center">
                    Podrás editar tu perfil y preferencias de aprendizaje
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        )
      
      default:
        return null
    }
  }

  return (
    <Box minH="100vh" bg={bgColor} w="100%" maxW="100vw">
      {/* Header */}
      <Box
        bg={headerBg}
        borderBottom="1px"
        borderColor={borderColor}
        px={6}
        py={2}
        position="sticky"
        top={0}
        zIndex={1000}
        w="100%"
      >
        <Flex justify="space-between" align="center">
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
                onClick={() => setActiveSection(item.id)}
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
          {renderContent()}
        </Box>
      </Flex>

      {/* Modal de Nuevo Recurso */}
      <NewResourceModal 
        isOpen={isOpen} 
        onClose={onClose}
        userPreferences={{
          academicLevel: userPreferences?.academicLevel || 'Universidad',
          formatPreferences: userPreferences?.formatPreferences || [],
          interactiveActivities: userPreferences?.interactiveActivities || [],
          preferredFormats: userPreferences ? mapFormatPreferencesToResourceTypes(userPreferences.formatPreferences) : [],
          preferredGames: userPreferences ? mapInteractiveActivitiesToGames(userPreferences.interactiveActivities) : []
        }}
      />
    </Box>
  )
}