import type { EducationalResource } from '../services/resources'
import type { ResourceProgressData } from '../services/resourceProgress'
import type { GeneratedResource } from '../services/types'

export function computeResourceProgressPct(resource: EducationalResource, prog: ResourceProgressData | null): number {
  try {
    const content: GeneratedResource = (resource.content as GeneratedResource) || { title: resource.title }
    const studyEls = content?.studyElements || []
    const hasTimeline = studyEls.some(el => el.type === 'timeline')
    const hasCoursePresentation = studyEls.some(el => el.type === 'course_presentation')
    const hasAccordionNotes = studyEls.some(el => el.type === 'accordion_notes')
    const hasMnemonicCreator = studyEls.some(el => el.type === 'mnemonic_creator')

    const quizPresent: boolean = !!(content?.gameelement?.quiz || content?.quiz)
    const groupSortPresent: boolean = !!(content?.gameelement?.groupSort || content?.groupSort)
    const findPresent: boolean = !!(content?.gameelement?.findTheMatch || content?.findTheMatch)
    const openBoxPresent: boolean = !!(content?.gameelement?.openTheBox || content?.openTheBox)
    const anagramPresent: boolean = !!(content?.gameelement?.anagram || content?.anagram)
    const linesPresent: boolean = !!(content?.gameelement?.matchUp || content?.matchUp || content?.gameElements)

    const presentSegments = [
      hasTimeline,
      hasCoursePresentation,
      hasAccordionNotes,
      hasMnemonicCreator,
      quizPresent,
      linesPresent,
      groupSortPresent,
      openBoxPresent,
      anagramPresent,
      findPresent,
    ]
    const totalSegments = presentSegments.filter(Boolean).length
    if (totalSegments === 0) return 0

    const p: ResourceProgressData = prog ?? ({} as ResourceProgressData)
    const completedSegments = [
      hasTimeline && !!p.timelineConfirmed,
      hasCoursePresentation && !!p.coursePresentationConfirmed,
      hasAccordionNotes && !!p.accordionNotesConfirmed,
      hasMnemonicCreator && (!!p.mnemonicCreatorConfirmed || !!p.mnemonicPracticeConfirmed),
      quizPresent && !!p.quizConfirmed,
      linesPresent && !!p.linesConfirmed,
      groupSortPresent && !!p.groupSortConfirmed,
      openBoxPresent && !!p.openBoxConfirmed,
      anagramPresent && !!p.anagramConfirmed,
      findPresent && !!p.findTheMatchConfirmed,
    ].filter(Boolean).length

    const pct = Math.round((completedSegments / totalSegments) * 100)
    return Math.max(0, Math.min(100, pct))
  } catch {
    return 0
  }
}
