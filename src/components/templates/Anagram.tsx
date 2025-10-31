import React, { useMemo, useState } from 'react'
import { Box, Button, HStack, Input, Text, VStack, Tag, TagLabel, Spacer } from '@chakra-ui/react'
import type { AnagramContent } from '../../services/types'

export interface AnagramProps {
  content: AnagramContent
  onComplete?: (details: Array<{ answer: string; userAnswer: string; correct: boolean; clue?: string }>) => void
  renderContinueButton?: React.ReactNode
}

function normalize(s: string) {
  return (s || '').toLowerCase().trim()
}

const Anagram: React.FC<AnagramProps> = ({ content, onComplete, renderContinueButton }) => {
  const items = useMemo(() => content.items || [], [content.items])
  const [inputs, setInputs] = useState<string[]>(items.map(() => ''))
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false))
  const [results, setResults] = useState<boolean[]>(items.map(() => false))
  const [finished, setFinished] = useState<boolean>(false)

  const checkItem = (idx: number) => {
    const user = normalize(inputs[idx])
    const ans = normalize(items[idx].answer)
    const correct = user === ans
    setChecked(prev => prev.map((c, i) => (i === idx ? true : c)))
    setResults(prev => prev.map((r, i) => (i === idx ? correct : r)))
  }

  const handleFinish = () => {
    const computed = items.map((it, idx) => {
      const user = normalize(inputs[idx])
      const ans = normalize(it.answer)
      const correct = user === ans
      return { answer: it.answer, userAnswer: inputs[idx], correct, clue: it.clue }
    })
    setChecked(items.map(() => true))
    setResults(computed.map(c => c.correct))
    setFinished(true)
    onComplete?.(computed)
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="lg" fontWeight="bold">Anagrama</Text>
      {content.instructions && (
        <Text fontSize="sm" color="gray.700">{content.instructions}</Text>
      )}
      <VStack align="stretch" spacing={3}>
        {items.map((it, idx) => {
          const isChecked = checked[idx]
          const isCorrect = results[idx]
          return (
            <Box key={`anagram-${idx}`} p={3} borderWidth="1px" borderRadius="md" borderColor={isChecked ? (isCorrect ? 'green.300' : 'red.300') : 'gray.200'} bg={isChecked ? (isCorrect ? 'green.50' : 'red.50') : 'white'}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between" align="center">
                  <Text fontWeight="semibold">{it.scrambled}</Text>
                  <Tag size="sm" colorScheme="purple"><TagLabel>Dificultad: {content.difficulty ?? 'media'}</TagLabel></Tag>
                </HStack>
                {it.clue && <Text fontSize="sm" color="gray.600">Pista: {it.clue}</Text>}
                <HStack>
                  <Input
                    placeholder="Escribe la palabra correcta"
                    value={inputs[idx]}
                    onChange={(e) => setInputs(prev => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                  />
                  <Button onClick={() => checkItem(idx)} colorScheme="blue">Verificar</Button>
                </HStack>
                {isChecked && (
                  <Text fontSize="sm" color={isCorrect ? 'green.600' : 'red.600'}>
                    {isCorrect ? '¡Correcto!' : `Correcta: ${it.answer}`}
                  </Text>
                )}
              </VStack>
            </Box>
          )
        })}
      </VStack>
      <HStack w="100%" align="center">
        <Button colorScheme="red" variant="outline" onClick={handleFinish} isDisabled={finished}>Omitir y perder puntos</Button>
        <Spacer />
        {renderContinueButton}
      </HStack>
    </VStack>
  )
}

export default Anagram