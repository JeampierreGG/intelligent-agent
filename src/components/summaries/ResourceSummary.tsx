import { Box, VStack, HStack, Text, SimpleGrid, Button } from '@chakra-ui/react'

interface BreakdownItem { name: string; contribution: number; weight: number }

interface OpenBoxResult {
  question: string
  options: string[]
  chosenIndex: number
  correctIndex: number
  chosenText: string
  correctText: string
  correct: boolean
  explanation?: string
}

interface FindMatchResult { concept: string; chosen?: string; expected: string; correct: boolean }
interface QuizResult { prompt: string; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }
interface GroupSortItem { item: string; chosenGroup?: string; expectedGroup: string; correct: boolean }
interface LineResult { term: string; chosen?: string; expected: string; correct: boolean }
interface AnagramResult { answer: string; userAnswer: string; correct: boolean; clue?: string }

interface ResourceSummaryProps {
  score: number
  breakdown: BreakdownItem[]
  openBoxResults: OpenBoxResult[]
  findMatchResults: FindMatchResult[]
  quizResults: QuizResult[]
  groupSortResults: GroupSortItem[]
  groupNames: string[]
  linesResults: LineResult[]
  anagramResults: AnagramResult[]
  debateLevel?: number
  onExit: () => void
  onRetry: () => void
}

export default function ResourceSummary({ score, breakdown, openBoxResults, findMatchResults, quizResults, groupSortResults, groupNames, linesResults, anagramResults, debateLevel, onExit, onRetry }: ResourceSummaryProps) {
  const validNames = (groupNames || []).slice(0, 2).filter(n => !!n)
  const grouped: Record<string, Array<{ item: string; correct: boolean; expectedGroup: string }>> = {}
  validNames.forEach(name => { grouped[name] = [] })
  groupSortResults.forEach(r => {
    const key = r.chosenGroup || ''
    if (!key) return
    if (!validNames.includes(key)) return
    grouped[key].push({ item: r.item, correct: r.correct, expectedGroup: r.expectedGroup })
  })

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="lg" fontWeight="bold">Resumen del recurso</Text>
      <Box p={3} borderWidth="1px" borderRadius="md" bg="blue.50" borderColor="blue.200">
        <HStack justify="space-between" align="center">
          <Text fontSize="md" fontWeight="semibold" color="blue.800">Puntuación final</Text>
          <Text fontSize="xl" fontWeight="bold" color="blue.900">{score.toFixed(2)} / 200</Text>
        </HStack>
        <HStack justify="space-between" align="center">
          <Text fontSize="sm" color="gray.700">Nivel de debate</Text>
          <Text fontSize="sm" color="gray.800">{typeof debateLevel === 'number' ? debateLevel : 0}</Text>
        </HStack>
        {breakdown.length > 0 && (
          <VStack align="stretch" spacing={1} mt={2}>
            {breakdown.map((b, idx) => (
              <HStack key={`sum-br-${idx}`} justify="space-between">
                <Text fontSize="sm" color="gray.800">{b.name}</Text>
                <Text fontSize="sm" color="gray.700">{b.contribution.toFixed(2)} / {b.weight.toFixed(2)} pts</Text>
              </HStack>
            ))}
          </VStack>
        )}
      </Box>

      {openBoxResults.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text fontWeight="semibold">Abrecajas</Text>
          {openBoxResults.map((r, idx) => (
            <Box key={`sum-otb-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
              <Text fontSize="sm"><strong>{r.question}</strong></Text>
              <Text fontSize="sm">Tu respuesta: {r.chosenText || 'Sin respuesta'}</Text>
              {!r.correct && (<Text fontSize="xs" color="red.600">Correcta: {r.correctText}</Text>)}
              {r.explanation && (<Text fontSize="xs" color="gray.600">Explicación: {r.explanation}</Text>)}
            </Box>
          ))}
        </VStack>
      )}

      {findMatchResults.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text fontWeight="semibold">Cada oveja con su pareja</Text>
          {findMatchResults.map((r, idx) => (
            <Box key={`sum-ftm-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
              <Text fontSize="sm"><strong>{r.concept}</strong> → {r.chosen || 'Sin respuesta'}</Text>
              {!r.correct && (<Text fontSize="xs" color="red.600">Correcta: {r.expected}</Text>)}
            </Box>
          ))}
        </VStack>
      )}

      {quizResults.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text fontWeight="semibold">Quiz</Text>
          {quizResults.map((q, idx) => (
            <Box key={`sum-quiz-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={q.correct ? 'green.300' : 'red.300'} bg={q.correct ? 'green.50' : 'red.50'}>
              <Text fontSize="sm"><strong>{q.prompt}</strong></Text>
              <Text fontSize="sm">Tu respuesta: {q.chosenText || 'Sin respuesta'}</Text>
              {!q.correct && (<Text fontSize="xs" color="red.600">Correcta: {q.correctText}</Text>)}
              {q.explanation && (<Text fontSize="xs" color="gray.600">Explicación: {q.explanation}</Text>)}
            </Box>
          ))}
        </VStack>
      )}

      {groupSortResults.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text fontWeight="semibold">Ordenar por grupo</Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {Object.entries(grouped).map(([grp, items]) => (
              <Box key={`sum-gs-grp-${grp}`} p={3} borderWidth="1px" borderRadius="md">
                <Text fontWeight="semibold" mb={2}>{grp}</Text>
                <HStack flexWrap="wrap" gap={2}>
                  {items.length === 0 && (<Text fontSize="sm" color="gray.500">(sin elementos)</Text>)}
                  {items.map((it, iidx) => (
                    <Box key={`sum-gs-item-${grp}-${iidx}`} px={2} py={1} borderWidth="1px" borderRadius="md" borderColor={it.correct ? 'green.300' : 'red.300'} bg={it.correct ? 'green.50' : 'red.50'}>
                      <Text fontSize="sm">{it.item}</Text>
                      {!it.correct && (<Text fontSize="xs" color="red.600">Correcto: {it.expectedGroup}</Text>)}
                    </Box>
                  ))}
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      )}

      {linesResults.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text fontWeight="semibold">Unir parejas</Text>
          {linesResults.map((r, idx) => (
            <Box key={`sum-line-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
              <Text fontSize="sm"><strong>{r.term}</strong> → {r.chosen || 'Sin respuesta'}</Text>
              {!r.correct && (<Text fontSize="xs" color="red.600">Correcta: {r.expected}</Text>)}
            </Box>
          ))}
        </VStack>
      )}

      {anagramResults.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text fontWeight="semibold">Anagrama</Text>
          {anagramResults.map((a, idx) => (
            <Box key={`sum-an-${idx}`} p={2} borderWidth="1px" borderRadius="md" borderColor={a.correct ? 'green.300' : 'red.300'} bg={a.correct ? 'green.50' : 'red.50'}>
              <Text fontSize="sm">Tu respuesta: {a.userAnswer || 'Sin respuesta'}</Text>
              {!a.correct && (<Text fontSize="xs" color="red.600">Correcta: {a.answer}</Text>)}
              {a.clue && (<Text fontSize="xs" color="gray.600">Pista: {a.clue}</Text>)}
            </Box>
          ))}
        </VStack>
      )}

      <HStack>
        <Button colorScheme="blue" onClick={onExit}>Salir</Button>
        <Button variant="outline" onClick={onRetry}>Reintentar</Button>
      </HStack>
    </VStack>
  )
}
