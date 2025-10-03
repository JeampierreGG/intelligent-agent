import React, { useEffect, useState } from 'react'
import { Box, Heading, Text, Badge, Card, CardBody, Grid, GridItem, Checkbox, Icon } from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { keyframes } from '@emotion/react'
import type { StudyTimelineContent } from '../../services/types'
import { ensureTimelineForResource, getEventProgress, markEventChecked } from '../../services/timelineEventProgress'

interface TimelineProps {
  title: string
  content: StudyTimelineContent
  resourceId?: string
  onCompleted?: () => void
}

// Línea de tiempo vertical centrada con nodos alternando izquierda/derecha
const Timeline: React.FC<TimelineProps> = ({ title, content, resourceId, onCompleted }) => {
  const colors = ['orange.400', 'purple.400', 'green.400', 'blue.400', 'pink.400', 'teal.400']
  const [progressIndex, setProgressIndex] = useState(0)
  const extractYear = (d?: string): string => {
    if (!d) return 's.f.'
    const m = d.match(/\b(\d{4})\b/)
    return m ? m[1] : (new Date(d).getFullYear() || NaN).toString()
  }
  // Ordenar eventos por fecha ascendente (el de menor fecha arriba)
  const parseDate = (d?: string): number => {
    if (!d) return Number.POSITIVE_INFINITY
    // Intentar YYYY-MM-DD, YYYY o extraer primer año
    const m = d.match(/\b(\d{4})\b/)
    if (m) return parseInt(m[1], 10)
    const t = Date.parse(d)
    return isNaN(t) ? Number.POSITIVE_INFINITY : t
  }
  const events = [...(content?.events || [])].sort((a, b) => parseDate(a.date) - parseDate(b.date))

  // Animación profesional vertical para indicar continuar
  const bounceDown = keyframes`
    0% { transform: translateY(0); opacity: 0.6; }
    50% { transform: translateY(6px); opacity: 1; }
    100% { transform: translateY(0); opacity: 0.6; }
  `

  const [timelineId, setTimelineId] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      if (!resourceId) return
      const ensured = await ensureTimelineForResource(resourceId, events)
      if (!ensured) return
      setTimelineId(ensured.timeline_id)
      const progress = await getEventProgress(ensured.timeline_id)
      const checkedIdxs = Object.keys(progress)
        .filter(k => progress[Number(k)])
        .map(k => Number(k))
      const nextIndex = checkedIdxs.length > 0 ? Math.min(events.length, Math.max(...checkedIdxs) + 1) : 0
      setProgressIndex(nextIndex)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId])

  const advance = async () => {
    const current = progressIndex
    const nextIndex = Math.min(current + 1, events.length)
    setProgressIndex(nextIndex)
    if (timelineId != null) {
      await markEventChecked(timelineId, current)
    }
    if (nextIndex >= events.length && onCompleted) {
      onCompleted()
    }
  }
  return (
    <Box position="relative">
      <Heading size="md" mb={3}>{title}</Heading>

      {/* Contenedor relativo para dibujar la línea vertical al centro */}
      <Box position="relative">
        {/* Línea vertical centrada */}
        <Box position="absolute" left="50%" transform="translateX(-1px)" top={0} bottom={0} width="2px" bg="gray.300" />

        <Grid templateColumns="1fr 24px 1fr" columnGap={0} rowGap={0}>
          {events.map((ev, idx) => {
            const isLeft = idx % 2 === 0
            const color = colors[idx % colors.length]
            const isCompleted = idx < progressIndex
            const isActive = idx === progressIndex
            const isDisabled = idx > progressIndex
            const CardNode = (
              <Box>
                <Card
                  key={`ev-card-${idx}`}
                  variant="outline"
                  borderColor={isActive ? color : 'gray.300'}
                  opacity={isDisabled ? 0.6 : 1}
                  cursor={isActive ? 'pointer' : 'default'}
                  onClick={() => { if (isActive) advance() }}
                >
                  <CardBody>
                    <Box mb={1} display="flex" alignItems="center" gap={2}>
                      <Checkbox
                        isChecked={isCompleted}
                        isDisabled={!isActive}
                        onChange={(e) => { if (isActive && e.target.checked) advance() }}
                      />
                      <Badge colorScheme="purple">{extractYear(ev.date)}</Badge>
                      <Heading size="sm">{ev.title}</Heading>
                    </Box>
                    {/* Información relevante completa para generar juegos (MatchUpLines/Images) */}
                    <Text color="gray.700" whiteSpace="pre-line" lineHeight={1.25}>{ev.description}</Text>
                  </CardBody>
                </Card>
                {isActive && progressIndex < events.length && (
                  <Box mt={2} display="flex" justifyContent={isLeft ? 'flex-end' : 'flex-start'}>
                    <Icon as={ChevronDownIcon} color={color} boxSize={6} sx={{ animation: `${bounceDown} 1.2s ease-in-out infinite` }} />
                  </Box>
                )}
              </Box>
            )
            const CenterColumn = (
              <Box position="relative" h="100%" py={0} mt={idx > 0 ? -5 : 0} zIndex={1}>
                {/* Nodo central */}
                <Box display="flex" alignItems="center" justifyContent="center">
                  <Box w="12px" h="12px" borderRadius="50%" bg={color} border="2px solid white" boxShadow={`0 0 0 2px`} />
                </Box>
                {/* Conector horizontal corto hacia la tarjeta */}
                {isLeft ? (
                  <Box position="absolute" left="-12px" top="18px" w="12px" h="2px" bg={color} />
                ) : (
                  <Box position="absolute" right="-12px" top="18px" w="12px" h="2px" bg={color} />
                )}
                {/* Flecha vertical se muestra bajo la tarjeta activa, no aquí */}
              </Box>
            )
            return (
              <React.Fragment key={`row-${idx}`}>
                {/* Columna izquierda: tarjeta si idx par, si no espacio */}
                <GridItem>{isLeft ? CardNode : <Box />}</GridItem>
                {/* Columna centro: nodo */}
                <GridItem>{CenterColumn}</GridItem>
                {/* Columna derecha: tarjeta si idx impar */}
                <GridItem>{!isLeft ? CardNode : <Box />}</GridItem>
              </React.Fragment>
            )
          })}
        </Grid>
      </Box>
    </Box>
  )
}

export default Timeline