import React, { useState } from 'react'
import { Box, Heading, Text, HStack, VStack, Button } from '@chakra-ui/react'
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

  const goNext = () => {
    if (idx < total - 1) setIdx(idx + 1)
    else if (onCompleted) onCompleted()
  }
  const goPrev = () => { if (idx > 0) setIdx(idx - 1) }

  const current = content.slides[idx]

  return (
    <Box
      position="relative"
      borderRadius="lg"
      overflow="hidden"
      borderWidth="1px"
      minH="300px"
      backgroundImage={content.backgroundImageUrl ? `url(${content.backgroundImageUrl})` : undefined}
      backgroundSize="cover"
      backgroundPosition="center"
    >
      <Box bg="rgba(0,0,0,0.45)" position="absolute" inset={0} />
      <VStack spacing={4} align="stretch" position="relative" zIndex={1} p={4}>
        <Heading size="md" color="white">{title}</Heading>
        <Box bg="rgba(255,255,255,0.9)" borderRadius="md" p={4}>
          <Heading size="sm" mb={2}>{current.title}</Heading>
          <Text color="gray.800" whiteSpace="pre-line">{current.text}</Text>
        </Box>
        <HStack justify="space-between">
          <Button onClick={goPrev} isDisabled={idx === 0} variant="outline" colorScheme="whiteAlpha">Anterior</Button>
          <Text color="white">{idx + 1} / {total}</Text>
          <Button onClick={() => { if (idx < total - 1) { goNext() } else { onCompleted && onCompleted() } }} colorScheme="blue">{idx < total - 1 ? 'Siguiente' : 'Finalizar'}</Button>
        </HStack>
      </VStack>
    </Box>
  )
}

export default CoursePresentation