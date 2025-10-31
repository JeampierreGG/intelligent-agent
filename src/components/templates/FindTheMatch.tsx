import React, { useEffect, useMemo, useRef, useState } from 'react'
import { keyframes } from '@emotion/react'
import { Box, Button, HStack, Text, VStack, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import type { FindTheMatchContent, FindTheMatchPair } from '../../services/types'

export interface FindTheMatchProps {
  content: FindTheMatchContent
  onComplete?: (details: Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>, omitted?: boolean) => void
}

// Utilidad para aleatorizar arreglos
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}
// Velocidades por defecto (más rápidas que antes, pero aún cómodas)
const DEFAULT_SPEEDS = [4500, 5000, 4200, 4800, 5200, 4400]

// Animación que usa variables CSS para recorrer exactamente el ancho del contenedor
const slideLR = keyframes`
  0% { transform: translateX(var(--fromX)); }
  100% { transform: translateX(var(--toX)); }
`

const FindTheMatch: React.FC<FindTheMatchProps> = ({ content, onComplete }) => {
  const initialPairs = useMemo(() => (content.pairs || []).slice(0, 6), [content.pairs])
  const [queue, setQueue] = useState<FindTheMatchPair[]>(() => shuffleArray(initialPairs))
  const [affirmations, setAffirmations] = useState<string[]>(() => shuffleArray(initialPairs.map(p => p.affirmation)))
  const [currentIdx, setCurrentIdx] = useState(0)
  const speeds = content.speedsMs && content.speedsMs.length >= initialPairs.length ? content.speedsMs : DEFAULT_SPEEDS
  const [results, setResults] = useState<Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>>([])
  const timerRef = useRef<number | null>(null)
  const animConceptRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLParagraphElement | null>(null)
  const [fromX, setFromX] = useState(0)
  const [toX, setToX] = useState(0)
  const [animDuration, setAnimDuration] = useState(speeds[0])
  const [feedback, setFeedback] = useState<{ type: 'none' | 'correct' | 'incorrect'; affirmation: string | null }>({ type: 'none', affirmation: null })
  const FEEDBACK_PAUSE_MS = 800

  const bg = useColorModeValue('gray.50', 'gray.700')

  // No rotar automáticamente: el siguiente concepto sólo se desplaza
  // después de terminar el desplazamiento del actual, o si el usuario responde correctamente.
  useEffect(() => {
    // Reset de animación cuando cambia el concepto visible
    animConceptRef.current = queue[currentIdx]?.concept || null
    // Limpiar cualquier temporizador previo (por si acaso)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    // Recalcular recorrido y duración basados en el ancho real del contenedor y del texto
    const cw = containerRef.current?.offsetWidth ?? 0
    const tw = textRef.current?.offsetWidth ?? 0
    // Recorrer desde fuera del contenedor por la izquierda hasta justo fuera por la derecha
    setFromX(-tw)
    setToX(cw)
    // Usar la duración configurada, pero garantizar que no sea excesivamente lenta para recorridos largos
    const base = speeds[currentIdx % speeds.length]
    // Si el recorrido total es mayor, aumentará el tiempo proporcionalmente para mantener una velocidad estable
    const distance = cw + tw
    const targetSpeedPxPerSec = 120 // velocidad objetivo (px/s) moderada
    const computed = Math.max(Math.round((distance / targetSpeedPxPerSec) * 1000), 2000)
    // Preferir la mayor entre la configuración y la calculada para que siempre llegue al extremo
    setAnimDuration(Math.max(base, computed))
  }, [currentIdx, queue])

  const handleAnswer = (affirmation: string) => {
    if (queue.length === 0) return
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const current = queue[currentIdx]
    const correct = affirmation === current.affirmation
    const detail = { concept: current.concept, chosen: affirmation, expected: current.affirmation, correct }
    setResults(prev => [...prev, detail])
    // Mostrar feedback visual y pausar transición
    setFeedback({ type: correct ? 'correct' : 'incorrect', affirmation })

    window.setTimeout(() => {
      if (correct) {
        // eliminar par actual y su afirmación de la lista
        const newQueue = queue.filter((_, i) => i !== currentIdx)
        const newAffs = affirmations.filter(a => a !== current.affirmation)
        setQueue(newQueue)
        setAffirmations(shuffleArray(newAffs))
        // avanzar al siguiente concepto de forma aleatoria si quedan
        setCurrentIdx(() => (newQueue.length === 0 ? 0 : Math.floor(Math.random() * newQueue.length)))
        // Finalización si ya no quedan elementos
        if (newQueue.length === 0) {
          const finalDetails = [...results, detail]
          onComplete?.(finalDetails, false)
        }
      } else {
        // mover concepto actual al final de la cola
        const moving = queue[currentIdx]
        const rest = queue.filter((_, i) => i !== currentIdx)
        const newQueue = [...rest, moving]
        setQueue(newQueue)
        // elegir siguiente concepto de forma aleatoria
        setCurrentIdx(() => Math.floor(Math.random() * newQueue.length))
      }
      setFeedback({ type: 'none', affirmation: null })
    }, FEEDBACK_PAUSE_MS)
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="lg" fontWeight="bold">Cada oveja con su pareja</Text>
      {content.instructions && <Text fontSize="sm" color="gray.700">{content.instructions}</Text>}
      {queue.length > 0 ? (
        <Box p={4} borderWidth="1px" borderRadius="md" bg={bg}>
          <VStack align="stretch" spacing={4}>
            <Box p={3} borderWidth="1px" borderRadius="md" bg="white">
              <Text fontSize="md" fontWeight="semibold" textAlign="center">Concepto</Text>
              <Box ref={containerRef} position="relative" overflow="hidden" height="40px">
                <Text
                  ref={textRef}
                  key={`concept-${currentIdx}-${queue[currentIdx].concept}`}
                  fontSize="lg"
                  whiteSpace="nowrap"
                  position="absolute"
                  left={0}
                  style={{ ['--fromX' as any]: `${fromX}px`, ['--toX' as any]: `${toX}px` }}
                  sx={{
                    animation: `${slideLR} ${animDuration}ms linear`,
                    animationPlayState: feedback.type !== 'none' ? 'paused' : 'running',
                    willChange: 'transform',
                    color: feedback.type === 'correct' ? 'green.600' : (feedback.type === 'incorrect' ? 'red.600' : undefined)
                  }}
                  onAnimationEnd={() => {
                    if (feedback.type !== 'none') return
                    // Si el concepto actual sigue siendo el mismo (no hubo respuesta),
                    // pasar al siguiente para que comience su desplazamiento.
                    const currentConcept = animConceptRef.current
                    if (currentConcept && queue[currentIdx]?.concept === currentConcept && queue.length > 0) {
                      setCurrentIdx(prev => {
                        if (queue.length <= 1) return 0
                        let next = prev
                        while (next === prev) {
                          next = Math.floor(Math.random() * queue.length)
                        }
                        return next
                      })
                    }
                  }}
                >
                  {queue[currentIdx].concept}
                  {feedback.type === 'correct' && feedback.affirmation ? ' ✓' : ''}
                  {feedback.type === 'incorrect' && feedback.affirmation ? ' ✗' : ''}
                </Text>
              </Box>
              <Text fontSize="xs" textAlign="center" color="gray.500">Lee el concepto desplazándose y presiona la afirmación correcta</Text>
            </Box>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {affirmations.map((a, i) => {
                const isSelected = feedback.affirmation === a
                const isCorrectSel = isSelected && feedback.type === 'correct'
                const isIncorrectSel = isSelected && feedback.type === 'incorrect'
                return (
                  <Button
                    key={`aff-${i}`}
                    variant={isSelected ? 'solid' : 'outline'}
                    colorScheme={isCorrectSel ? 'green' : (isIncorrectSel ? 'red' : 'blue')}
                    onClick={() => handleAnswer(a)}
                    isDisabled={feedback.type !== 'none'}
                  >
                    {isCorrectSel ? '✓ ' : (isIncorrectSel ? '✗ ' : '')}{a}
                  </Button>
                )
              })}
            </SimpleGrid>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">Restantes: {queue.length}</Text>
              <Text fontSize="sm" color="gray.600">Aciertos: {results.filter(r => r.correct).length}</Text>
            </HStack>
            <HStack justify="flex-start">
              <Button
                colorScheme="red"
                variant="outline"
                onClick={() => {
                  // Omitir el elemento: los restantes cuentan como incorrectos
                  const remainingIncorrect = queue.map(p => ({ concept: p.concept, expected: p.affirmation, correct: false }))
                  const finalDetails = [...results, ...remainingIncorrect]
                  // Evitar continuar animaciones
                  if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
                  setQueue([])
                  setAffirmations([])
                  setCurrentIdx(0)
                  setFeedback({ type: 'none', affirmation: null })
                  onComplete?.(finalDetails as any, true)
                }}
              >Omitir y perder puntos</Button>
            </HStack>
          </VStack>
        </Box>
      ) : (
        // No mostrar página de completado aquí; el contenedor padre avanzará de etapa automáticamente
        <></>
      )}
    </VStack>
  )
}

export default FindTheMatch