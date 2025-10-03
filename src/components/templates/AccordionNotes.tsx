import React from 'react'
import { Box, Heading, Text, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, useColorModeValue } from '@chakra-ui/react'
import type { StudyAccordionNotesContent } from '../../services/types'

interface AccordionNotesProps {
  title: string
  content: StudyAccordionNotesContent
  onCompleted?: () => void
}

// Notas en acordeón para organizar definiciones y ejemplos por secciones
const AccordionNotes: React.FC<AccordionNotesProps> = ({ title, content, onCompleted }) => {
  // Seguimiento de secciones desplegadas al menos una vez (no requiere re-render)
  const visitedRef = React.useRef<Set<number>>(new Set())
  const total = content.sections.length
  const cardBg = useColorModeValue('white', 'gray.800')
  const itemBg = useColorModeValue('gray.50', 'gray.700')
  const itemHoverBg = useColorModeValue('gray.100', 'gray.600')
  const itemExpandedBg = useColorModeValue('blue.50', 'blue.900')
  const itemBorder = useColorModeValue('gray.200', 'gray.600')

  const handleAccordionChange = (expanded: number | number[] | undefined) => {
    const indices = Array.isArray(expanded)
      ? expanded
      : (typeof expanded === 'number' ? [expanded] : [])
    const next = new Set(visitedRef.current)
    indices.filter((i) => typeof i === 'number').forEach((i) => next.add(i as number))
    visitedRef.current = next
    if (next.size >= total && onCompleted) {
      onCompleted()
    }
  }

  return (
    <Box borderWidth="1px" borderColor={itemBorder} borderRadius="lg" p={4} bg={cardBg} boxShadow="sm">
      <Heading size="md" mb={3}>{title}</Heading>
      {/* Solo un acordeón abierto a la vez (al abrir uno, el anterior se cierra) */}
      <Accordion onChange={handleAccordionChange}>
        {content.sections.map((sec, idx) => (
          <AccordionItem key={`sec-${idx}`} borderWidth="1px" borderColor={itemBorder} borderRadius="md" overflow="hidden" mb={3}>
            <h2>
              <AccordionButton px={4} py={3}
                _hover={{ bg: itemHoverBg }}
                _expanded={{ bg: itemExpandedBg }}
              >
                <Box as="span" flex='1' textAlign='left' fontWeight="semibold">
                  {sec.title}
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel px={4} py={3} bg={itemBg}>
              <Text whiteSpace="pre-line" color={useColorModeValue('gray.700','gray.200')}>{sec.body}</Text>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Box>
  )
}

export default AccordionNotes