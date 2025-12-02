import { Box, VStack, HStack, Text, Button, Icon } from '@chakra-ui/react'
import { FiPlus, FiBookOpen } from 'react-icons/fi'
import { MdLibraryBooks } from 'react-icons/md'
import type { User } from '@supabase/supabase-js'

interface WelcomeHeroProps {
  user: User | null
  onNewResource: () => void
  onViewAll: () => void
  onViewProgress: () => void
}

export default function WelcomeHero({ user, onNewResource, onViewAll, onViewProgress }: WelcomeHeroProps) {
  const displayName = (() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined
    const full = typeof meta?.full_name === 'string' ? meta!.full_name : ''
    const base = full || (user?.email?.split('@')[0] || '')
    return base.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
  })()

  return (
    <Box bg="linear-gradient(135deg, #000000 0%, #2d2d2d 100%)" color="white" p={8} borderRadius="xl" position="relative" overflow="hidden">
      <VStack spacing={4} align="start">
        <Text fontSize="3xl" fontWeight="bold">¡Bienvenida de vuelta, {displayName}!</Text>
        <Text fontSize="lg" opacity={0.9}>Continúa tu aprendizaje con la metodología MINERVA</Text>
        <HStack spacing={4} mt={6}>
          <Button leftIcon={<Icon as={FiPlus} />} bg="white" color="black" variant="solid" onClick={onNewResource} _hover={{ transform: 'translateY(-2px)', shadow: 'lg', bg: 'gray.100' }} transition="all 0.2s">Nuevo Recurso</Button>
          <Button variant="outline" size="lg" color="white" borderColor="white" leftIcon={<Icon as={MdLibraryBooks} />} onClick={onViewAll} _hover={{ bg: 'whiteAlpha.200' }}>Ver todos</Button>
          <Button variant="outline" size="lg" color="white" borderColor="white" leftIcon={<Icon as={FiBookOpen} />} onClick={onViewProgress} _hover={{ bg: 'whiteAlpha.200' }}>Ver Progreso</Button>
        </HStack>
      </VStack>
    </Box>
  )
}
