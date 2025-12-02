import { Button, HStack } from '@chakra-ui/react'
import MnemonicPractice from '../../components/templates/MnemonicPractice'
import type { StudyMnemonicContent } from '../../services/types'

interface MnemonicPracticeStageProps {
  content: StudyMnemonicContent
  attemptId: string | null
  resourceId: string | null
  mnemonicText: string
  isCompleted: boolean
  onComplete: (results: Array<{ prompt: string; answer: string; userAnswer: string; correct: boolean }>, score: number) => void
  onContinue: () => void
}

export default function MnemonicPracticeStage({ content, attemptId, resourceId, mnemonicText, isCompleted, onComplete, onContinue }: MnemonicPracticeStageProps) {
  return (
    <MnemonicPractice
      key={`mnprac-${attemptId ?? 'noattempt'}-${resourceId ?? 'nores'}`}
      content={content}
      mnemonicText={mnemonicText}
      onComplete={onComplete}
      renderContinueButton={
        <HStack justify="flex-end">
          <Button colorScheme="blue" onClick={onContinue} isDisabled={!isCompleted}>Continuar</Button>
        </HStack>
      }
    />
  )
}
