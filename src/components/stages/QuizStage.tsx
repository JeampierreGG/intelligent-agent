import { HStack, Button } from '@chakra-ui/react'
import Quiz from '../../components/templates/Quiz'
import type { QuizContent } from '../../services/types'

interface QuizStageProps {
  content: QuizContent
  attemptId: string | null
  resourceId: string | null
  isCompleted: boolean
  onComplete: (result: { details?: Array<{ prompt: string; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }> }) => void
  onContinue: () => void
  continueLabel?: string
}

export default function QuizStage({ content, attemptId, resourceId, isCompleted, onComplete, onContinue, continueLabel }: QuizStageProps) {
  return (
    <>
      <Quiz
        key={`quiz-${attemptId ?? 'noattempt'}-${resourceId ?? 'nores'}`}
        content={content}
        onComplete={onComplete}
      />
      <HStack mt={4} justify="flex-end">
        <Button colorScheme="blue" onClick={onContinue} isDisabled={!isCompleted}>{continueLabel || 'Continuar'}</Button>
      </HStack>
    </>
  )
}
