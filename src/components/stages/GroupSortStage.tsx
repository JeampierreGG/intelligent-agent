import { HStack, Button } from '@chakra-ui/react'
import GroupSort from '../../components/templates/GroupSort'
import type { GroupSortContent } from '../../services/types'

interface GroupSortStageProps {
  content: GroupSortContent
  attemptId: string | null
  resourceId: string | null
  isCompleted: boolean
  onComplete: (results: Array<{ item: string; chosenGroup: string; expectedGroup: string; correct: boolean }>) => void
  onContinue: () => void
  continueLabel?: string
}

export default function GroupSortStage({ content, attemptId, resourceId, isCompleted, onComplete, onContinue, continueLabel }: GroupSortStageProps) {
  return (
    <>
      <GroupSort
        key={`gs-${attemptId ?? 'noattempt'}-${resourceId ?? 'nores'}`}
        content={content}
        onComplete={(res) => {
          const expectedMap: Record<string, string> = {}
          content.groups.slice(0, 2).forEach(g => g.items.forEach(i => { expectedMap[i] = g.name }))
          const results = Object.entries(res.placements).map(([item, grp]) => ({
            item,
            chosenGroup: grp || '',
            expectedGroup: expectedMap[item],
            correct: (grp || '') === expectedMap[item]
          }))
          onComplete(results)
        }}
      />
      <HStack mt={4} justify="flex-end">
        <Button colorScheme="blue" onClick={onContinue} isDisabled={!isCompleted}>{continueLabel || 'Continuar'}</Button>
      </HStack>
    </>
  )
}
