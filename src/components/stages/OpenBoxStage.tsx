import { Button } from '@chakra-ui/react'
import OpenTheBox from '../../components/templates/OpenTheBox'
import type { OpenTheBoxContent } from '../../services/types'

interface OpenBoxStageProps {
  content: OpenTheBoxContent
  attemptId: string | null
  resourceId: string | null
  isCompleted: boolean
  onComplete: (details: Array<{ question: string; options: string[]; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>) => void
  onContinue: () => void
  continueLabel?: string
}

export default function OpenBoxStage({ content, attemptId, resourceId, isCompleted, onComplete, onContinue, continueLabel }: OpenBoxStageProps) {
  return (
    <OpenTheBox
      key={`otb-${attemptId ?? 'noattempt'}-${resourceId ?? 'nores'}`}
      content={content}
      onComplete={onComplete}
      renderContinueButton={
        <Button colorScheme="blue" onClick={onContinue} isDisabled={!isCompleted}>{continueLabel || 'Continuar'}</Button>
      }
    />
  )
}
