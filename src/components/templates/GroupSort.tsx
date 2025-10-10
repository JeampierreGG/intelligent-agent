import React, { useMemo, useState } from 'react'
import { Box, Heading, Text, SimpleGrid, Card, CardBody, VStack, HStack, Badge, Tag, TagLabel, CloseButton } from '@chakra-ui/react'
import type { GroupSortContent } from '../../services/types'

interface GroupSortProps {
  content: GroupSortContent
  onComplete?: (result: { total: number; placed: number; placements: Record<string, string | null> }) => void
}

const GroupSort: React.FC<GroupSortProps> = ({ content, onComplete }) => {
  // Máximo de 12 ítems totales, sin mínimo
  const MAX_ITEMS = 12
  // Obtener un conjunto único de ítems desde la definición (cada ítem pertenece a un grupo correcto)
  const allItems = useMemo(() => {
    const set = new Set<string>()
    content.groups.forEach(g => g.items.forEach(i => set.add(i)))
    const unique = Array.from(set)
    return unique.slice(0, MAX_ITEMS)
  }, [content])

  // Colocaciones actuales: item -> nombre del grupo (o null si no colocado)
  const [placements, setPlacements] = useState<Record<string, string | null>>(() => Object.fromEntries(allItems.map(i => [i, null])))

  const placedCount = Object.values(placements).filter(Boolean).length
  const total = allItems.length

  // Arrastrar y soltar
  const handleDragStart = (e: React.DragEvent, item: string) => {
    e.dataTransfer.setData('text/plain', item)
  }

  const handleDropToGroup = (e: React.DragEvent, groupName: string) => {
    e.preventDefault()
    const item = e.dataTransfer.getData('text/plain')
    if (!item) return
    if (!allItems.includes(item)) return
    setPlacements(prev => ({ ...prev, [item]: groupName }))
  }

  const handleDropToPool = (e: React.DragEvent) => {
    e.preventDefault()
    const item = e.dataTransfer.getData('text/plain')
    if (!item) return
    if (!allItems.includes(item)) return
    setPlacements(prev => ({ ...prev, [item]: null }))
  }

  const unplacedItems = allItems.filter(i => !placements[i])

  React.useEffect(() => {
    if (placedCount === total) {
      onComplete?.({ total, placed: placedCount, placements })
    }
  }, [placedCount, total, placements, onComplete])

  return (
    <Box>
      <Heading size="md" mb={2}>{content.title}</Heading>
      <Text mb={2}>{content.instructions}</Text>
      {/* Oculto: palabra paraguas solicitada evitar mostrar */}

      {/* Pool de ítems para arrastrar */}
      <Card mb={4}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropToPool}
      >
        <CardBody>
          <Heading size="sm" mb={2}>Palabras para arrastrar</Heading>
          {unplacedItems.length === 0 ? (
            <Text color="gray.500">No hay ítems sin colocar. Puedes arrastrar aquí para quitar de un grupo.</Text>
          ) : (
            <HStack wrap="wrap" spacing={2}>
              {unplacedItems.map(item => (
                <Tag key={item} size="lg" variant="solid" colorScheme="blue" draggable onDragStart={(e) => handleDragStart(e, item)}>
                  <TagLabel>{item}</TagLabel>
                </Tag>
              ))}
            </HStack>
          )}
        </CardBody>
      </Card>

      {/* Grupos grandes como zonas de drop */}
      <SimpleGrid columns={[1, 2, 3]} spacing={4}>
        {content.groups.map(group => {
          const itemsInGroup = allItems.filter(i => placements[i] === group.name)
          return (
            <Card key={group.name}
              borderWidth="2px"
              borderStyle="dashed"
              minH="200px"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropToGroup(e, group.name)}
            >
              <CardBody>
                <Heading size="sm" mb={2}>{group.name}</Heading>
                {itemsInGroup.length === 0 ? (
                  <Text color="gray.500">Arrastra aquí las palabras que correspondan.</Text>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    {itemsInGroup.map(item => (
                      <HStack
                        key={`${group.name}-${item}`}
                        justify="space-between"
                        borderWidth="1px"
                        borderRadius="md"
                        p={2}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                      >
                        <Text>{item}</Text>
                        <CloseButton onClick={() => setPlacements(prev => ({ ...prev, [item]: null }))} />
                      </HStack>
                    ))}
                  </VStack>
                )}
              </CardBody>
            </Card>
          )
        })}
      </SimpleGrid>

      <Box mt={4}>
        <Text>Progreso: {placedCount} / {total} colocados</Text>
        <Badge ml={2} colorScheme="purple">{content.subject} / {content.topic}</Badge>
      </Box>
    </Box>
  )
}

export default GroupSort