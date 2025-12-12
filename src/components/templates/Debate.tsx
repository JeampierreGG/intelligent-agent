import { useEffect, useState } from 'react'
import { Box, VStack, HStack, Text, Textarea, Button, Card, CardBody, useColorModeValue, Spinner } from '@chakra-ui/react'
import type { DebateContent } from '../../services/types'
import { generateInitialDebate, generateDebateRound } from '../../services/debates.ts'

interface DebateProps {
  title: string
  content: DebateContent
  onComplete: (level: number) => void
}

export default function Debate({ title, content, onComplete }: DebateProps) {
  const [question, setQuestion] = useState<string>('')
  const [proOpinion, setProOpinion] = useState<string>('')
  const [conOpinion, setConOpinion] = useState<string>('')
  const [proInput, setProInput] = useState<string>('')
  const [conInput, setConInput] = useState<string>('')
  const [dynamicTitle, setDynamicTitle] = useState<string>(title)
  const [loading, setLoading] = useState<boolean>(false)
  const [level, setLevel] = useState<number>(0)
  const cardBg = useColorModeValue('white', 'gray.800')

  const sanitizeLettersSpaces = (s: string) => (s || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '')

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

  const handleRespond = async (side: 'pro' | 'con') => {
    const userOpinion = (side === 'pro' ? proInput : conInput).trim()
    if (!userOpinion) return
    setLoading(true)
    try {
      setQuestion(userOpinion)
      const { pro, con } = await generateDebateRound(userOpinion, userOpinion, side)
      setProOpinion(pro)
      setConOpinion(con)
      if (side === 'pro') setProInput('')
      else setConInput('')
      setDynamicTitle(title)
      setLevel((n) => n + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card bg={cardBg} shadow="sm" borderWidth="1px">
      <CardBody>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="xl" fontWeight="bold">Debate: {dynamicTitle || title}</Text>
          <Text fontSize="sm" color="gray.600">Nivel del debate: {level}</Text>
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
                <Text fontSize="sm" mb={2} whiteSpace="pre-wrap">{proOpinion}</Text>
                <Textarea size="sm" placeholder="Escribe tu argumento a favor…" value={proInput} onChange={e => setProInput(sanitizeLettersSpaces(e.target.value))} isDisabled={loading || !!conInput.trim()} />
                <HStack justify="end" mt={2}>
                    <Button size="sm" colorScheme="green" onClick={() => handleRespond('pro')} isDisabled={loading || !proInput.trim() || !!conInput.trim()} isLoading={loading}>Responder</Button>
                </HStack>
              </Box>
              <Box flex={1} p={3} borderWidth="1px" borderRadius="md" bg="red.50" borderColor="red.200">
                <Text fontSize="sm" fontWeight="semibold">En contra</Text>
                <Text fontSize="sm" mb={2} whiteSpace="pre-wrap">{conOpinion}</Text>
                <Textarea size="sm" placeholder="Escribe tu argumento en contra…" value={conInput} onChange={e => setConInput(sanitizeLettersSpaces(e.target.value))} isDisabled={loading || !!proInput.trim()} />
                <HStack justify="end" mt={2}>
                    <Button size="sm" colorScheme="red" onClick={() => handleRespond('con')} isDisabled={loading || !conInput.trim() || !!proInput.trim()} isLoading={loading}>Responder</Button>
                </HStack>
              </Box>
            </HStack>
            <HStack justify="flex-end">
              <Button onClick={() => onComplete(level)} variant="outline">Finalizar</Button>
            </HStack>
          </>
        )}
        </VStack>
      </CardBody>
    </Card>
  )
}
