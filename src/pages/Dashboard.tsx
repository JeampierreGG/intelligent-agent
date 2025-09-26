import {
  Box,
  Container,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Icon,
  Badge,
  SimpleGrid,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  useColorModeValue
} from '@chakra-ui/react'
import { 
  FiHome, 
  FiBook, 
  FiTrendingUp, 
  FiSettings, 
  FiLogOut,
  FiPlus,
  FiBookOpen,
  FiAward,
  FiClock
} from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const sidebarBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  // Dashboard cargado correctamente

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'recursos', label: 'Recursos', icon: FiBook },
    { id: 'ranking', label: 'Ranking', icon: FiTrendingUp },
    { id: 'preferencias', label: 'Preferencias', icon: FiSettings }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="2xl" fontWeight="bold" mb={2}>
                ¡Bienvenido a Learn Playing! 🎮
              </Text>
              <Text color="gray.600">
                Comienza tu aventura de aprendizaje personalizado
              </Text>
            </Box>

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

            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4} align="center" py={8}>
                  <Icon as={FiPlus} boxSize={12} color="blue.500" />
                  <Text fontSize="lg" fontWeight="semibold">
                    ¡Crea tu primer recurso educativo!
                  </Text>
                  <Text color="gray.600" textAlign="center">
                    Genera materiales personalizados con IA y aprende jugando
                  </Text>
                  <Button 
                    colorScheme="blue" 
                    size="lg"
                    leftIcon={<Icon as={FiPlus} />}
                    onClick={() => setActiveSection('recursos')}
                  >
                    Crear Recurso
                  </Button>
                </VStack>
              </CardBody>
            </Card>
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
              <Button colorScheme="blue" leftIcon={<Icon as={FiPlus} />}>
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
    <Flex minH="100vh" bg={bgColor}>
      {/* Sidebar */}
      <Box
        w="250px"
        bg={sidebarBg}
        borderRight="1px"
        borderColor={borderColor}
        p={4}
      >
        <VStack spacing={6} align="stretch">
          {/* Logo */}
          <Box textAlign="center" py={4}>
            <Text fontSize="xl" fontWeight="bold" color="blue.500">
              Learn Playing
            </Text>
          </Box>

          {/* Navigation */}
          <VStack spacing={2} align="stretch">
            {sidebarItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? 'solid' : 'ghost'}
                colorScheme={activeSection === item.id ? 'blue' : 'gray'}
                justifyContent="flex-start"
                leftIcon={<Icon as={item.icon} />}
                onClick={() => setActiveSection(item.id)}
              >
                {item.label}
              </Button>
            ))}
            
            {/* Botón de Cerrar Sesión */}
            <Box pt={4}>
              <Divider mb={4} />
              <Button
                variant="ghost"
                colorScheme="red"
                justifyContent="flex-start"
                leftIcon={<Icon as={FiLogOut} />}
                onClick={handleSignOut}
                w="full"
              >
                Cerrar Sesión
              </Button>
            </Box>
          </VStack>

          {/* User Menu */}
          <Box mt="auto" pt={4}>
            <Divider mb={4} />
            <Menu>
              <MenuButton as={Button} variant="ghost" w="full" justifyContent="flex-start">
                <HStack>
                  <Avatar size="sm" name={user?.email} />
                  <VStack spacing={0} align="start" flex={1}>
                    <Text fontSize="sm" fontWeight="medium" isTruncated>
                      {user?.email}
                    </Text>
                    <Badge colorScheme="green" size="sm">
                      Activo
                    </Badge>
                  </VStack>
                </HStack>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<Icon as={FiSettings} />}>
                  Configuración
                </MenuItem>
                <MenuItem icon={<Icon as={FiLogOut} />} onClick={handleSignOut}>
                  Cerrar Sesión
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        </VStack>
      </Box>

      {/* Main Content */}
      <Box flex={1} p={6}>
        <Container maxW="container.xl">
          {renderContent()}
        </Container>
      </Box>
    </Flex>
  )
}