import { useCallback, useState } from 'react'
import { saveResourceProgress } from '../services/resourceProgress'

export type StageId = 'study' | 'mnemonic_practice' | 'quiz' | 'quiz_summary' | 'lines' | 'lines_summary' | 'group_sort' | 'group_sort_summary' | 'find_the_match' | 'find_the_match_summary' | 'open_box' | 'anagram' | 'debate' | 'summary'

export function useResourcePlayFlow(userId: string | null, resourceId: string | null) {
  const [stage, setStage] = useState<StageId | null>(null)

  const saveStage = useCallback((next: StageId, flags?: Record<string, unknown>) => {
    setStage(next)
    if (userId && resourceId) {
      saveResourceProgress(userId, resourceId, { stage: next, ...(flags || {}) })
    }
  }, [userId, resourceId])

  return {
    stage,
    setStage,
    saveStage,
  }
}
