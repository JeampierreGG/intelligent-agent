import React, { useState } from 'react'
import { Box, Heading, Text, SimpleGrid, Card, CardBody, Button, VStack, HStack, useToast } from '@chakra-ui/react'
import type { MatchUpContent, MatchUpPair } from '../../services/types'

interface MatchUpProps {
  content: MatchUpContent
}

// Plantilla básica para actividad Match up (emparejar)
const MatchUp: React.FC<MatchUpProps> = ({ content }) => {
  const toast = useToast()
  const [leftItems] = useState<MatchUpPair[]>(content.linesMode.pairs)
  const [rightItems] = useState<string[]>(content.linesMode.pairs.map((p: MatchUpPair) => p.right))
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [matched, setMatched] = useState<Record<number, number>>({})

  const handleLeftSelect = (idx: number) => setSelectedLeft(idx)
  const handleRightSelect = (idx: number) => {
    if (selectedLeft === null) return
    // Verificar si coincide
    const isCorrect = leftItems[selectedLeft].right === rightItems[idx]
    setMatched(prev => ({ ...prev, [selectedLeft]: idx }))
    setSelectedLeft(null)
    toast({
      title: isCorrect ? '¡Correcto!' : 'Intenta de nuevo',
      status: isCorrect ? 'success' : 'warning',
      duration: 1200,
      isClosable: true,
    })
  }

  const allMatched = Object.keys(matched).length === leftItems.length

  return (
    <Box>
      <Heading size="md" mb={2}>{content.title}</Heading>
      <Text color="gray.600" mb={6}>{content.instructions_lines}</Text>

      <HStack align="start" spacing={6}>
        <VStack flex={1} align="stretch">
          <Heading size="sm">Términos</Heading>
          <SimpleGrid columns={[1, 1, 2]} spacing={3}>
            {leftItems.map((item, idx) => (
              <Card key={`left-${idx}`} borderColor={selectedLeft === idx ? 'blue.400' : 'gray.200'} borderWidth={selectedLeft === idx ? '2px' : '1px'}>
                <CardBody>
                  <Text mb={2}>{item.left}</Text>
                  <Button size="sm" variant="outline" onClick={() => handleLeftSelect(idx)}>
                    Seleccionar
                  </Button>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </VStack>

        <VStack flex={1} align="stretch">
          <Heading size="sm">Definiciones</Heading>
          <SimpleGrid columns={[1, 1, 2]} spacing={3}>
            {rightItems.map((text, idx) => (
              <Card key={`right-${idx}`} borderColor={Object.values(matched).includes(idx) ? 'green.400' : 'gray.200'} borderWidth={Object.values(matched).includes(idx) ? '2px' : '1px'}>
                <CardBody>
                  <Text mb={2}>{text}</Text>
                  <Button size="sm" variant="outline" onClick={() => handleRightSelect(idx)} isDisabled={Object.values(matched).includes(idx)}>
                    Emparejar
                  </Button>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </VStack>
      </HStack>

      {allMatched && (
        <Box mt={6} p={4} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
          <Text color="green.700">¡Has completado todos los emparejamientos!</Text>
        </Box>
      )}
    </Box>
  )
}

export default MatchUp