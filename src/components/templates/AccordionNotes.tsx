import React from 'react'
import { Box, Heading, Text, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, useColorModeValue } from '@chakra-ui/react'
import type { StudyAccordionNotesContent } from '../../services/types'

interface AccordionNotesProps {
  title: string
  content: StudyAccordionNotesContent
  onCompleted?: () => void
  // Clave opcional para persistir el estado de secciones visitadas (por recurso/usuario)
  persistKey?: string
}

// Notas en acordeón para organizar definiciones y ejemplos por secciones
const AccordionNotes: React.FC<AccordionNotesProps> = ({ title, content, onCompleted, persistKey }) => {
  // Seguimiento de secciones desplegadas al menos una vez y persistencia opcional
  const [visited, setVisited] = React.useState<Set<number>>(new Set())
  const total = content.sections.length
  const cardBg = useColorModeValue('white', 'gray.800')
  const itemBg = useColorModeValue('gray.50', 'gray.700')
  const itemHoverBg = useColorModeValue('gray.100', 'gray.600')
  const itemExpandedBg = useColorModeValue('blue.50', 'blue.900')
  const itemVisitedBg = useColorModeValue('purple.50', 'purple.900')
  const itemVisitedBorder = useColorModeValue('purple.300', 'purple.500')
  const itemBorder = useColorModeValue('gray.200', 'gray.600')

  const handleAccordionChange = (expanded: number | number[] | undefined) => {
    const indices = Array.isArray(expanded)
      ? expanded
      : (typeof expanded === 'number' ? [expanded] : [])
    const next = new Set(visited)
    indices.filter((i) => typeof i === 'number').forEach((i) => next.add(i as number))
    setVisited(next)
    // Persistir si se solicitó
    if (persistKey) {
      try {
        const arr = Array.from(next)
        localStorage.setItem(`accordion_visited_${persistKey}`, JSON.stringify(arr))
      } catch {}
    }
    if (next.size >= total && onCompleted) {
      onCompleted()
    }
  }

  // Cargar persistencia inicial si existe
  React.useEffect(() => {
    if (persistKey) {
      try {
        const raw = localStorage.getItem(`accordion_visited_${persistKey}`)
        if (raw) {
          const arr = JSON.parse(raw) as number[]
          setVisited(new Set(arr))
        }
      } catch {}
    }
  }, [persistKey])

  return (
    <Box borderWidth="1px" borderColor={itemBorder} borderRadius="lg" p={4} bg={cardBg} boxShadow="sm">
      <Heading size="md" mb={3}>{title}</Heading>
      {/* Solo un acordeón abierto a la vez (al abrir uno, el anterior se cierra) */}
      <Accordion onChange={handleAccordionChange}>
        {content.sections.map((sec, idx) => (
          <AccordionItem
            key={`sec-${idx}`}
            borderWidth="1px"
            borderColor={visited.has(idx) ? itemVisitedBorder : itemBorder}
            borderRadius="md"
            overflow="hidden"
            mb={3}
            bg={visited.has(idx) ? itemVisitedBg : undefined}
          >
            <h2>
              <AccordionButton px={4} py={3}
                _hover={{ bg: itemHoverBg }}
                _expanded={{ bg: itemExpandedBg }}
                bg={visited.has(idx) ? itemVisitedBg : undefined}
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