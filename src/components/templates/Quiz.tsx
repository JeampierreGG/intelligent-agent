import React, { useState } from 'react'
import { Box, Heading, Text, Card, CardBody, VStack, HStack, Button, Badge } from '@chakra-ui/react'
import type { QuizContent } from '../../services/types'

interface QuizProps {
  content: QuizContent
  onComplete?: (result: { total: number; correct: number; details: Array<{ prompt: string; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }> }) => void
}

const Quiz: React.FC<QuizProps> = ({ content, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [finished, setFinished] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const total = content.questions.length
  const q = content.questions[currentIdx]

  const submit = () => {
    if (selected == null) return
    const isCorrect = selected === q.correctIndex
    setScore(prev => prev + (isCorrect ? 1 : 0))
    setAnswers(prev => {
      const next = [...prev]
      next[currentIdx] = selected
      return next
    })
    // Mostrar retroalimentación y esperar a que el usuario presione "Siguiente pregunta"
    setShowFeedback(true)
    // Si es la última pregunta, finalizar inmediatamente y habilitar el botón de "Continuar" en el dashboard
    if (currentIdx + 1 >= total) {
      setFinished(true)
      const details = content.questions.map((qq, idx) => {
        const chosen = (idx === currentIdx) ? selected : answers[idx]
        const chosenIndex = typeof chosen === 'number' ? chosen : -1
        const chosenText = typeof chosen === 'number' ? qq.options[chosen] : ''
        const correctIndex = qq.correctIndex
        const correctText = qq.options[correctIndex]
        return {
          prompt: qq.prompt,
          chosenIndex,
          correctIndex,
          chosenText,
          correctText,
          correct: chosenIndex === correctIndex,
          explanation: qq.explanation
        }
      })
      const finalScore = (selected === q.correctIndex) ? score + 1 : score
      onComplete?.({ total, correct: finalScore, details })
    }
  }

  if (!q) return null

  return (
    <Box>
      <Heading size="md" mb={2}>{content.title}</Heading>
      <Text mb={4}>{content.instructions}</Text>
      <Card>
        <CardBody>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontWeight="bold">Pregunta {currentIdx + 1} de {total}</Text>
              {([content.subject, content.topic].filter(Boolean).length > 0) && (
                <Badge colorScheme="purple">{[content.subject, content.topic].filter(Boolean).join(' • ')}</Badge>
              )}
            </HStack>
            <Text>{q.prompt}</Text>
            <VStack align="stretch" spacing={2}>
              {q.options.map((opt, idx) => {
                const isSelected = selected === idx
                const isCorrect = idx === q.correctIndex
                let variant: 'solid' | 'outline' = 'outline'
                let colorScheme: string = 'gray'
                let prefix = ''
                if (showFeedback) {
                  if (isCorrect) {
                    variant = 'solid'
                    colorScheme = 'green'
                    prefix = '✔ '
                  } else if (isSelected) {
                    variant = 'solid'
                    colorScheme = 'red'
                    prefix = '✖ '
                  } else {
                    variant = 'outline'
                    colorScheme = 'gray'
                  }
                } else if (isSelected) {
                  variant = 'solid'
                  colorScheme = 'blue'
                }
                return (
                  <Button
                    key={idx}
                    variant={variant}
                    colorScheme={colorScheme as any}
                    onClick={() => !showFeedback && !finished && setSelected(idx)}
                    isDisabled={showFeedback || finished}
                  >
                    {prefix}{opt}
                  </Button>
                )
              })}
            </VStack>
            {!finished && (
              <HStack justify="flex-end" mt={3}>
                {showFeedback && currentIdx + 1 < total && (
                  <Button colorScheme="green" onClick={() => {
                    if (currentIdx + 1 < total) {
                      setShowFeedback(false)
                      setCurrentIdx(currentIdx + 1)
                      setSelected(null)
                    } else {
                      // Finalizar quiz y notificar resultados
                      setFinished(true)
                      const details = content.questions.map((qq, idx) => {
                        const chosen = answers[idx]
                        const chosenIndex = typeof chosen === 'number' ? chosen : -1
                        const chosenText = typeof chosen === 'number' ? qq.options[chosen] : ''
                        const correctIndex = qq.correctIndex
                        const correctText = qq.options[correctIndex]
                        return {
                          prompt: qq.prompt,
                          chosenIndex,
                          correctIndex,
                          chosenText,
                          correctText,
                          correct: chosenIndex === correctIndex,
                          explanation: qq.explanation
                        }
                      })
                      onComplete?.({ total, correct: score, details })
                    }
                  }}>Siguiente pregunta</Button>
                )}
                <Button colorScheme="blue" onClick={submit} isDisabled={selected == null || showFeedback}>Responder</Button>
              </HStack>
            )}
            {showFeedback && (
              <Box mt={3} p={3} borderWidth="1px" borderRadius="md" borderColor="green.300" bg="green.50">
                <Text fontWeight="bold">Respuesta correcta:</Text>
                <Text>{q.options[q.correctIndex]}</Text>
                {q.explanation && (
                  <>
                    <Text fontWeight="bold" mt={2}>Justificación:</Text>
                    <Text fontSize="sm" color="gray.700">{q.explanation}</Text>
                  </>
                )}
              </Box>
            )}
            {finished && (
              <Box mt={3}>
                <Heading size="sm">Resultado</Heading>
                <Text>Correctas: {score} de {total} ({Math.round((score/total)*100)}%)</Text>
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>
    </Box>
  )
}

export default Quiz