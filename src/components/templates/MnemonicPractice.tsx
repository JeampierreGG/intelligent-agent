import { useMemo, useState } from 'react'
import { Box, VStack, Text, Input, Button, HStack, Card, CardBody, useColorModeValue, Divider } from '@chakra-ui/react'
import type { StudyMnemonicContent } from '../../services/types'

interface MnemonicPracticeProps {
  content: StudyMnemonicContent
  mnemonicText: string
  onComplete: (results: Array<{ prompt: string; answer: string; userAnswer: string; correct: boolean }>, score: number) => void
  renderContinueButton?: React.ReactNode
}

export default function MnemonicPractice({ content, mnemonicText, onComplete, renderContinueButton }: MnemonicPracticeProps) {
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')
  // Barajar aleatoriamente el orden de las definiciones para la práctica
  const shuffledItems = useMemo(() => {
    const arr = [...content.items]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [content.items])
  const [answers, setAnswers] = useState<string[]>(() => Array(shuffledItems.length).fill(''))
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [graded, setGraded] = useState<boolean>(false)
  const [results, setResults] = useState<Array<{ prompt: string; answer: string; userAnswer: string; correct: boolean }>>([])
  const [score, setScore] = useState<number>(0)

  const sanitizeMnemonic = (s: string) => (s || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '')

  // Normaliza texto para comparación flexible: ignora mayúsculas/minúsculas y tildes
  const normalizeText = (s: string) => {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  const gradeAll = () => {
    setSubmitting(true)
    const r = shuffledItems.map((it, idx) => {
      const ua = (answers[idx] || '').trim()
      // Mostrar la DEFINICIÓN y evaluar que el usuario escriba la RESPUESTA correcta (prompt)
      const correct = ua.length > 0 && normalizeText(ua) === normalizeText(it.prompt)
      return { prompt: it.prompt, answer: it.answer, userAnswer: ua, correct }
    })
    const s = Math.round(100 * (r.filter(x => x.correct).length / shuffledItems.length))
    setResults(r)
    setScore(s)
    setGraded(true)
    onComplete(r, s)
    setSubmitting(false)
  }

  

  return (
    <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
      <CardBody>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="xl" fontWeight="bold">Practica con tu mnemotecnia</Text>
          {mnemonicText && (
            <Box p={3} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
              <Text fontSize="sm" fontWeight="semibold">Tu mnemotecnia:</Text>
              <Text fontSize="sm" color="gray.700">{mnemonicText}</Text>
            </Box>
          )}
          {!graded ? (
            <>
              <Text fontSize="sm" color="gray.700">Escribe la respuesta correcta basándote en la definición y tu mnemotecnia.</Text>
              {shuffledItems.map((it, idx) => (
                <VStack key={`mp-${idx}`} align="stretch" spacing={1}>
                  <Text fontSize="sm" fontWeight="semibold">{idx + 1}. Definición: {it.answer}</Text>
                  <Input placeholder="Escribe la respuesta correcta" value={answers[idx]} onChange={(e) => {
                    const next = [...answers]
                    next[idx] = sanitizeMnemonic(e.target.value)
                    setAnswers(next)
                  }} />
                </VStack>
              ))}
              <HStack justify="flex-end">
                <Button colorScheme="blue" onClick={gradeAll} isLoading={submitting}>Calificar respuestas</Button>
              </HStack>
            </>
          ) : (
            <>
              <Box>
                <Text fontSize="md" fontWeight="semibold">Resultados</Text>
                <Text fontSize="sm" color="gray.600">Puntuación: {score}/100 • Cada ítem vale {Math.round(100 / content.items.length)} puntos</Text>
              </Box>
              <Divider />
              {results.map((r, idx) => (
                <Box key={`res-${idx}`} p={3} borderWidth="1px" borderRadius="md" borderColor={r.correct ? 'green.300' : 'red.300'} bg={r.correct ? 'green.50' : 'red.50'}>
                  <VStack align="stretch" spacing={1}>
                    <Text fontSize="sm" color="gray.700"><strong>{idx + 1}.</strong> Definición: {r.answer}</Text>
                    <Text fontSize="sm" color={r.correct ? 'green.700' : 'red.700'}>
                      Tu respuesta: {r.userAnswer ? r.userAnswer : '(sin respuesta)'} {r.correct ? '✓' : '✗'}
                    </Text>
                    {!r.correct && (
                      <Text fontSize="sm" color="gray.800">Respuesta correcta: <strong>{r.prompt}</strong></Text>
                    )}
                  </VStack>
                </Box>
              ))}
              <HStack justify="flex-end">
                {renderContinueButton}
              </HStack>
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  )
}
