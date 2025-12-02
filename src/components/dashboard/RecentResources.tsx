import React from 'react'
import { VStack, HStack, Text, Button, Card, CardBody, SimpleGrid, Icon, Badge, Spinner, useColorModeValue } from '@chakra-ui/react'
import { FiBookOpen } from 'react-icons/fi'
import type { EducationalResource } from '../../services/resources'

interface RecentResourcesProps {
  resources: EducationalResource[]
  loadingResources: boolean
  resourceProgressMap: Record<string, number>
  resourceScoreMap: Record<string, number>
  resourceElementScoresMap?: Record<string, Array<{ element_type: string; element_name: string; points_scored: number }>>
  startedResourceIds: Set<string>
  hasAttemptMap: Record<string, boolean>
  onStart: (resource: EducationalResource, opts?: { forceNewSession?: boolean }) => void
  onReview: (resource: EducationalResource) => void
  onRetake: (resource: EducationalResource) => void
  onViewAll: () => void
  getDifficultyColor: (d: string) => string
  formatDate: (iso: string) => string
}

const RecentResources: React.FC<RecentResourcesProps> = ({ resources, loadingResources, resourceProgressMap, resourceScoreMap, resourceElementScoresMap = {}, startedResourceIds, onStart, onReview, onRetake, onViewAll, getDifficultyColor, formatDate }) => {
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  return (
    <VStack spacing={3} align="stretch">
      <HStack justify="space-between">
        <VStack spacing={0} align="start">
          <Text fontSize="xl" fontWeight="bold">Recursos recientes</Text>
          <Text color="gray.600">Tus últimos materiales creados o actualizados</Text>
        </VStack>
        <Button variant="outline" onClick={onViewAll}>Ver todos</Button>
      </HStack>
      {resources.length === 0 ? (
        loadingResources ? (
          <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <HStack justify="center" py={8}>
                <Spinner />
                <Text color="gray.600">Cargando recursos…</Text>
              </HStack>
            </CardBody>
          </Card>
        ) : (
          <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} py={4}>
                <Icon as={FiBookOpen} boxSize={12} color="gray.400" />
                <Text color="gray.600">Aún no tienes recursos. Crea tu primer recurso con el ícono "Nuevo Recurso".</Text>
              </VStack>
            </CardBody>
          </Card>
        )
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {resources.slice(0, 6).map((resource) => (
            <Card key={resource.id} bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <VStack align="start" spacing={4}>
                  <HStack justify="space-between" w="100%">
                    <Badge colorScheme={getDifficultyColor(resource.difficulty)}>{resource.difficulty}</Badge>
                    <Text fontSize="sm" color="gray.500">{formatDate(resource.created_at)}</Text>
                  </HStack>
                  <VStack align="start" spacing={2} w="100%">
                    <Text fontWeight="bold" fontSize="lg" noOfLines={2} minH="48px">{resource.title}</Text>
                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm" color="gray.700">Progreso: {resourceProgressMap[resource.id] ?? 0}%</Text>
                      <Text fontSize="sm" color="gray.700">Puntuación: {(resourceScoreMap[resource.id] ?? 0)}/200</Text>
                    </HStack>
                    {Array.isArray(resourceElementScoresMap[resource.id]) && (resourceElementScoresMap[resource.id] || []).length > 0 && (
                      <VStack align="stretch" spacing={1} w="100%">
                        <Text fontSize="sm" color="gray.600">Desglose último intento</Text>
                        {(resourceElementScoresMap[resource.id] || []).slice(0, 4).map((row, idx) => (
                          <HStack key={`elms-${resource.id}-${idx}`} justify="space-between" w="100%">
                            <Text fontSize="xs" color="gray.700">{row.element_name}</Text>
                            <Text fontSize="xs" color="gray.700">{Number(row.points_scored).toFixed(2)} / 20</Text>
                          </HStack>
                        ))}
                      </VStack>
                    )}
                    
                  </VStack>
                  <VStack spacing={2} w="100%">
                    <HStack spacing={2} w="100%">
                      <Button size="sm" colorScheme="blue" flex={1} onClick={() => onStart(resource)} isDisabled={startedResourceIds.has(resource.id)}>Comenzar</Button>
                      <Button size="sm" variant="outline" leftIcon={<Icon as={FiBookOpen} />} flex={1} onClick={() => onReview(resource)}>Revisar</Button>
                    </HStack>
                    <HStack spacing={2} w="100%">
                      <Button size="sm" variant="outline" flex={1} onClick={() => onRetake(resource)}>Reintentar</Button>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </VStack>
  )
}

export default RecentResources
