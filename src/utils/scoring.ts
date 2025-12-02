import type {
  MatchUpContent,
  QuizContent,
  GroupSortContent,
  OpenTheBoxContent,
  FindTheMatchContent,
  AnagramContent,
  StudyElement,
} from '../services/types'
import type { ResourceProgressData } from '../services/resourceProgress'

export type BreakdownItem = {
  name: string
  weight: number
  totalItems: number
  correct: number
  contribution: number
}

export function computeWeightedFinalScoreFromState(opts: {
  prog: ResourceProgressData | null
  quiz?: QuizContent | null
  matchUp?: MatchUpContent | null
  groupSort?: GroupSortContent | null
  openBox?: OpenTheBoxContent | null
  anagram?: AnagramContent | null
  findTheMatch?: FindTheMatchContent | null
  studyElements?: StudyElement[] | null
  mnemonicPracticeResults?: Array<{ correct: boolean }>
  quizResults?: Array<{ correct: boolean }>
  linesResults?: Array<{ correct: boolean }>
  groupSortResults?: Array<{ correct: boolean }>
  openBoxResults?: Array<{ correct: boolean }>
  anagramResults?: Array<{ correct: boolean }>
  findMatchResults?: Array<{ correct: boolean }>
}): { score: number; breakdown: BreakdownItem[] } {
  const elements: Array<{ name: string; denom: number; correct: number }> = []

  const prog: ResourceProgressData = opts.prog ?? ({} as ResourceProgressData)

  const studyList = (opts.studyElements || []) as StudyElement[]
  const hasTimeline = studyList.some(el => el.type === 'timeline')
  const hasCoursePresentation = studyList.some(el => el.type === 'course_presentation')
  const hasAccordionNotes = studyList.some(el => el.type === 'accordion_notes')
  const hasMnemonicCreator = studyList.some(el => el.type === 'mnemonic_creator')

  if (hasTimeline) {
    elements.push({ name: 'Línea de tiempo', denom: 1, correct: prog.timelineConfirmed ? 1 : 0 })
  }

  if (hasCoursePresentation) {
    elements.push({ name: 'Presentación de curso', denom: 1, correct: prog.coursePresentationConfirmed ? 1 : 0 })
  }

  if (hasAccordionNotes) {
    elements.push({ name: 'Notas en acordeón', denom: 1, correct: prog.accordionNotesConfirmed ? 1 : 0 })
  }

  if (hasMnemonicCreator) {
    void hasMnemonicCreator
  }

  if (opts.quiz) {
    const denom = opts.quiz.questions?.length ?? 0
    const correct = (opts.quizResults || []).filter(q => q.correct).length
    elements.push({ name: 'Quiz', denom, correct: prog.quizConfirmed ? correct : 0 })
  }

  if (opts.matchUp) {
    const denom = opts.matchUp.linesMode?.pairs?.length ?? 0
    const correct = (opts.linesResults || []).filter(r => r.correct).length
    elements.push({ name: 'Unir parejas', denom, correct: prog.linesConfirmed ? correct : 0 })
  }

  if (opts.groupSort) {
    const denom = (opts.groupSort.groups ?? []).slice(0, 2).reduce((sum, g) => sum + g.items.length, 0)
    const correct = (opts.groupSortResults || []).filter(r => r.correct).length
    elements.push({ name: 'Ordenar por grupo', denom, correct: prog.groupSortConfirmed ? correct : 0 })
  }

  if (opts.openBox) {
    const denom = opts.openBox.items?.length ?? 0
    const correct = (opts.openBoxResults || []).filter(r => r.correct).length
    elements.push({ name: 'Abrecajas', denom, correct: prog.openBoxConfirmed ? correct : 0 })
  }

  if (opts.anagram) {
    const denom = opts.anagram.items?.length ?? 0
    const correct = (opts.anagramResults || []).filter(a => a.correct).length
    elements.push({ name: 'Anagrama', denom, correct: prog.anagramConfirmed ? correct : 0 })
  }

  if (opts.findTheMatch) {
    const denom = opts.findTheMatch.pairs?.length ?? 0
    const correct = (opts.findMatchResults || []).filter(r => r.correct).length
    elements.push({ name: 'Cada oveja con su pareja', denom, correct: prog.findTheMatchConfirmed ? correct : 0 })
  }

  if ((opts.mnemonicPracticeResults?.length ?? 0) > 0) {
    const list = opts.mnemonicPracticeResults || []
    const denom = list.length
    const correct = list.filter(r => r.correct).length
    elements.push({ name: 'Práctica de mnemotecnia', denom, correct: prog.mnemonicPracticeConfirmed ? correct : 0 })
  }

  const totalElements = elements.length
  if (totalElements === 0) {
    return { score: 0, breakdown: [] }
  }

  const weightPerElement = 20
  let sum = 0
  const breakdown: BreakdownItem[] = elements.map(e => {
    const perItem = e.denom > 0 ? weightPerElement / e.denom : weightPerElement
    const contrib = perItem * e.correct
    sum += contrib
    return { name: e.name, weight: weightPerElement, totalItems: e.denom, correct: e.correct, contribution: contrib }
  })

  const score = Math.round(sum * 100) / 100
  return { score, breakdown }
}
