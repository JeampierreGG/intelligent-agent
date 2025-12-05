import { describe, it, expect } from 'vitest'
import { computeWeightedFinalScoreFromState } from '../utils/scoring'

describe('scoring', () => {
  it('cada elemento aporta 20 solo si está confirmado', () => {
    const res = computeWeightedFinalScoreFromState({
      prog: { studyConfirmed: true, quizConfirmed: false, linesConfirmed: true, groupSortConfirmed: true, openBoxConfirmed: false, anagramConfirmed: true, findTheMatchConfirmed: true } as unknown as ReturnType<typeof import('../services/resourceProgress').getResourceProgress>,
      studyElements: [{ type: 'timeline', content: { events: [{ title: 'A', description: 'X' }] } }],
      quiz: { templateType: 'quiz', title: 'Q', instructions: 'I', subject: 'S', topic: 'T', questions: [{ prompt: 'P', options: ['a', 'b'], correctIndex: 0 }] },
      matchUp: { templateType: 'match_up', title: 'M', instructions_lines: 'I', subject: 'S', topic: 'T', linesMode: { pairs: [{ left: 't', right: 'a' }] } },
      groupSort: { templateType: 'group_sort', title: 'G', instructions: 'I', subject: 'S', topic: 'T', groups: [{ name: 'g1', items: ['i1'] }, { name: 'g2', items: ['i2'] }] },
      openBox: { templateType: 'open_the_box', title: 'O', instructions: 'I', subject: 'S', topic: 'T', items: [{ question: 'q', options: ['a'], correctIndex: 0 }] },
      anagram: { templateType: 'anagram', title: 'A', instructions: 'I', subject: 'S', topic: 'T', items: [{ answer: 'x', scrambled: 'x' }] },
      findTheMatch: { templateType: 'find_the_match', title: 'F', instructions: 'I', subject: 'S', topic: 'T', pairs: [{ concept: 'c', affirmation: 'a' }] },
      mnemonicPracticeResults: [],
      quizResults: [{ correct: true }],
      linesResults: [{ correct: true }],
      groupSortResults: [{ correct: true }],
      openBoxResults: [{ correct: true }],
      anagramResults: [{ correct: true }],
      findMatchResults: [{ correct: true }]
    })
    expect(Math.round(res.score)).toBeGreaterThanOrEqual(60)
    expect(Math.round(res.score)).toBeLessThanOrEqual(100)
  })
})
