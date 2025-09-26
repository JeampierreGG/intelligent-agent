import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { translateSupabaseError } from '../utils/errorTranslations'
import {
  Container,
  Box,
  Heading,
  Text,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  Input,
  Button,
  Grid,
  GridItem,
  Select,
  RadioGroup,
  Radio,
  Checkbox,
  VStack,
  FormHelperText
} from '@chakra-ui/react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [learningGoal, setLearningGoal] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones
    if (!firstName.trim()) {
      setError('El nombre es requerido')
      return
    }

    if (!lastName.trim()) {
      setError('El apellido es requerido')
      return
    }

    if (!email.trim()) {
      setError('El email es requerido')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('La contraseña debe contener al menos una mayúscula, una minúscula y un número')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (!birthDay || !birthMonth || !birthYear) {
      setError('La fecha de nacimiento es requerida')
      return
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones')
      return
    }

    try {
      setError('')
      setLoading(true)
      
      const userData = {
        first_name: firstName,
        last_name: lastName,
        birth_day: birthDay,
        birth_month: birthMonth,
        birth_year: birthYear,
        learning_goal: learningGoal
      }
      
      const { error } = await signUp(email, password, userData)
      
      if (error) {
        setError('Error al crear cuenta: ' + translateSupabaseError(error.message))
        return
      }
      
      // Si el registro fue exitoso, navegar al dashboard
      // El ProtectedRoute se encargará de redirigir al cuestionario si es necesario
      navigate('/dashboard')
    } catch (error: any) {
      setError('Error al crear cuenta: ' + translateSupabaseError(error.message))
    } finally {
      setLoading(false)
    }
  }

  // Generar opciones para días, meses y años
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)

  return (
    <Container maxW="4xl" py={{ base: '4', md: '6' }} px={{ base: '4', md: '6' }}>
      <Box
        bg="white"
        p={{ base: '6', md: '8' }}
        borderRadius="xl"
        boxShadow="lg"
        border="1px"
        borderColor="gray.200"
        maxW="900px"
        w="100%"
        mx="auto"
       >
         <VStack spacing="6" w="100%">
           <Heading 
             size="lg" 
             color="gray.700" 
             textAlign="center"
           >
             Crea tu cuenta gratuita
           </Heading>

           {error && (
            <Alert status="error" mb="6" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing="6">
              {/* Nombre y Apellido */}
              <Grid templateColumns="repeat(2, 1fr)" gap="4" w="100%">
                <GridItem>
                  <FormControl isRequired>
                    <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Nombre</FormLabel>
                    <Input
                      placeholder="Juan"
                      value={firstName}
                      onChange={(e) => {
                        const value = e.target.value
                        const capitalized = value
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')
                        setFirstName(capitalized)
                      }}
                      bg="gray.50"
                      border="1px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "gray.400" }}
                      _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                    />
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl isRequired>
                    <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Apellido</FormLabel>
                    <Input
                      placeholder="Pérez"
                      value={lastName}
                      onChange={(e) => {
                        const value = e.target.value
                        const capitalized = value
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')
                        setLastName(capitalized)
                      }}
                      bg="gray.50"
                      border="1px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "gray.400" }}
                      _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                    />
                  </FormControl>
                </GridItem>
              </Grid>

              {/* Email */}
              <FormControl isRequired>
                <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  bg="gray.50"
                  border="1px"
                  borderColor="gray.300"
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                />
                <FormHelperText color="gray.500">
                  Usaremos este email para enviarte actualizaciones de tu progreso
                </FormHelperText>
              </FormControl>

              {/* Contraseñas */}
              <Grid templateColumns="repeat(2, 1fr)" gap="4" w="100%">
                <GridItem>
                  <FormControl isRequired>
                    <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Contraseña</FormLabel>
                    <Input
                      type="password"
                      placeholder="........"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      bg="gray.50"
                      border="1px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "gray.400" }}
                      _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                    />
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl isRequired>
                    <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Confirmar Contraseña</FormLabel>
                    <Input
                      type="password"
                      placeholder="........"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      bg="gray.50"
                      border="1px"
                      borderColor="gray.300"
                      _hover={{ borderColor: "gray.400" }}
                      _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                    />
                  </FormControl>
                </GridItem>
              </Grid>
              <Text fontSize="sm" color="gray.500" w="100%" textAlign="left">
                Mínimo 8 caracteres con mayúsculas, minúsculas y números
              </Text>

              {/* Fecha de Nacimiento */}
              <FormControl isRequired>
                <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Fecha de Nacimiento</FormLabel>
                <Grid templateColumns="repeat(3, 1fr)" gap="4">
                  <Select
                    placeholder="Día"
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    bg="gray.50"
                    border="1px"
                    borderColor="gray.300"
                    _hover={{ borderColor: "gray.400" }}
                    _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </Select>
                  <Select
                    placeholder="Mes"
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    bg="gray.50"
                    border="1px"
                    borderColor="gray.300"
                    _hover={{ borderColor: "gray.400" }}
                    _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                  >
                    {months.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </Select>
                  <Select
                    placeholder="Año"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    bg="gray.50"
                    border="1px"
                    borderColor="gray.300"
                    _hover={{ borderColor: "gray.400" }}
                    _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px teal.500" }}
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </Grid>
              </FormControl>

              {/* Objetivo de Aprendizaje */}
              <FormControl>
                <FormLabel color="gray.700" fontWeight="semibold">¿Cuál es tu principal objetivo de aprendizaje?</FormLabel>
                <RadioGroup value={learningGoal} onChange={setLearningGoal}>
                  <Grid templateColumns="repeat(2, 1fr)" gap="4">
                    <Radio value="desarrollo_academico" colorScheme="teal">
                      Desarrollo académico
                    </Radio>
                    <Radio value="crecimiento_profesional" colorScheme="teal">
                      Crecimiento profesional
                    </Radio>
                    <Radio value="hobby_personal" colorScheme="teal">
                      Hobby personal
                    </Radio>
                    <Radio value="certificacion" colorScheme="teal">
                      Certificación
                    </Radio>
                  </Grid>
                </RadioGroup>
              </FormControl>

              {/* Checkbox de Términos */}
               <Checkbox
                 isChecked={acceptTerms}
                 onChange={(e) => setAcceptTerms(e.target.checked)}
                 colorScheme="teal"
                 isRequired
               >
                 <Text fontSize="sm">
                   Acepto los{' '}
                   <Link to="/terms" style={{ color: '#319795', textDecoration: 'underline' }}>
                     términos y condiciones
                   </Link>
                   {' '}y la{' '}
                   <Link to="/privacy" style={{ color: '#319795', textDecoration: 'underline' }}>
                     política de privacidad
                   </Link>
                   {' '}*
                 </Text>
               </Checkbox>

              {/* Botón de Registro */}
              <Button
                type="submit"
                colorScheme="teal"
                size="lg"
                w="100%"
                isLoading={loading}
                loadingText="Creando cuenta..."
                bg="gray.800"
                color="white"
                _hover={{ bg: "gray.700" }}
                _active={{ bg: "gray.900" }}
                py="6"
                fontSize="md"
                fontWeight="semibold"
              >
                Crear Cuenta Gratuita
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" mt="4" color="gray.600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#319795', textDecoration: 'underline' }}>
              Inicia sesión aquí
            </Link>
          </Text>
        </VStack>
      </Box>
    </Container>
  )
}