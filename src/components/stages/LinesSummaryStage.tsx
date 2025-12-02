import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'

interface LinesSummaryStageProps {
  results: Array<{ term: string; chosen?: string; expected: string; correct: boolean }>
  continueLabel?: string
  onContinue: () => void
}

export default function LinesSummaryStage({ results, continueLabel, onContinue }: LinesSummaryStageProps) {
  return (
    <VStack align="stretch" spacing={3}>
      <Text fontWeight="semibold">Unir parejas — Resumen</Text>
      {results.map((r, idx) => (
        <Box key={`lines-sum-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
          <Text fontSize="sm"><strong>{r.term}</strong> → {r.chosen || 'Sin respuesta'}</Text>
          {!r.correct && (
            <Text fontSize="xs" color="red.600">Correcta: {r.expected}</Text>
          )}
        </Box>
      ))}
      <HStack justify="flex-end" mt={2}>
        <Button colorScheme="blue" onClick={onContinue}>{continueLabel || 'Continuar'}</Button>
      </HStack>
    </VStack>
  )
}
