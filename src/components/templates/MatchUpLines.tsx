import React, { useRef, useState, useEffect } from 'react'
import { Box, Heading, Text, Card, CardBody, VStack, HStack } from '@chakra-ui/react'
import type { MatchUpContent, MatchUpPair } from '../../services/types'

interface LineResultItem {
  term: string;
  chosen: string;
  expected: string;
  correct: boolean;
}

interface MatchUpLinesProps {
  content: MatchUpContent
  onCompleted?: (results: LineResultItem[]) => void
  onProgress?: (results: LineResultItem[], allCorrect: boolean) => void
}

// Utilidad para mezclar elementos aleatoriamente
const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Plantilla Match Up (modo líneas): emparejar conectando cajas con líneas de colores
const MatchUpLines: React.FC<MatchUpLinesProps> = ({ content, onCompleted, onProgress }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leftAnchorRefs = useRef<Array<HTMLDivElement | null>>([])
  const rightAnchorRefs = useRef<Array<HTMLDivElement | null>>([])

  // Mezclar aleatoriamente el orden visual de términos y definiciones
  const shuffledPairs = shuffle<MatchUpPair>(content.linesMode.pairs.map(p => ({ left: p.left, right: p.right })))
  const [leftItems] = useState<MatchUpPair[]>(shuffledPairs)
  const [rightItems] = useState<string[]>(shuffle<string>(content.linesMode.pairs.map(p => p.right)))
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [selectedRight, setSelectedRight] = useState<number | null>(null)
  const [matched, setMatched] = useState<Record<number, number>>({})
  const [lines, setLines] = useState<Array<{ from: { x: number, y: number }, to: { x: number, y: number }, color: string }>>([])
  const [reportedCompleted, setReportedCompleted] = useState<boolean>(false)

  const colors = ['#E53E3E', '#3182CE', '#38A169', '#805AD5', '#DD6B20', '#319795', '#D53F8C', '#2B6CB0']

  const computeCenter = (el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    const offsetX = containerRect ? rect.left - containerRect.left : rect.left
    const offsetY = containerRect ? rect.top - containerRect.top : rect.top
    return { x: offsetX + rect.width / 2, y: offsetY + rect.height / 2 }
  }

  // Las líneas se recalculan en bloque a partir del estado 'matched'

  const getLeftByRight = (rightIdx: number): number | null => {
    const entry = Object.entries(matched).find(([, r]) => r === rightIdx)
    return entry ? parseInt(entry[0], 10) : null
  }

  const recalcLinesFromMatched = (newMatched: Record<number, number>) => {
    const newLines = Object.entries(newMatched).map(([leftKey, rightVal], idx) => {
      const leftIdx = parseInt(leftKey, 10)
      const rightIdx = rightVal as unknown as number
      const leftEl = leftAnchorRefs.current[leftIdx]
      const rightEl = rightAnchorRefs.current[rightIdx]
      if (!leftEl || !rightEl) return null
      const from = computeCenter(leftEl)
      const to = computeCenter(rightEl)
      const color = colors[idx % colors.length]
      return { from, to, color }
    }).filter(Boolean) as typeof lines
    setLines(newLines)
  }

  const connectPair = (leftIdx: number, rightIdx: number) => {
    setMatched(prev => {
      const next = { ...prev }
      // liberar relaciones anteriores
      const prevRightForLeft = next[leftIdx]
      if (prevRightForLeft !== undefined && prevRightForLeft !== rightIdx) {
        delete next[leftIdx]
      }
      const prevLeftForRight = getLeftByRight(rightIdx)
      if (prevLeftForRight !== null && prevLeftForRight !== leftIdx) {
        delete next[prevLeftForRight]
      }
      // asignar nueva relación
      next[leftIdx] = rightIdx
      // recomputar líneas visuales
      recalcLinesFromMatched(next)
      return next
    })
    setSelectedLeft(null)
    setSelectedRight(null)
  }

  const handleLeftAnchorClick = (idx: number) => {
    if (selectedRight !== null) {
      connectPair(idx, selectedRight)
    } else {
      setSelectedLeft(idx)
    }
  }

  const handleRightAnchorClick = (idx: number) => {
    if (selectedLeft !== null) {
      connectPair(selectedLeft, idx)
    } else {
      setSelectedRight(idx)
    }
  }

  useEffect(() => {
    const normalize = (s: string) => {
      // Normalizar: minúsculas, quitar acentos, eliminar todo lo no alfanumérico (excepto espacios), colapsar espacios
      const lower = (s || '').toLowerCase().trim()
      const noAccents = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const onlyWordChars = noAccents.replace(/[^a-z0-9\s]/g, '')
      return onlyWordChars.replace(/\s+/g, ' ')
    }
    const allMatched = Object.keys(matched).length === leftItems.length
    const results: LineResultItem[] = leftItems.map((item, idx) => {
      const rightIdx = matched[idx]
      const chosen = rightIdx !== undefined ? rightItems[rightIdx] : ''
      const expected = item.right
      const correct = normalize(chosen) === normalize(expected)
      return { term: item.left, chosen, expected, correct }
    })
    const allCorrect = allMatched && results.every(r => r.correct)
    // Reportar progreso continuo para habilitar/deshabilitar botón en Dashboard
    if (onProgress) {
      onProgress(results, allCorrect)
    }
    // Reportar completion solo cuando todo es correcto
    if (allCorrect && onCompleted && !reportedCompleted) {
      onCompleted(results)
      setReportedCompleted(true)
    }
    // Si se rompe la relación correcta después de haber completado, permitir re‑completar
    if (!allCorrect && reportedCompleted) {
      setReportedCompleted(false)
    }
    // Recalcular líneas en caso de resize
    const handleResize = () => {
      const newLines = Object.entries(matched).map(([leftKey, rightVal], idx) => {
        const leftIdx = parseInt(leftKey, 10)
        const rightIdx = rightVal as unknown as number
        const leftEl = leftAnchorRefs.current[leftIdx]
        const rightEl = rightAnchorRefs.current[rightIdx]
        if (!leftEl || !rightEl) return null
        const from = computeCenter(leftEl)
        const to = computeCenter(rightEl)
        const color = colors[idx % colors.length]
        return { from, to, color }
      }).filter(Boolean) as typeof lines
      setLines(newLines)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, reportedCompleted])

  // Estado derivado ya se calcula dentro de useEffect cuando corresponde

  return (
    <Box>
      <Heading size="md" mb={2}>{content.title}</Heading>
      <Text color="gray.600" mb={6}>{content.instructions_lines}</Text>

      <Box position="relative" ref={containerRef}>
        {/* SVG overlay para líneas */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {lines.map((line, idx) => (
            <line key={`line-${idx}`} x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke={line.color} strokeWidth={3} />
          ))}
        </svg>

        <HStack align="start" spacing={6}>
          <VStack flex={1} align="stretch">
            <Heading size="sm">Términos</Heading>
            <VStack spacing={3} align="stretch">
              {leftItems.map((item, idx) => {
                const isLeftMatched = matched[idx] !== undefined
                return (
                  <HStack key={`left-row-${idx}`} spacing={2} align="center" justify="flex-start">
                    {/* Tarjeta del término (sin círculo interno) */}
                    <Card w="280px" borderColor={isLeftMatched ? 'green.400' : (selectedLeft === idx ? 'blue.400' : 'gray.200')} borderWidth={isLeftMatched || selectedLeft === idx ? '2px' : '1px'} cursor={'pointer'} onClick={() => handleLeftAnchorClick(idx)}>
                      <CardBody py={2}>
                        <Text>{item.left}</Text>
                      </CardBody>
                    </Card>
                    {/* Círculo de anclaje fuera del cuadro del término (a la derecha) */}
                    <Box
                      ref={(el) => { leftAnchorRefs.current[idx] = el }}
                      w="16px"
                      h="16px"
                      borderRadius="50%"
                      bg={isLeftMatched ? 'green.400' : (selectedLeft === idx ? 'blue.400' : 'gray.400')}
                      cursor={'pointer'}
                      title="Iniciar línea desde este término"
                      onClick={() => handleLeftAnchorClick(idx)}
                    />
                  </HStack>
                )
              })}
            </VStack>
          </VStack>

          <VStack flex={1} align="stretch">
            <Heading size="sm">Definiciones</Heading>
            <VStack spacing={3} align="stretch">
              {rightItems.map((text, idx) => (
                <HStack key={`right-row-${idx}`} spacing={2} align="center">
                  {/* Círculo de anclaje fuera del cuadro de definición */}
                  <Box
                    ref={(el) => { rightAnchorRefs.current[idx] = el }}
                    w="16px"
                    h="16px"
                    borderRadius="50%"
                    bg={Object.values(matched).includes(idx) ? 'green.400' : (selectedRight === idx ? 'blue.400' : 'gray.400')}
                    cursor={'pointer'}
                    title="Conectar línea a esta definición"
                    onClick={() => handleRightAnchorClick(idx)}
                  />
                  {/* Tarjeta de definición (sin círculo interno) */}
                  <Card
                    w="560px"
                    borderColor={Object.values(matched).includes(idx) ? 'green.400' : (selectedRight === idx ? 'blue.400' : 'gray.200')}
                    borderWidth={Object.values(matched).includes(idx) || selectedRight === idx ? '2px' : '1px'}
                    cursor={'pointer'}
                    onClick={() => handleRightAnchorClick(idx)}
                  >
                    <CardBody py={2}>
                      <Text textAlign="left">{text}</Text>
                    </CardBody>
                  </Card>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </HStack>
      </Box>

      {/* No mostramos resultados aquí; el resumen se presentará al finalizar todas las actividades en el Dashboard */}
    </Box>
  )
}

export default MatchUpLines