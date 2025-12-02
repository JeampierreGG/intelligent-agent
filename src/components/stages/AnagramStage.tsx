import { Button } from '@chakra-ui/react'
import Anagram from '../../components/templates/Anagram'
import type { AnagramContent } from '../../services/types'

interface AnagramStageProps {
  content: AnagramContent
  attemptId: string | null
  resourceId: string | null
  isCompleted: boolean
  onComplete: (details: Array<{ answer: string; userAnswer: string; correct: boolean; clue?: string }>) => void
  onContinue: () => void
  continueLabel?: string
}

export default function AnagramStage({ content, attemptId, resourceId, isCompleted, onComplete, onContinue, continueLabel }: AnagramStageProps) {
  return (
    <Anagram
      key={`an-${attemptId ?? 'noattempt'}-${resourceId ?? 'nores'}`}
      content={content}
      onComplete={onComplete}
      renderContinueButton={
        <Button colorScheme="blue" onClick={onContinue} isDisabled={!isCompleted}>{continueLabel || 'Continuar'}</Button>
      }
    />
  )
}
