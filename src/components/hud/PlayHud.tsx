import { VStack, HStack, Text, Progress } from '@chakra-ui/react'

interface PlayHudProps {
  pct: number
  score: number
}

export default function PlayHud({ pct, score }: PlayHudProps) {
  return (
    <VStack align="stretch" spacing={2}>
      <HStack justify="space-between" align="center">
        <VStack align="stretch" spacing={1} flex={1} mr={4}>
          <Text fontSize="xs" color="gray.600">Progreso: {pct}%</Text>
          <Progress value={pct} size="sm" colorScheme="blue" w="100%" />
        </VStack>
        <Text fontSize="sm" color="gray.700" minW="120px" textAlign="right">Calificación: {score.toFixed(2)} / 200</Text>
      </HStack>
    </VStack>
  )
}
