import { HStack, Button } from '@chakra-ui/react'
import MatchUpLines from '../../components/templates/MatchUpLines'
import type { MatchUpContent } from '../../services/types'

interface LinesStageProps {
  content: MatchUpContent
  attemptId: string | null
  resourceId: string | null
  linesCompleted: boolean
  onProgress: (results: Array<{ term: string; chosen: string; expected: string; correct: boolean }>, allCorrect: boolean) => void
  onCompleted: (results: Array<{ term: string; chosen: string; expected: string; correct: boolean }>) => void
  onContinue: () => void
  continueLabel?: string
}

export default function LinesStage({ content, attemptId, resourceId, linesCompleted, onProgress, onCompleted, onContinue, continueLabel }: LinesStageProps) {
  return (
    <>
      <MatchUpLines
        key={`lines-${attemptId ?? 'noattempt'}-${resourceId ?? 'nores'}`}
        content={content}
        onProgress={onProgress}
        onCompleted={onCompleted}
      />
      <HStack mt={4} justify="flex-end">
        <Button colorScheme="blue" onClick={onContinue} isDisabled={!linesCompleted}>{continueLabel || 'Continuar'}</Button>
      </HStack>
    </>
  )
}
