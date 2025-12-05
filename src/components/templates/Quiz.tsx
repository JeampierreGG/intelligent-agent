import React, { useEffect, useState } from 'react'
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
  // Opciones barajadas y posición del índice correcto dentro del arreglo barajado
  const [displayOptions, setDisplayOptions] = useState<string[]>([])
  const [correctIdxShuffled, setCorrectIdxShuffled] = useState<number>(0)
  const [perQuestionOptions, setPerQuestionOptions] = useState<string[][]>([])
  const [perQuestionCorrectIdx, setPerQuestionCorrectIdx] = useState<number[]>([])

  const total = content.questions.length
  const q = content.questions[currentIdx]

  // Barajar opciones cuando cambia la pregunta actual
  useEffect(() => {
    if (!q || !Array.isArray(q.options)) {
      setDisplayOptions([])
      setCorrectIdxShuffled(0)
      return
    }
    const idxs = q.options.map((_, i) => i)
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[idxs[i], idxs[j]] = [idxs[j], idxs[i]]
    }
    const shuffled = idxs.map(i => q.options[i])
    const newCorrectPos = idxs.indexOf(q.correctIndex)
    setDisplayOptions(shuffled)
    setCorrectIdxShuffled(newCorrectPos >= 0 ? newCorrectPos : 0)
    setPerQuestionOptions(prev => {
      const next = prev.slice()
      next[currentIdx] = shuffled
      return next
    })
    setPerQuestionCorrectIdx(prev => {
      const next = prev.slice()
      next[currentIdx] = (newCorrectPos >= 0 ? newCorrectPos : 0)
      return next
    })
    setSelected(null)
    setShowFeedback(false)
  }, [currentIdx, q])

  const submit = () => {
    if (selected == null) return
    const isCorrect = selected === correctIdxShuffled
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
        const opts = perQuestionOptions[idx] || []
        const corrIdx = (typeof perQuestionCorrectIdx[idx] === 'number') ? perQuestionCorrectIdx[idx] : 0
        const chosenText = (typeof chosen === 'number' && opts[chosen] != null) ? opts[chosen] : ''
        const correctText = opts[corrIdx] || ''
        return {
          prompt: qq.prompt,
          chosenIndex,
          correctIndex: corrIdx,
          chosenText,
          correctText,
          correct: chosenIndex === corrIdx,
          explanation: qq.explanation
        }
      })
      const finalScore = (selected === correctIdxShuffled) ? score + 1 : score
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
              {displayOptions.map((opt, idx) => {
                const sanitized = opt.replace(/^\s*\(?[A-Za-z]\)?\s*[.\-:)]\s*/, '').trim()
                const isSelected = selected === idx
                const isCorrect = idx === correctIdxShuffled
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
                    colorScheme={colorScheme}
                    onClick={() => !showFeedback && !finished && setSelected(idx)}
                    isDisabled={showFeedback || finished}
                  >
                    {prefix}{sanitized}
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
                        const opts = perQuestionOptions[idx] || []
                        const corrIdx = (typeof perQuestionCorrectIdx[idx] === 'number') ? perQuestionCorrectIdx[idx] : 0
                        const chosenText = (typeof chosen === 'number' && opts[chosen] != null) ? opts[chosen] : ''
                        const correctText = opts[corrIdx] || ''
                        return {
                          prompt: qq.prompt,
                          chosenIndex,
                          correctIndex: corrIdx,
                          chosenText,
                          correctText,
                          correct: chosenIndex === corrIdx,
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
                <Text>{displayOptions[correctIdxShuffled]}</Text>
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
