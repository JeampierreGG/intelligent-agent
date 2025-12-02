import React from 'react'
import { SimpleGrid, Card, CardBody, VStack, HStack, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import { FiBookOpen, FiAward } from 'react-icons/fi'

interface StatsWidgetsProps {
  totalResourcesCount: number
  totalBestPoints: number
}

const StatsWidgets: React.FC<StatsWidgetsProps> = ({ totalResourcesCount, totalBestPoints }) => {
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
      <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <VStack spacing={3} align="start">
            <HStack>
              <Icon as={FiBookOpen} color="blue.500" boxSize={6} />
              <Text fontWeight="semibold">Recursos Creados</Text>
            </HStack>
            <Text fontSize="2xl" fontWeight="bold">{totalResourcesCount}</Text>
            <Text fontSize="sm" color="gray.600">Materiales de estudio generados</Text>
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
            <Text fontSize="2xl" fontWeight="bold">{totalBestPoints}</Text>
            <Text fontSize="sm" color="gray.600">Puntos acumulados jugando</Text>
          </VStack>
        </CardBody>
      </Card>
    </SimpleGrid>
  )
}

export default StatsWidgets

