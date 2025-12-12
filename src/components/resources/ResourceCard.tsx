import { Card, CardBody, VStack, HStack, Text, Button, Icon, Badge, useColorModeValue } from '@chakra-ui/react'
import { FiBookOpen } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import type { EducationalResource } from '../../services/resources'

interface ResourceCardProps {
  resource: EducationalResource
  progress: number
  score: number
  disableStart?: boolean
  disableRetake?: boolean 
  onStart?: (resource: EducationalResource) => void
  onReview?: (resource: EducationalResource) => void
  onRetake?: (resource: EducationalResource) => void
}

export default function ResourceCard({ resource, progress, score, disableStart,disableRetake, onStart, onReview, onRetake }: ResourceCardProps) {
  const navigate = useNavigate()
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Básico': return 'green'
      case 'Intermedio': return 'yellow'
      case 'Avanzado': return 'red'
      default: return 'gray'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const handleStart = () => {
    if (onStart) {
      onStart(resource)
    } else {
      navigate(`/play/${resource.id}`)
    }
  }

  const handleReview = () => {
    if (onReview) {
      onReview(resource)
    } else {
      navigate(`/review/${resource.id}`)
    }
  }

  const handleRetake = () => {
    if (onRetake) {
      onRetake(resource)
    } else {
      navigate(`/play/${resource.id}?new=1`)
    }
  }

const isStartDisabled = disableStart ?? (progress > 0);



  return (
    <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor} _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.2s">
      <CardBody>
        <VStack align="start" spacing={4}>
          <HStack justify="space-between" w="100%">
            <Badge colorScheme={getDifficultyColor(resource.difficulty)}>{resource.difficulty}</Badge>
            <Text fontSize="sm" color="gray.500">{formatDate(resource.created_at)}</Text>
          </HStack>
          <VStack align="start" spacing={2} w="100%">
            <Text fontWeight="bold" fontSize="lg" noOfLines={2} minH="48px" color="gray.800">{resource.title}</Text>
            <HStack justify="space-between" w="100%">
              <Text fontSize="sm" color="gray.700">Progreso: {progress}%</Text>
              <Text fontSize="sm" color="gray.700">Puntuación: {score}/200</Text>
            </HStack>
          </VStack>
          <VStack spacing={2} w="100%">
            <HStack spacing={2} w="100%">
              <Button size="sm" colorScheme="blue" flex={1} onClick={handleStart} isDisabled={isStartDisabled}>Comenzar</Button>
              <Button size="sm" variant="outline" leftIcon={<Icon as={FiBookOpen} />} flex={1} onClick={handleReview}>Revisar</Button>
            </HStack>
            <HStack spacing={2} w="100%">
              <Button size="sm" variant="outline" flex={1} onClick={handleRetake}  isDisabled={disableRetake} >Reintentar</Button>
            </HStack>
          </VStack>
        </VStack>
      </CardBody>
    </Card>
  )
}

