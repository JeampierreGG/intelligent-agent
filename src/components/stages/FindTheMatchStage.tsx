import FindTheMatch from '../../components/templates/FindTheMatch'
import type { FindTheMatchContent } from '../../services/types'

interface FindTheMatchStageProps {
  content: FindTheMatchContent
  attemptId: string | null
  resourceId: string | null
  onComplete: (details: Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>, omitted?: boolean) => void
}

export default function FindTheMatchStage({ content, attemptId, resourceId, onComplete }: FindTheMatchStageProps) {
  return (
    <FindTheMatch
      key={`ftm-${attemptId ?? 'noattempt'}-${resourceId ?? 'nores'}`}
      content={content}
      onComplete={onComplete}
    />
  )
}
