
import Debate from '../../components/templates/Debate'
import type { DebateContent } from '../../services/types'

interface DebateStageProps {
  title: string
  content: DebateContent
  attemptId: string | null
  resourceId: string | null
  onComplete: (level: number) => void
  onSkip: () => void
}

export default function DebateStage({ title, content, attemptId, resourceId, onComplete }: DebateStageProps) {
  return (
    <>
      <Debate
        key={`deb-${attemptId ?? 'noattempt'}-${resourceId ?? 'nores'}`}
        title={title}
        content={content}
        onComplete={onComplete}
      />
     
    </>
  )
}
