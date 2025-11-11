import { useEffect, useState } from 'react'
import { Box, VStack, HStack, Text, Textarea, Button, RadioGroup, Radio, Card, CardBody, useColorModeValue, Spinner } from '@chakra-ui/react'
import type { DebateContent } from '../../services/types'
import { generateInitialDebate, generateDebateRound } from '../../services/debates.ts'

interface DebateProps {
  title: string
  content: DebateContent
  onComplete: () => void
}

export default function Debate({ title, content, onComplete }: DebateProps) {
  const [question, setQuestion] = useState<string>('')
  const [proOpinion, setProOpinion] = useState<string>('')
  const [conOpinion, setConOpinion] = useState<string>('')
  const [userOpinion, setUserOpinion] = useState<string>('')
  const [position, setPosition] = useState<'pro' | 'con'>('pro')
  const [loading, setLoading] = useState<boolean>(false)
  const cardBg = useColorModeValue('white', 'gray.800')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    generateInitialDebate(content.subject, content.topic)
      .then(({ question, pro, con }) => {
        if (!mounted) return
        setQuestion(question)
        setProOpinion(pro)
        setConOpinion(con)
      })
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [content.subject, content.topic])

  const handleNext = async () => {
    if (!userOpinion.trim()) return
    setLoading(true)
    try {
      const { pro, con } = await generateDebateRound(question, userOpinion, position)
      setProOpinion(pro)
      setConOpinion(con)
      setUserOpinion('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card bg={cardBg} shadow="sm" borderWidth="1px">
      <CardBody>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="xl" fontWeight="bold">Debate: {title}</Text>
          {content.instructions && (
            <Text fontSize="sm" color="gray.700">{content.instructions}</Text>
          )}
          {loading && !question ? (
            <HStack><Spinner size="sm" /><Text>Cargando tema de debate…</Text></HStack>
          ) : (
            <>
              <Box p={3} borderWidth="1px" borderRadius="md">
                <Text fontSize="md" fontWeight="semibold">Pregunta</Text>
                <Text fontSize="sm">{question || `¿Debatamos sobre ${content.topic} en ${content.subject}?`}</Text>
              </Box>
              <HStack align="start" spacing={4}>
                <Box flex={1} p={3} borderWidth="1px" borderRadius="md" bg="green.50" borderColor="green.200">
                  <Text fontSize="sm" fontWeight="semibold">A favor</Text>
                  <Text fontSize="sm">{proOpinion}</Text>
                </Box>
                <Box flex={1} p={3} borderWidth="1px" borderRadius="md" bg="red.50" borderColor="red.200">
                  <Text fontSize="sm" fontWeight="semibold">En contra</Text>
                  <Text fontSize="sm">{conOpinion}</Text>
                </Box>
              </HStack>
              <Box>
                <Text fontSize="sm" mb={2}>Elige tu postura y escribe tu opinión</Text>
                <RadioGroup value={position} onChange={(val) => setPosition((val as 'pro' | 'con'))}>
                  <HStack spacing={6}>
                    <Radio value="pro">A favor</Radio>
                    <Radio value="con">En contra</Radio>
                  </HStack>
                </RadioGroup>
                <Textarea mt={2} placeholder="Escribe aquí tu opinión…" value={userOpinion} onChange={e => setUserOpinion(e.target.value)} />
              </Box>
              <HStack justify="space-between">
                <Button onClick={handleNext} isLoading={loading} colorScheme="blue">Generar nuevos argumentos</Button>
                <Button onClick={onComplete} variant="outline">Finalizar</Button>
              </HStack>
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  )
}