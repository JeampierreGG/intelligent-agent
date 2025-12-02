import { Box, Button, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'

interface GroupSortSummaryStageProps {
  results: Array<{ item: string; chosenGroup?: string; expectedGroup: string; correct: boolean }>
  continueLabel?: string
  onContinue: () => void
}

export default function GroupSortSummaryStage({ results, continueLabel, onContinue }: GroupSortSummaryStageProps) {
  const expected = Array.from(new Set(results.map(r => (r.expectedGroup || '').trim()).filter(n => !!n))).slice(0, 2)
  const grouped: Record<string, Array<{ item: string; correct: boolean; expectedGroup: string }>> = {}
  expected.forEach(n => { grouped[n] = [] })
  results.forEach(r => {
    const key = r.chosenGroup || ''
    if (!key) return
    if (!expected.includes(key)) return
    grouped[key].push({ item: r.item, correct: r.correct, expectedGroup: r.expectedGroup })
  })

  return (
    <VStack align="stretch" spacing={3}>
      <Text fontWeight="semibold">Ordenar por grupo — Resumen</Text>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {Object.entries(grouped).map(([grp, items]) => (
          <Box key={`gs-sum-${grp}`} p={3} borderWidth="1px" borderRadius="md">
            <Text fontWeight="semibold" mb={2}>{grp}</Text>
            <HStack flexWrap="wrap" gap={2}>
              {items.length === 0 && (<Text fontSize="sm" color="gray.500">(sin elementos)</Text>)}
              {items.map((it, iidx) => (
                <Box key={`gs-sum-item-${grp}-${iidx}`} px={2} py={1} borderWidth="1px" borderRadius="md" borderColor={it.correct ? 'green.300' : 'red.300'} bg={it.correct ? 'green.50' : 'red.50'}>
                  <Text fontSize="sm">{it.item}</Text>
                  {!it.correct && (
                    <Text fontSize="xs" color="red.600">Correcto: {it.expectedGroup}</Text>
                  )}
                </Box>
              ))}
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
      <HStack justify="flex-end" mt={2}>
        <Button colorScheme="blue" onClick={onContinue}>{continueLabel || 'Continuar'}</Button>
      </HStack>
    </VStack>
  )
}
