import React from 'react'
import { VStack, HStack, Text, Button, Card, CardBody, SimpleGrid, Icon, Spinner, useColorModeValue } from '@chakra-ui/react'
import { FiBookOpen } from 'react-icons/fi'
import type { EducationalResource } from '../../services/resources'
import ResourceCard from '../resources/ResourceCard'

interface RecentResourcesProps {
  resources: EducationalResource[]
  loadingResources: boolean
  resourceProgressMap: Record<string, number>
  resourceScoreMap: Record<string, number>
  startedResourceIds: Set<string>
  hasAttemptMap: Record<string, boolean>
  onStart: (resource: EducationalResource, opts?: { forceNewSession?: boolean }) => void
  onReview: (resource: EducationalResource) => void
  onRetake: (resource: EducationalResource) => void
  onViewAll: () => void
}

const RecentResources: React.FC<RecentResourcesProps> = ({ resources, loadingResources, resourceProgressMap, resourceScoreMap, onStart, onReview, onRetake, onViewAll }) => {
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
      ) : (() => {
        const sorted = [...resources].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const top6 = sorted.slice(0, 6)
        const ready = top6.every(r => resourceScoreMap[r.id] != null && resourceProgressMap[r.id] != null)
        if (!ready) {
          return (
            <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <HStack justify="center" py={8}>
                  <Spinner />
                  <Text color="gray.600">Cargando tus últimos recursos…</Text>
                </HStack>
              </CardBody>
            </Card>
          )
        }
        return (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {top6.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                progress={resourceProgressMap[resource.id] ?? 0}
                score={resourceScoreMap[resource.id] ?? 0}
                disableStart={(resourceProgressMap[resource.id] ?? 0) > 0}
                disableRetake={(resourceProgressMap[resource.id] ?? 0) === 0} 
                onStart={(r) => onStart(r)}
                onReview={(r) => onReview(r)}
                onRetake={(r) => onRetake(r)}
              />
            ))}
          </SimpleGrid>
        )
      })()}
    </VStack>
  )
}

export default RecentResources
