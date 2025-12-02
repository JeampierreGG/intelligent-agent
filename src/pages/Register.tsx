import React, { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { translateSupabaseError } from '../utils/errorTranslations'
import { type UserProfileData } from '../services/userProfileService'
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
  Checkbox,
  VStack,
  FormHelperText,
  FormErrorMessage,
  Link,
  InputGroup,
  InputRightElement,
  IconButton
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [academicLevel, setAcademicLevel] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [firstNameTouched, setFirstNameTouched] = useState(false)
  const [lastNameTouched, setLastNameTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [birthDayTouched, setBirthDayTouched] = useState(false)
  const [birthMonthTouched, setBirthMonthTouched] = useState(false)
  const [birthYearTouched, setBirthYearTouched] = useState(false)
  const [academicTouched, setAcademicTouched] = useState(false)
  const [termsTouched, setTermsTouched] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones
    const nameSanitized = firstName.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\-\s]/g, ' ').trim()
    const lastSanitized = lastName.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\-\s]/g, ' ').trim()
    if (!nameSanitized) {
      setError('El nombre es requerido')
      return
    }

    if (!lastSanitized) {
      setError('El apellido es requerido')
      return
    }

    const emailSan = email.trim().toLowerCase()
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSan)
    if (!emailSan) { setError('El email es requerido'); return }
    if (!emailOk) { setError('Ingresa un email válido'); return }

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
    const yy = Number(birthYear)
    const mm = Number(birthMonth)
    const dd = Number(birthDay)
    const nowY = new Date().getFullYear()
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) {
      setError('Fecha de nacimiento inválida')
      return
    }
    if (yy < nowY - 100 || yy > nowY - 10 || mm < 1 || mm > 12 || dd < 1 || dd > 31) {
      setError('Fecha de nacimiento inválida')
      return
    }
    const d = new Date(yy, mm - 1, dd)
    if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) {
      setError('Fecha de nacimiento inválida')
      return
    }

    const now = new Date()
    let age = now.getFullYear() - yy
    const mNow = now.getMonth() + 1
    const dNow = now.getDate()
    if (mNow < mm || (mNow === mm && dNow < dd)) age -= 1
    if (age < 10) {
      setError('La edad mínima es 10 años')
      return
    }

    if (!academicLevel) {
      setError('Selecciona tu nivel académico')
      return
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones')
      return
    }

    try {
      setError('')
      setLoading(true)
      
      const userData: UserProfileData = {
        first_name: firstName,
        last_name: lastName,
        birth_day: birthDay,
        birth_month: birthMonth,
        birth_year: birthYear,
        academic_level: academicLevel
      }
      
      const { error } = await signUp(emailSan, password, userData)
      
      if (error) {
        setError('Error al crear cuenta: ' + translateSupabaseError(error.message))
        return
      }
      
      // Si el registro fue exitoso, navegar directamente al dashboard
      navigate('/dashboard')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError('Error al crear cuenta: ' + translateSupabaseError(errorMessage))
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

  const nameValid = !!firstName.trim()
  const lastValid = !!lastName.trim()
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())
  const passwordValid = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(password)
  const confirmValid = password === confirmPassword && passwordValid
  const yyN = Number(birthYear)
  const mmN = Number(birthMonth)
  const ddN = Number(birthDay)
  const dateValid = Number.isFinite(yyN) && Number.isFinite(mmN) && Number.isFinite(ddN) && yyN >= currentYear - 100 && yyN <= currentYear - 3 && mmN >= 1 && mmN <= 12 && ddN >= 1 && ddN <= 31 && (new Date(yyN, mmN - 1, ddN)).getFullYear() === yyN && (new Date(yyN, mmN - 1, ddN)).getMonth() === mmN - 1 && (new Date(yyN, mmN - 1, ddN)).getDate() === ddN
  const ageYears = (() => {
    if (!dateValid) return -1
    const now = new Date()
    let age = now.getFullYear() - yyN
    const m = now.getMonth() + 1
    const d = now.getDate()
    if (m < mmN || (m === mmN && d < ddN)) age -= 1
    return age
  })()
  const birthValid = dateValid && ageYears >= 10
  const birthTouched = birthDayTouched || birthMonthTouched || birthYearTouched
  const academicValid = !!academicLevel
  const termsValid = !!acceptTerms
  const formValid = nameValid && lastValid && emailValid && passwordValid && confirmValid && birthValid && academicValid && termsValid

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

          <form onSubmit={handleSubmit} noValidate>
            <VStack spacing="6">
              {/* Nombre y Apellido */}
              <Grid templateColumns="repeat(2, 1fr)" gap="4" w="100%">
                <GridItem>
                  <FormControl isRequired isInvalid={firstNameTouched && !nameValid}>
                    <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Nombre</FormLabel>
                    <Input
                      placeholder="Juan"
                      value={firstName}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\-\s]/g, '')
                        const capitalized = value
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')
                        setFirstName(capitalized)
                      }}
                      onBlur={() => setFirstNameTouched(true)}
                      aria-invalid={firstNameTouched && !nameValid}
                      inputMode="text"
                      pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ\-\s]+"
                      bg="gray.50"
                      border="1px"
                      borderColor={firstNameTouched && !nameValid ? 'red.500' : 'gray.300'}
                      _hover={{ borderColor: "gray.400" }}
                      _focus={{ borderColor: firstNameTouched && !nameValid ? "red.500" : "teal.500", boxShadow: firstNameTouched && !nameValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
                    />
                    <FormErrorMessage>El nombre es requerido y solo debe contener letras</FormErrorMessage>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl isRequired isInvalid={lastNameTouched && !lastValid}>
                    <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Apellido</FormLabel>
                    <Input
                      placeholder="Pérez"
                      value={lastName}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\-\s]/g, '')
                        const capitalized = value
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')
                        setLastName(capitalized)
                      }}
                      onBlur={() => setLastNameTouched(true)}
                      aria-invalid={lastNameTouched && !lastValid}
                      inputMode="text"
                      pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ\-\s]+"
                      bg="gray.50"
                      border="1px"
                      borderColor={lastNameTouched && !lastValid ? 'red.500' : 'gray.300'}
                      _hover={{ borderColor: "gray.400" }}
                      _focus={{ borderColor: lastNameTouched && !lastValid ? "red.500" : "teal.500", boxShadow: lastNameTouched && !lastValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
                    />
                    <FormErrorMessage>El apellido es requerido y solo debe contener letras</FormErrorMessage>
                  </FormControl>
                </GridItem>
              </Grid>

              {/* Email */}
              <FormControl isRequired isInvalid={emailTouched && !emailValid}>
                <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  aria-invalid={emailTouched && !emailValid}
                  bg="gray.50"
                  border="1px"
                  borderColor={emailTouched && !emailValid ? 'red.500' : 'gray.300'}
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: emailTouched && !emailValid ? "red.500" : "teal.500", boxShadow: emailTouched && !emailValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
                />
                <FormHelperText color="gray.500">
                  Usaremos este email para enviarte actualizaciones de tu progreso
                </FormHelperText>
                <FormErrorMessage>Ingresa un email válido</FormErrorMessage>
              </FormControl>

              {/* Contraseñas */}
              <Grid templateColumns="repeat(2, 1fr)" gap="4" w="100%">
                <GridItem>
                  <FormControl isRequired isInvalid={passwordTouched && !passwordValid}>
                    <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Contraseña</FormLabel>
                    <InputGroup>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="........"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setPasswordTouched(true)}
                        aria-invalid={passwordTouched && !passwordValid}
                        bg="gray.50"
                        border="1px"
                        borderColor={passwordTouched && !passwordValid ? 'red.500' : 'gray.300'}
                        _hover={{ borderColor: "gray.400" }}
                        _focus={{ borderColor: passwordTouched && !passwordValid ? "red.500" : "teal.500", boxShadow: passwordTouched && !passwordValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
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
                    <FormErrorMessage>Debe tener al menos 8 caracteres con mayúsculas, minúsculas y números</FormErrorMessage>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl isRequired isInvalid={confirmTouched && !confirmValid}>
                    <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Confirmar Contraseña</FormLabel>
                    <InputGroup>
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="........"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setConfirmTouched(true)}
                        aria-invalid={confirmTouched && !confirmValid}
                        bg="gray.50"
                        border="1px"
                        borderColor={confirmTouched && !confirmValid ? 'red.500' : 'gray.300'}
                        _hover={{ borderColor: "gray.400" }}
                        _focus={{ borderColor: confirmTouched && !confirmValid ? "red.500" : "teal.500", boxShadow: confirmTouched && !confirmValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
                      />
                      <InputRightElement>
                        <IconButton
                          aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          icon={showConfirm ? <ViewOffIcon /> : <ViewIcon />}
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowConfirm((v) => !v)}
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>Las contraseñas no coinciden</FormErrorMessage>
                  </FormControl>
                </GridItem>
              </Grid>
              <Text fontSize="sm" color="gray.500" w="100%" textAlign="left">
                Mínimo 8 caracteres con mayúsculas, minúsculas y números
              </Text>

              {/* Fecha de Nacimiento */}
              <FormControl isRequired isInvalid={birthTouched && !birthValid}>
                <FormLabel color="gray.700" fontWeight="semibold" _after={{ color: "black" }}>Fecha de Nacimiento</FormLabel>
                <Grid templateColumns="repeat(3, 1fr)" gap="4">
                  <Select
                    id="birth-day-select"
                    placeholder="Día"
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    onBlur={() => setBirthDayTouched(true)}
                    aria-invalid={birthTouched && !birthValid}
                    bg="gray.50"
                    border="1px"
                    borderColor={birthTouched && !birthValid ? 'red.500' : 'gray.300'}
                    _hover={{ borderColor: "gray.400" }}
                    _focus={{ borderColor: birthTouched && !birthValid ? "red.500" : "teal.500", boxShadow: birthTouched && !birthValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </Select>
                  <Select
                    id="birth-month-select"
                    placeholder="Mes"
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    onBlur={() => setBirthMonthTouched(true)}
                    aria-invalid={birthTouched && !birthValid}
                    bg="gray.50"
                    border="1px"
                    borderColor={birthTouched && !birthValid ? 'red.500' : 'gray.300'}
                    _hover={{ borderColor: "gray.400" }}
                    _focus={{ borderColor: birthTouched && !birthValid ? "red.500" : "teal.500", boxShadow: birthTouched && !birthValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
                  >
                    {months.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </Select>
                  <Select
                    id="birth-year-select"
                    placeholder="Año"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    onBlur={() => setBirthYearTouched(true)}
                    aria-invalid={birthTouched && !birthValid}
                    bg="gray.50"
                    border="1px"
                    borderColor={birthTouched && !birthValid ? 'red.500' : 'gray.300'}
                    _hover={{ borderColor: "gray.400" }}
                    _focus={{ borderColor: birthTouched && !birthValid ? "red.500" : "teal.500", boxShadow: birthTouched && !birthValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </Grid>
                <FormErrorMessage>Fecha de nacimiento inválida. La edad mínima es 10 años.</FormErrorMessage>
              </FormControl>

              {/* Nivel Académico */}
              <FormControl isRequired isInvalid={academicTouched && !academicValid}>
                <FormLabel color="gray.700" fontWeight="semibold">Nivel académico</FormLabel>
                <Select
                  placeholder="Selecciona tu nivel académico"
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  onBlur={() => setAcademicTouched(true)}
                  aria-invalid={academicTouched && !academicValid}
                  bg="gray.50"
                  border="1px"
                  borderColor={academicTouched && !academicValid ? 'red.500' : 'gray.300'}
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: academicTouched && !academicValid ? "red.500" : "teal.500", boxShadow: academicTouched && !academicValid ? "0 0 0 1px red.500" : "0 0 0 1px teal.500" }}
                >
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Preuniversitario">Preuniversitario</option>
                  <option value="Universitario">Universitario</option>
                  <option value="Posgrado">Posgrado</option>
                </Select>
                <FormErrorMessage>Selecciona tu nivel académico</FormErrorMessage>
              </FormControl>

              {/* Checkbox de Términos */}
              <FormControl isRequired isInvalid={termsTouched && !termsValid}>
                <Checkbox
                  isChecked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  onBlur={() => setTermsTouched(true)}
                  colorScheme="teal"
                >
                  <Text fontSize="sm">
                    Acepto los{' '}
                    <Link as={RouterLink} to="/terms" color="teal.500" textDecoration="underline">
                      términos y condiciones
                    </Link>
                    {' '}y la{' '}
                    <Link as={RouterLink} to="/privacy" color="teal.500" textDecoration="underline">
                      política de privacidad
                    </Link>
                    {' '}*
                  </Text>
                </Checkbox>
                <FormErrorMessage>Debes aceptar los términos y condiciones y la política de privacidad</FormErrorMessage>
              </FormControl>

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
                isDisabled={loading || !formValid}
              >
                Crear Cuenta Gratuita
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" mt="4" color="gray.600">
            ¿Ya tienes cuenta?{' '}
            <Link as={RouterLink} to="/login" color="teal.500" textDecoration="underline">
              Inicia sesión aquí
            </Link>
          </Text>
        </VStack>
      </Box>
    </Container>
  )
}
