import { Box, Flex, Text, Image, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorModeValue, useDisclosure } from '@chakra-ui/react'
import logoImage from '../../assets/Logo-IA.png'

import type { User } from '@supabase/supabase-js'
import ProfileModal from '../modals/ProfileModal'

interface AppHeaderProps {
  user: User | null
  onSignOut: () => void
}

export default function AppHeader({ user, onSignOut }: AppHeaderProps) {
  const headerBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const meta = user?.user_metadata as Record<string, unknown> | undefined
  const firstName = typeof meta?.first_name === 'string' ? (meta!.first_name as string) : ''
  const lastName = typeof meta?.last_name === 'string' ? (meta!.last_name as string) : ''
  const email = user?.email || ''
  const userId = user?.id || ''
  return (
    <Box bg={headerBg} borderBottom="1px" borderColor={borderColor} px={6} h="60px" position="sticky" top={0} zIndex={1000} w="100%">
      <Flex justify="space-between" align="center" h="100%">
        <Flex align="center" gap={3}>
          <Image src={logoImage} alt="Learn Playing" height="32px" width="auto" />
          <Text fontSize="xl" fontWeight="bold" color="gray.800">Learn Playing</Text>
        </Flex>
        <Menu>
          <MenuButton as={Box} cursor="pointer" _hover={{ bg: 'gray.50' }} px={3} py={2} borderRadius="md" transition="all 0.2s" minW="fit-content" w="auto" height="40px">
            <Flex direction="row" align="center" gap={2} height="100%">
              <Avatar size="sm" name={`${firstName || ''} ${lastName || ''}`.trim() || email} bg="blue.500" flexShrink={0} />
              <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap" flexShrink={0}>
                {(() => {
                  const base = firstName || (email.split('@')[0] || '')
                  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase()
                })()}
              </Text>
              <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap" flexShrink={0}>
                {(() => {
                  const ln = lastName
                  return ln ? ln.charAt(0).toUpperCase() + ln.slice(1).toLowerCase() : ''
                })()}
              </Text>
            </Flex>
          </MenuButton>
          <MenuList>
            <MenuItem onClick={onOpen}>Perfil</MenuItem>
            <MenuItem onClick={onSignOut}>Cerrar Sesión</MenuItem>
          </MenuList>
        </Menu>
      </Flex>
      <ProfileModal isOpen={isOpen} onClose={onClose} userId={userId} userEmail={email} firstName={firstName} lastName={lastName} />
    </Box>
  )
}
