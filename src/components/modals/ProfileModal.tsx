import { useEffect, useMemo, useState } from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, FormControl, FormLabel, Input, Select, FormErrorMessage, useToast, Grid, GridItem } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { userProfileService, type UserProfile } from '../../services/userProfileService'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  userEmail?: string
  firstName?: string
  lastName?: string
}

const levels = ['Primaria', 'Secundaria', 'Preuniversitario', 'Universitario', 'Posgrado']

export default function ProfileModal({ isOpen, onClose, userId, userEmail, firstName, lastName }: ProfileModalProps) {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [academicLevel, setAcademicLevel] = useState('')
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const birthDateText = useMemo(() => {
    if (!profile?.fecha_nacimiento) return ''
    try {
      const d = new Date(profile.fecha_nacimiento)
      const yy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yy}-${mm}-${dd}`
    } catch {
      return profile.fecha_nacimiento
    }
  }, [profile])

  const passwordValid = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(password)

  useEffect(() => {
    const load = async () => {
      if (!userId) return
      try {
        const p = await userProfileService.getUserProfile(userId)
        setProfile(p)
        setAcademicLevel(p?.nivel_academico || '')
      } catch {
        setProfile(null)
        setAcademicLevel('')
      }
    }
    if (isOpen) void load()
  }, [isOpen, userId])

  const handleCancel = () => {
    onClose()
    navigate('/dashboard')
    toast({ title: 'Los cambios No se guardaron.', status: 'warning', duration: 3000, isClosable: true })
  }

  const handleSave = async () => {
    if (!userId) return
    try {
      setLoading(true)
      if (password && !passwordValid) {
        setPasswordTouched(true)
        return
      }
      if (password) {
        await supabase.auth.updateUser({ password })
      }
      if (academicLevel && academicLevel !== profile?.nivel_academico) {
        await userProfileService.updateUserProfile(userId, { academic_level: academicLevel })
      }
      onClose()
      navigate('/dashboard')
      toast({ title: 'Cambios Guardados correctamente.', status: 'success', duration: 3000, isClosable: true })
    } catch {
      toast({ title: 'Error al guardar cambios.', status: 'error', duration: 3000, isClosable: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="4xl">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>Perfil</ModalHeader>
        <ModalBody>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
            <GridItem>
              <FormControl>
                <FormLabel>Nombre</FormLabel>
                <Input value={firstName || ''} isDisabled />
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl>
                <FormLabel>Apellido</FormLabel>
                <Input value={lastName || ''} isDisabled />
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input value={userEmail || ''} isDisabled />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isInvalid={passwordTouched && !passwordValid}>
                <FormLabel>Contraseña</FormLabel>
                <Input type="password" placeholder="********" value={password} onChange={e => setPassword(e.target.value)} onBlur={() => setPasswordTouched(true)} />
                <FormErrorMessage>Debe tener al menos 8 caracteres con mayúsculas, minúsculas y números</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl>
                <FormLabel>Fecha de nacimiento</FormLabel>
                <Input value={birthDateText} isDisabled />
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl>
                <FormLabel>Nivel académico</FormLabel>
                <Select placeholder="Selecciona tu nivel académico" value={academicLevel} onChange={e => setAcademicLevel(e.target.value)}>
                  {levels.map(l => (<option key={l} value={l}>{l}</option>))}
                </Select>
              </FormControl>
            </GridItem>
          </Grid>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={handleCancel} variant="ghost">Cancelar</Button>
          <Button bg="#000000" color="white" onClick={handleSave} isLoading={loading} _hover={{ bg: '#000000' }} _active={{ bg: '#000000' }} transition="none">Guardar cambios</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
