import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'

interface FindTheMatchSummaryStageProps {
  results: Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>
  omitted?: boolean
  continueLabel?: string
  onContinue: () => void
}

export default function FindTheMatchSummaryStage({ results, omitted, continueLabel, onContinue }: FindTheMatchSummaryStageProps) {
  const display = omitted ? results.filter(r => r.correct || r.chosen == null) : results
  return (
    <VStack align="stretch" spacing={3}>
      <Text fontWeight="semibold">Cada oveja con su pareja — Resumen</Text>
      {display.map((r, idx) => (
        <Box key={`ftm-sum-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
          <Text fontSize="sm" noOfLines={2}><strong>{r.concept}</strong> → {r.chosen || 'Sin respuesta'}</Text>
          {!r.correct && (
            <Text fontSize="xs" color="red.600" noOfLines={2}>Correcta: {r.expected}</Text>
          )}
        </Box>
      ))}
      <HStack justify="flex-end" mt={2}>
        <Button colorScheme="blue" onClick={onContinue}>{continueLabel || 'Continuar'}</Button>
      </HStack>
    </VStack>
  )
}
