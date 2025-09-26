import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { translateSupabaseError } from '../utils/errorTranslations'
import {
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  Alert,
  AlertIcon,
  Image,
} from '@chakra-ui/react'
import logoIA from '../assets/Logo-IA.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError('')
      setLoading(true)
      
      const { data, error } = await signIn(email, password)
      
      if (error) {
        if (error.message === 'Email not confirmed') {
          setError('Tu email no ha sido confirmado. Por favor, revisa tu bandeja de entrada y confirma tu email antes de iniciar sesión.')
        } else {
          setError('Error al iniciar sesión: ' + translateSupabaseError(error.message))
        }
        return
      }
      
      // Si el login fue exitoso, redirigir al dashboard
      // El ProtectedRoute se encargará de verificar si necesita completar el cuestionario
      navigate('/dashboard')
    } catch (error: any) {
      setError('Error al iniciar sesión: ' + translateSupabaseError(error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxW="lg" py={{ base: '6', md: '12' }}>
      <Stack spacing="4">
        {/* Logo */}
        <Flex justify="center">
          <Box as="a" href="/" aria-label="Home">
            <Image 
              src={logoIA} 
              alt="Learn Playing Logo" 
              h="24" 
              w="auto"
              maxW="200px"
            />
          </Box>
        </Flex>

        {/* Título y subtítulo fuera del cuadro */}
        <Stack spacing="1" textAlign="center">
          <Heading as="h1" size="lg">
            Learn Playing
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Inicia sesión en tu cuenta
          </Text>
        </Stack>

        {/* Card - Solo el formulario */}
        <Box
          bg="white"
          border="1px"
          borderColor="gray.200"
          borderRadius="xl"
          shadow="md"
          px={{ base: '8', md: '12' }}
          py="6"
          maxW="500px"
          mx="auto"
          w="100%"
        >
          <Stack spacing="6">

            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm">{error}</Text>
                  {error.includes('email no ha sido confirmado') && (
                    <Text fontSize="xs" color="gray.600" mt={2}>
                      <strong>Para desarrollo:</strong> Ve a tu panel de Supabase → Authentication → Settings y deshabilita "Enable email confirmations" para evitar este paso.
                    </Text>
                  )}
                </Box>
              </Alert>
            )}

            <Stack as="form" spacing="4" onSubmit={handleSubmit}>
              <FormControl id="email" isRequired>
                <FormLabel fontSize="sm" _after={{ color: "black" }}>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  size="md"
                  borderRadius="md"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormControl>

              <FormControl id="password" isRequired>
                <FormLabel fontSize="sm" _after={{ color: "black" }}>Contraseña</FormLabel>
                <Input
                  type="password"
                  placeholder="••••••••"
                  size="md"
                  borderRadius="md"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormControl>

              <Flex justify="space-between" align="center">
                <Checkbox size="sm" colorScheme="teal">
                  Recordarme
                </Checkbox>
                <Link fontSize="sm" color="teal.500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </Flex>

              <Button
                type="submit"
                colorScheme="teal"
                size="md"
                fontWeight="semibold"
                borderRadius="md"
                isLoading={loading}
                loadingText="Iniciando sesión..."
                bg="gray.800"
                color="white"
                _hover={{ bg: "gray.700" }}
                _active={{ bg: "gray.900" }}
              >
                Iniciar Sesión
              </Button>
            </Stack>

            <Divider />

            <Text fontSize="sm" textAlign="center">
              ¿No tienes cuenta?{' '}
              <Link as={RouterLink} to="/register" color="teal.500">
                Regístrate aquí
              </Link>
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
}