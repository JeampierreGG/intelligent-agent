import React, { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { translateSupabaseError } from '../utils/errorTranslations'
import {
  Box,
  Button,
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
  InputGroup,
  InputRightElement,
  IconButton,
  FormErrorMessage
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import logoIA from '../assets/Logo-IA.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())
  const passwordValid = password.length >= 8
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError('')
      setLoading(true)
      const emailSan = email.trim().toLowerCase()
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSan)
      if (!emailOk) {
        setError('Ingresa un email válido')
        setLoading(false)
        return
      }
      const pwd = password
      if (!pwd || pwd.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres')
        setLoading(false)
        return
      }
      
      // El AuthContext ahora lanza excepciones en caso de error
      await signIn(emailSan, pwd)
      
      // Si el login fue exitoso, navegar directamente al dashboard
      navigate('/dashboard')
    } catch (error) {
      console.error('Error en login:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      if (errorMessage === 'Email not confirmed') {
        setError('Tu email no ha sido confirmado. Por favor, revisa tu bandeja de entrada y confirma tu email antes de iniciar sesión.')
      } else {
        setError('Error al iniciar sesión: ' + translateSupabaseError(errorMessage))
      }
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

            <Stack as="form" spacing="4" onSubmit={handleSubmit} noValidate>
              <FormControl id="email" isRequired isInvalid={emailTouched && !emailValid}>
                <FormLabel fontSize="sm" _after={{ color: "black" }}>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  size="md"
                  borderRadius="md"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  aria-invalid={emailTouched && !emailValid}
                  borderColor={emailTouched && !emailValid ? 'red.500' : 'gray.300'}
                  _focus={{ borderColor: emailTouched && !emailValid ? 'red.500' : 'teal.500' }}
                />
                <FormErrorMessage>Ingresa un email válido</FormErrorMessage>
              </FormControl>

              <FormControl id="password" isRequired isInvalid={passwordTouched && !passwordValid}>
                <FormLabel fontSize="sm" _after={{ color: "black" }}>Contraseña</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    size="md"
                    borderRadius="md"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    aria-invalid={passwordTouched && !passwordValid}
                    borderColor={passwordTouched && !passwordValid ? 'red.500' : 'gray.300'}
                    _focus={{ borderColor: passwordTouched && !passwordValid ? 'red.500' : 'teal.500' }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword((v) => !v)}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>La contraseña debe tener al menos 8 caracteres</FormErrorMessage>
              </FormControl>

              

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
                isDisabled={loading || !emailValid || !passwordValid}
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
