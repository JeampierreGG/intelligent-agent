import React, { useState } from 'react'
import { Box, Heading, Text, Card, CardBody, HStack, Tag, Image, VStack } from '@chakra-ui/react'
import type { MatchUpContent, MatchUpImagesItem } from '../../services/types'

interface ImageResultItem {
  expected: string; // término correcto para esta imagen
  chosen?: string;  // término que el usuario dejó debajo de la imagen
  imageDescription: string;
  imageUrl?: string;
}

interface MatchUpImagesProps {
  content: MatchUpContent
  onCompleted?: (results: ImageResultItem[]) => void
  onProgress?: (results: ImageResultItem[], allCorrect: boolean) => void
}

// Plantilla Match Up (modo imágenes): arrastrar términos hacia sus respectivas imágenes
const MatchUpImages: React.FC<MatchUpImagesProps> = ({ content, onCompleted, onProgress }) => {
  // Utilidad para mezclar elementos aleatoriamente
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  // Limitar SIEMPRE a 4 elementos mostrados (requisito)
  const sourceItems = (content.imagesMode?.items || []).slice(0, 4)
  // Orden aleatorio de imágenes
  const [items] = useState<MatchUpImagesItem[]>(shuffle<MatchUpImagesItem>(sourceItems))
  // Orden aleatorio de términos
  const initialTerms = shuffle<string>(sourceItems.map(i => i.term))
  const [paletteTerms, setPaletteTerms] = useState<string[]>(initialTerms)
  // asignaciones: imagen -> término
  const [assignmentsByImage, setAssignmentsByImage] = useState<Record<number, string | null>>(
    Object.fromEntries(items.map((_, idx) => [idx, null])) as Record<number, string | null>
  )
  // asignación inversa: término -> índice de imagen
  const [assignmentOfTerm, setAssignmentOfTerm] = useState<Record<string, number | null>>(
    Object.fromEntries(initialTerms.map((t) => [t, null])) as Record<string, number | null>
  )
  const [reportedCompleted, setReportedCompleted] = useState<boolean>(false)

  const onDragStart = (e: React.DragEvent<HTMLSpanElement>, term: string) => {
    e.dataTransfer.setData('text/plain', term)
  }

  const onDropOnImage = (e: React.DragEvent<HTMLDivElement>, imageIndex: number) => {
    e.preventDefault()
    const term = e.dataTransfer.getData('text/plain')
    if (!term) return

    // Construir asignaciones nuevas de forma determinista para usar en el resumen
    const newAssignments = { ...assignmentsByImage }
    const previousTermOnImage = newAssignments[imageIndex]
    if (previousTermOnImage && previousTermOnImage !== term) {
      setPaletteTerms((prev) => Array.from(new Set([...prev, previousTermOnImage!])))
      setAssignmentOfTerm((prev) => ({ ...prev, [previousTermOnImage!]: null }))
    }

    const prevImageIdx = assignmentOfTerm[term]
    if (prevImageIdx !== null && prevImageIdx !== undefined) {
      newAssignments[prevImageIdx] = null
    }
    newAssignments[imageIndex] = term

    // Aplicar estados
    setAssignmentsByImage(newAssignments)
    setAssignmentOfTerm((prev) => ({ ...prev, [term]: imageIndex }))

    // Quitar término de la paleta si estaba ahí
    setPaletteTerms((prev) => prev.filter((t) => t !== term))

    // La notificación de progreso/completion se hace en useEffect
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const allAssigned = paletteTerms.length === 0

  // Reportar progreso y completion de forma reactiva
  React.useEffect(() => {
    const results: ImageResultItem[] = items.map((item, idx) => ({
      expected: item.term,
      chosen: assignmentsByImage[idx] || undefined,
      imageDescription: item.imageDescription,
      imageUrl: item.imageUrl,
    }))
    const allCorrect = allAssigned && items.every((item, idx) => assignmentsByImage[idx] === item.term)
    if (onProgress) {
      onProgress(results, allCorrect)
    }
    if (allCorrect && onCompleted && !reportedCompleted) {
      onCompleted(results)
      setReportedCompleted(true)
    }
    if (!allCorrect && reportedCompleted) {
      setReportedCompleted(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentsByImage, allAssigned])

  return (
    <Box>
      <Heading size="md" mb={2}>{content.title}</Heading>
      <Text color="gray.600" mb={4}>{content.instructions_images}</Text>

      {/* Paleta de términos para arrastrar */}
      <HStack spacing={2} mb={4} flexWrap="wrap">
        {paletteTerms.map((term) => (
          <Tag key={term} size="lg" colorScheme="blue" cursor="grab" draggable onDragStart={(e) => onDragStart(e, term)}>
            {term}
          </Tag>
        ))}
      </HStack>

      {/* Imágenes de destino en UNA SOLA FILA con desplazamiento horizontal si es necesario */}
      <HStack spacing={4} overflowX="auto" align="stretch" py={2}>
        {items.map((item, idx) => (
          <Card key={`img-${idx}`} minW="180px" onDrop={(e) => onDropOnImage(e, idx)} onDragOver={onDragOver} borderColor={assignmentsByImage[idx] ? 'blue.400' : 'gray.200'} borderWidth={assignmentsByImage[idx] ? '2px' : '1px'}>
            <CardBody p={3}>
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.term}
                  borderRadius="md"
                  mb={2}
                  boxSize="120px"
                  objectFit="cover"
                  pointerEvents="none"
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              )}
              {/* Debajo de la imagen: mostrar el término asignado (si existe), como etiqueta draggable para reubicar */}
              <VStack align="start" spacing={2}>
                {assignmentsByImage[idx] && (
                  <Tag size="lg" colorScheme="purple" cursor="grab" draggable onDragStart={(e) => onDragStart(e, assignmentsByImage[idx] as string)} fontSize="md">
                    {assignmentsByImage[idx]}
                  </Tag>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </HStack>

      {allAssigned && (
        <Box mt={6} p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
          <Text color="blue.700">Has asignado todas las palabras a alguna imagen. Puedes seguir reubicándolas si deseas antes de continuar.</Text>
        </Box>
      )}
    </Box>
  )
}

export default MatchUpImages