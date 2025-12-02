import { Box, VStack, Flex, Text, Icon, useColorModeValue } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'

interface SidebarItem {
  id: string
  label: string
  icon: IconType
  to: string
}

interface AppSidebarProps {
  items: SidebarItem[]
  locked?: boolean
  onLockedNavigate?: (to: string) => void
}

export default function AppSidebar({ items, locked, onLockedNavigate }: AppSidebarProps) {
  const sidebarBg = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const navigate = useNavigate()
  return (
    <Box bg={sidebarBg} borderRight="1px" borderColor={borderColor} w="250px" h="calc(100vh - 60px)" position="sticky" top="60px" p={4}>
      <VStack spacing={2} align="stretch">
        {items.map((item) => (
          <Flex key={item.id} align="center" gap={3} px={4} py={3} borderRadius="lg" cursor="pointer" color={'gray.600'} _hover={{ bg: 'gray.100' }} transition="all 0.2s" onClick={() => { try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch (err) { console.warn('scroll error:', err) } ; if (locked) { if (onLockedNavigate) { onLockedNavigate(item.to) } return } ; navigate(item.to) }} w="full">
            <Icon as={item.icon} boxSize={5} />
            <Text fontSize="sm" fontWeight={'medium'}>{item.label}</Text>
          </Flex>
        ))}
      </VStack>
    </Box>
  )
}
