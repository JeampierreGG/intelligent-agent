import React, { useEffect, useState } from 'react'
import { Box, Heading, Text, HStack, VStack, Button, SlideFade } from '@chakra-ui/react'
import type { StudyCoursePresentationContent } from '../../services/types'

interface CoursePresentationProps {
  title: string
  content: StudyCoursePresentationContent
  onCompleted?: () => void
}

// Presentación tipo diapositivas con una sola imagen de fondo (Wikimedia preferentemente)
const CoursePresentation: React.FC<CoursePresentationProps> = ({ title, content, onCompleted }) => {
  const [idx, setIdx] = useState(0)
  const total = content.slides.length

  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const goNext = () => {
    setDirection('next')
    if (idx < total - 1) setIdx(idx + 1)
  }
  const goPrev = () => { if (idx > 0) { setDirection('prev'); setIdx(idx - 1) } }

  const current = content.slides[idx]

  // Al llegar al último slide, activar el botón externo de "Continuar" a través de onCompleted
  const [lastNotified, setLastNotified] = useState(false)
  useEffect(() => {
    if (!lastNotified && idx === total - 1) {
      setLastNotified(true)
      onCompleted && onCompleted()
    }
  }, [idx, total, lastNotified, onCompleted])

  return (
    <Box
      position="relative"
      borderRadius="lg"
      overflow="hidden"
      borderWidth="1px"
      height="300px" /* 60% más alto que 300px y de tamaño fijo */
      bg="gray.50"
    >
      <VStack spacing={4} align="stretch" position="relative" zIndex={1} p={4}>
        <Heading size="md" color="gray.800">{title}</Heading>
        <SlideFade in key={idx} offsetX={direction === 'next' ? 32 : -32} offsetY={0}>
          <Box bg="rgba(255,255,255,0.9)" borderRadius="md" p={4} boxShadow="md" mb={-3}>
            <Heading size="sm" mb={2}>{current.title}</Heading>
            <Text color="gray.800" whiteSpace="pre-line">{current.text}</Text>
          </Box>
        </SlideFade>
        <HStack justify="space-between" mb={4}>
          <Button onClick={goPrev} isDisabled={idx === 0} variant="outline" colorScheme="blue">Anterior</Button>
          <Text color="gray.700">{idx + 1} / {total}</Text>
          {idx < total - 1 ? (
            <Button onClick={goNext} colorScheme="blue">Siguiente</Button>
          ) : (
            <Box width="88px" />
          )}
        </HStack>
      </VStack>
    </Box>
  )
}

export default CoursePresentation