import React, { useMemo, useState } from 'react'
import { Box, Button, HStack, Text, VStack, SimpleGrid, RadioGroup, Radio, Stack, Image, Spacer } from '@chakra-ui/react'
import type { OpenTheBoxContent } from '../../services/types'
import logoIA from '../../assets/Logo-IA.png'

export interface OpenTheBoxProps {
  content: OpenTheBoxContent
  onComplete?: (details: Array<{ question: string; options: string[]; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>) => void
  renderContinueButton?: React.ReactNode
}

const OpenTheBox: React.FC<OpenTheBoxProps> = ({ content, onComplete, renderContinueButton }) => {
  const items = useMemo(() => content.items || [], [content.items])
  const [opened, setOpened] = useState<boolean[]>(items.map(() => false))
  const [selected, setSelected] = useState<Array<number | null>>(items.map(() => null))
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false))
  const [results, setResults] = useState<boolean[]>(items.map(() => false))
  const [finished, setFinished] = useState<boolean>(false)

  const openBox = (idx: number) => {
    setOpened(prev => prev.map((v, i) => (i === idx ? true : v)))
  }

  const checkAnswer = (idx: number) => {
    const sel = selected[idx]
    if (sel == null) return
    const correct = sel === items[idx].correctIndex
    setChecked(prev => prev.map((v, i) => (i === idx ? true : v)))
    setResults(prev => prev.map((v, i) => (i === idx ? correct : v)))
  }

  const allAnswered = useMemo(() => checked.every(Boolean), [checked])

  const finish = () => {
    const details = items.map((it, idx) => {
      const chosenIndex = selected[idx] ?? -1
      const correctIndex = it.correctIndex
      const chosenText = chosenIndex >= 0 ? it.options[chosenIndex] : ''
      const correctText = it.options[correctIndex]
      const correct = chosenIndex === correctIndex
      return { question: it.question, options: it.options, chosenIndex, correctIndex, chosenText, correctText, correct, explanation: it.explanation }
    })
    // Marcar todas las cajas como revisadas y reflejar resultados, dejando en blanco las no respondidas
    // Además, abrir todas las cajas para que el usuario vea las preguntas y respuestas correctas
    setOpened(items.map(() => true))
    setChecked(items.map(() => true))
    setResults(details.map(d => d.correct))
    setFinished(true)
    onComplete?.(details)
  }

  // Si todas las cajas están respondidas, finalizar automáticamente para habilitar el botón "Continuar" externo.
  React.useEffect(() => {
    if (items.length > 0 && allAnswered && !finished) {
      finish()
    }
  }, [allAnswered, finished, items.length])

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="lg" fontWeight="bold">Abrecajas</Text>
      {content.instructions && (
        <Text fontSize="sm" color="gray.700">{content.instructions}</Text>
      )}
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        {items.map((it, idx) => {
          const isOpened = opened[idx]
          const isChecked = checked[idx]
          const isCorrect = results[idx]
          return (
            <Box
              key={`box-${idx}`}
              p={3}
              borderWidth="1px"
              borderRadius="md"
              overflow="hidden"
              borderColor={isChecked ? (isCorrect ? 'green.300' : 'red.300') : 'gray.200'}
              bg={isOpened ? (isChecked ? (isCorrect ? 'green.50' : 'red.50') : 'gray.50') : 'white'}
              boxShadow="sm"
              transition="background-color 0.2s ease, border-color 0.2s ease"
              onClick={() => { if (!isOpened) openBox(idx) }}
            >
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" color="gray.600">Caja {idx + 1}</Text>
                {!isOpened ? (
                  <VStack align="center" justify="center" spacing={2} minH="140px">
                    <Image src={logoIA} alt="Logo IA" maxH="80px" objectFit="contain" pointerEvents="none" />
                    <Text fontSize="sm" color="gray.500">Presiona la caja para abrir</Text>
                  </VStack>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    <Text>{it.question}</Text>
                    <RadioGroup
                      value={selected[idx] != null ? String(selected[idx]) : ''}
                      onChange={(val) => {
                        const n = parseInt(val, 10)
                        setSelected(prev => prev.map((v, i) => (i === idx ? n : v)))
                      }}
                      isDisabled={isChecked}
                    >
                      <Stack>
                        {it.options.map((opt, j) => (
                          <Radio key={`opt-${idx}-${j}`} value={String(j)}>{opt}</Radio>
                        ))}
                      </Stack>
                    </RadioGroup>
                    <HStack>
                      <Button size="sm" colorScheme="blue" onClick={() => checkAnswer(idx)} isDisabled={selected[idx] == null || isChecked}>Responder</Button>
                    </HStack>
                    {isChecked && (
                      <Text fontSize="sm" color={isCorrect ? 'green.600' : 'red.600'}>
                        {isCorrect ? '¡Correcto!' : `Correcta: ${it.options[it.correctIndex]}`}
                      </Text>
                    )}
                    {isChecked && it.explanation && (
                      <Text fontSize="xs" color="gray.600">{it.explanation}</Text>
                    )}
                  </VStack>
                )}
              </VStack>
            </Box>
          )
        })}
      </SimpleGrid>
      <HStack w="100%" align="center">
        <Button colorScheme="red" variant="outline" onClick={finish} isDisabled={finished}>Omitir y perder puntos</Button>
        <Spacer />
        {renderContinueButton}
      </HStack>
    </VStack>
  )
}

export default OpenTheBox