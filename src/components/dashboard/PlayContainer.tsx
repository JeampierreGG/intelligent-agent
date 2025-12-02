import { VStack, HStack, Text, Card, CardBody, Spinner } from '@chakra-ui/react'
import { useState } from 'react'
import PlayHud from '../hud/PlayHud'
import StudyStage from '../stages/StudyStage'
import MnemonicPracticeStage from '../stages/MnemonicPracticeStage'
import QuizStage from '../stages/QuizStage'
import LinesStage from '../stages/LinesStage'
import GroupSortStage from '../stages/GroupSortStage'
import FindTheMatchStage from '../stages/FindTheMatchStage'
import OpenBoxStage from '../stages/OpenBoxStage'
import AnagramStage from '../stages/AnagramStage'
import DebateStage from '../stages/DebateStage'
import LinesSummaryStage from '../stages/LinesSummaryStage'
import GroupSortSummaryStage from '../stages/GroupSortSummaryStage'
import FindTheMatchSummaryStage from '../stages/FindTheMatchSummaryStage'
import ResourceSummary from '../summaries/ResourceSummary'
import type { StudyElement, MatchUpContent, QuizContent, GroupSortContent, FindTheMatchContent, OpenTheBoxContent, AnagramContent, DebateContent, StudyMnemonicContent } from '../../services/types'
import type { ResourceProgressData, ResourceStage } from '../../services/resourceProgress'
import type { User } from '@supabase/supabase-js'
import type { EducationalResource } from '../../services/resources'

interface PlayContainerProps {
  cardBg: string
  borderColor: string
  startingNewAttempt: boolean
  headerTitle: string
  user: User | null
  resources: EducationalResource[]
  playingResourceId: string | null
  matchUpStage: 'study' | 'mnemonic_practice' | 'quiz' | 'quiz_summary' | 'lines' | 'lines_summary' | 'group_sort' | 'group_sort_summary' | 'find_the_match' | 'find_the_match_summary' | 'open_box' | 'anagram' | 'debate' | 'summary' | null
  setMatchUpStage: (stage: PlayContainerProps['matchUpStage']) => void
  onExitOpen: () => void
  // Study
  playingStudyElements: StudyElement[] | null
  studyIndex: number
  setStudyIndex: (n: number) => void
  studyItemCompleted: boolean
  setStudyItemCompleted: (v: boolean) => void
  isSavingMnemonic: boolean
  mnemonicAuto: string
  mnemonicDraft: string
  setMnemonicAuto: (t: string) => void
  setMnemonicDraft: (t: string) => void
  persistMnemonic: (content: StudyMnemonicContent, auto: string, draft: string) => Promise<void>
  // Attempt
  currentAttemptId: string | null
  // Game contents
  playingMatchUp: MatchUpContent | null
  playingQuiz: QuizContent | null
  playingGroupSort: GroupSortContent | null
  playingFindTheMatch: FindTheMatchContent | null
  playingOpenBox: OpenTheBoxContent | null
  playingAnagram: AnagramContent | null
  playingDebate: DebateContent | null
  // Results/flags
  linesCompleted: boolean
  setLinesCompleted: (v: boolean) => void
  linesResults: Array<{ term: string; chosen: string; expected: string; correct: boolean }>
  setLinesResults: (r: Array<{ term: string; chosen: string; expected: string; correct: boolean }>) => void
  quizCompleted: boolean
  setQuizCompleted: (v: boolean) => void
  quizResults: Array<{ prompt: string; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>
  setQuizResults: (r: PlayContainerProps['quizResults']) => void
  groupSortCompleted: boolean
  setGroupSortCompleted: (v: boolean) => void
  groupSortResults: Array<{ item: string; chosenGroup: string; expectedGroup: string; correct: boolean }>
  setGroupSortResults: (r: PlayContainerProps['groupSortResults']) => void
  openBoxCompleted: boolean
  setOpenBoxCompleted: (v: boolean) => void
  openBoxResults: Array<{ question: string; options: string[]; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>
  setOpenBoxResults: (r: PlayContainerProps['openBoxResults']) => void
  anagramCompleted: boolean
  setAnagramCompleted: (v: boolean) => void
  anagramResults: Array<{ answer: string; userAnswer: string; correct: boolean; clue?: string }>
  setAnagramResults: (r: PlayContainerProps['anagramResults']) => void
  findMatchResults: Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>
  setFindMatchResults: (r: PlayContainerProps['findMatchResults']) => void
  setMnemonicPracticeResults: (r: Array<{ prompt: string; answer: string; userAnswer: string; correct: boolean }>) => void
  mnemonicPracticeCompleted: boolean
  setMnemonicPracticeCompleted: (v: boolean) => void
  // Helpers
  getResourceProgress: (userId: string, resourceId: string) => ResourceProgressData | null
  computeCardProgress: (resource: EducationalResource, prog: ResourceProgressData | null) => number
  computeWeightedFinalScore: () => { score: number; breakdown: Array<{ name: string; contribution: number; weight: number }> }
  saveStage: (stage: ResourceStage, flags?: Partial<ResourceProgressData>) => void
  saveResourceProgress: (userId: string, resourceId: string, payload: Partial<ResourceProgressData>) => void
  finalizeSession: () => Promise<void>
  onExitSummary: () => Promise<void>
  onRetry: () => Promise<void>
  notifyMnemonicScore: (score: number) => void
}

export default function PlayContainer(props: PlayContainerProps) {
  const {
    cardBg, borderColor, startingNewAttempt, headerTitle, user, resources, playingResourceId,
    matchUpStage, setMatchUpStage,
    playingStudyElements, studyIndex, setStudyIndex, studyItemCompleted, setStudyItemCompleted,
    isSavingMnemonic, mnemonicAuto, mnemonicDraft, setMnemonicAuto, setMnemonicDraft, persistMnemonic,
    currentAttemptId,
    playingMatchUp, playingQuiz, playingGroupSort, playingFindTheMatch, playingOpenBox, playingAnagram, playingDebate,
    linesCompleted, setLinesCompleted, linesResults, setLinesResults,
    quizCompleted, setQuizCompleted, quizResults, setQuizResults,
    groupSortCompleted, setGroupSortCompleted, groupSortResults, setGroupSortResults,
    openBoxCompleted, setOpenBoxCompleted, openBoxResults, setOpenBoxResults,
    anagramCompleted, setAnagramCompleted, setAnagramResults,
    anagramResults,
    findMatchResults, setFindMatchResults, mnemonicPracticeCompleted, setMnemonicPracticeCompleted, setMnemonicPracticeResults,
    getResourceProgress, computeCardProgress, computeWeightedFinalScore, saveStage, saveResourceProgress,
    onExitSummary, onRetry,
    notifyMnemonicScore,
  } = props

  const [findMatchOmitted, setFindMatchOmitted] = useState<boolean>(false)
  const [debateLevel, setDebateLevel] = useState<number>(0)
  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Text fontSize="2xl" fontWeight="bold">{headerTitle}</Text>
        <HStack>
          <Text as="button" fontSize="sm" color="blue.600" onClick={() => { props.onExitOpen() }}>Salir</Text>
        </HStack>
      </HStack>
      {(() => {
        const res = resources.find(r => r.id === playingResourceId)
        const prog = (user?.id && playingResourceId) ? getResourceProgress(user.id, playingResourceId) : null
        const pct = res ? computeCardProgress(res, prog) : 0
        const { score } = computeWeightedFinalScore()
        return <>
          <PlayHud pct={pct} score={score} />
          {(() => {
            const studyCount = Array.isArray(playingStudyElements) ? playingStudyElements.length : 0
            const total = studyCount
              + (playingQuiz ? 1 : 0)
              + (playingMatchUp ? 1 : 0)
              + (playingGroupSort ? 1 : 0)
              + (playingFindTheMatch ? 1 : 0)
              + (playingOpenBox ? 1 : 0)
              + (playingAnagram ? 1 : 0)
              + (playingDebate ? 1 : 0)
            let current = 0
            if (matchUpStage === 'study') {
              current = Math.min((studyIndex + 1), Math.max(1, studyCount))
            } else {
              const offQuiz = studyCount + 1
              const offLines = studyCount + (playingQuiz ? 1 : 0) + 1
              const offGroupSort = studyCount + (playingQuiz ? 1 : 0) + (playingMatchUp ? 1 : 0) + 1
              const offFind = studyCount + (playingQuiz ? 1 : 0) + (playingMatchUp ? 1 : 0) + (playingGroupSort ? 1 : 0) + 1
              const offOpen = studyCount + (playingQuiz ? 1 : 0) + (playingMatchUp ? 1 : 0) + (playingGroupSort ? 1 : 0) + (playingFindTheMatch ? 1 : 0) + 1
              const offAnagram = studyCount + (playingQuiz ? 1 : 0) + (playingMatchUp ? 1 : 0) + (playingGroupSort ? 1 : 0) + (playingFindTheMatch ? 1 : 0) + (playingOpenBox ? 1 : 0) + 1
              const offDebate = studyCount + (playingQuiz ? 1 : 0) + (playingMatchUp ? 1 : 0) + (playingGroupSort ? 1 : 0) + (playingFindTheMatch ? 1 : 0) + (playingOpenBox ? 1 : 0) + (playingAnagram ? 1 : 0) + 1
              switch (matchUpStage) {
                case 'quiz': current = offQuiz; break
                case 'lines': current = offLines; break
                case 'group_sort': current = offGroupSort; break
                case 'find_the_match': current = offFind; break
                case 'open_box': current = offOpen; break
                case 'anagram': current = offAnagram; break
                case 'debate': current = offDebate; break
                default: current = 0
              }
            }
            if (total > 0 && current > 0) {
              return (
                <HStack justify="flex-end" mt={2}>
                  <Text fontSize="sm" color="gray.600">Paso {current} de {total}</Text>
                </HStack>
              )
            }
            return null
          })()}
        </>
      })()}
      {startingNewAttempt && (
        <HStack mt={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.600">Iniciando nuevo intento...</Text>
        </HStack>
      )}
      <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          {matchUpStage === 'study' && playingStudyElements && playingStudyElements.length > 0 && (
            <StudyStage
              title={headerTitle}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              elements={playingStudyElements}
              index={studyIndex}
              studyItemCompleted={studyItemCompleted}
              isSavingMnemonic={isSavingMnemonic}
              mnemonicAuto={mnemonicAuto}
              mnemonicDraft={mnemonicDraft}
              nextStageAfterStudy={playingQuiz ? 'quiz' : 'lines'}
              onAutoGenerated={(text) => setMnemonicAuto(text)}
              onDraftChange={(text) => setMnemonicDraft(text)}
              onSaveProgress={(payload) => { if (user?.id && playingResourceId) saveResourceProgress(user.id, playingResourceId, payload) }}
              onSetIndex={(next) => setStudyIndex(next)}
              onSetCompleted={(val) => setStudyItemCompleted(val)}
              onGoStage={(stage) => { setMatchUpStage(stage); if (user?.id && playingResourceId) saveResourceProgress(user.id, playingResourceId, { stage }) }}
              onPersistMnemonic={persistMnemonic}
            />
          )}
          {matchUpStage === 'quiz' && playingQuiz && (
            <QuizStage
              content={playingQuiz}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              isCompleted={quizCompleted}
              continueLabel={(() => {
                const isFinal = !playingMatchUp && !playingGroupSort && !playingFindTheMatch && !playingOpenBox && !playingAnagram && !playingDebate
                return isFinal ? 'Finalizar' : 'Continuar'
              })()}
              onComplete={(result) => {
                setQuizCompleted(true)
                setQuizResults(result.details || [])
                if (user?.id && playingResourceId) {
                  saveStage('quiz')
                }
              }}
              onContinue={() => {
                const isFinal = !playingMatchUp && !playingGroupSort && !playingFindTheMatch && !playingOpenBox && !playingAnagram && !playingDebate
                if (isFinal) {
                  setMatchUpStage('summary')
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: 'summary', quizConfirmed: true })
                  }
                } else {
                  setMatchUpStage('lines')
                  if (user?.id && playingResourceId) {
                    saveStage('lines', { quizConfirmed: true })
                  }
                }
              }}
            />
          )}
          {matchUpStage === 'mnemonic_practice' && playingStudyElements && playingStudyElements[studyIndex]?.type === 'mnemonic_creator' && (
            <MnemonicPracticeStage
              content={(playingStudyElements[studyIndex]?.content as StudyMnemonicContent)}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              mnemonicText={mnemonicDraft || mnemonicAuto}
              isCompleted={mnemonicPracticeCompleted}
              onComplete={(results, score) => {
                setMnemonicPracticeCompleted(true)
                setMnemonicPracticeResults(results)
                notifyMnemonicScore(score)
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'mnemonic_practice', mnemonicPracticeCompleted: true })
                }
              }}
              onContinue={() => {
                setMatchUpStage(playingQuiz ? 'quiz' : 'lines')
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: playingQuiz ? 'quiz' : 'lines', mnemonicPracticeConfirmed: true })
                }
              }}
            />
          )}
          
          {matchUpStage === 'lines' && (
            <LinesStage
              content={playingMatchUp as MatchUpContent}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              linesCompleted={linesCompleted}
              continueLabel={(() => {
                const nextStage = (playingGroupSort ? 'group_sort' : (playingFindTheMatch ? 'find_the_match' : (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null))))) as PlayContainerProps['matchUpStage']
                return nextStage ? 'Continuar' : 'Finalizar'
              })()}
              onProgress={(results) => {
                setLinesResults(results)
                const allAssigned = results.every(r => (r.chosen && r.chosen.length > 0))
                setLinesCompleted(allAssigned)
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'lines', linesCompleted: allAssigned })
                }
              }}
              onCompleted={(results) => {
                setLinesResults(results)
                setLinesCompleted(true)
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'lines', linesCompleted: true })
                }
              }}
              onContinue={async () => {
                setMatchUpStage('lines_summary')
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'lines_summary', linesConfirmed: true })
                }
              }}
            />
          )}
          
          {matchUpStage === 'group_sort' && playingGroupSort && (
            <GroupSortStage
              content={playingGroupSort}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              isCompleted={groupSortCompleted}
              continueLabel={(() => {
                const nextStage = (playingFindTheMatch ? 'find_the_match' : (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null)))) as PlayContainerProps['matchUpStage']
                return nextStage ? 'Continuar' : 'Finalizar'
              })()}
              onComplete={(results) => {
                setGroupSortCompleted(true)
                setGroupSortResults(results)
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'group_sort' })
                }
              }}
              onContinue={async () => {
                setMatchUpStage('group_sort_summary')
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'group_sort_summary', groupSortConfirmed: true })
                }
              }}
            />
          )}
          
          {matchUpStage === 'find_the_match' && playingFindTheMatch && (
            <FindTheMatchStage
              content={playingFindTheMatch}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              onComplete={async (details, omitted) => {
                setFindMatchResults(details)
                setFindMatchOmitted(!!omitted)
                const allCorrect = details.length > 0 && details.every(r => r.correct)
                if (allCorrect && !omitted) {
                  const nextStage = (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null))) as PlayContainerProps['matchUpStage']
                  if (!nextStage) {
                    setMatchUpStage('summary')
                    if (user?.id && playingResourceId) {
                      saveResourceProgress(user.id, playingResourceId, { stage: 'summary', findTheMatchConfirmed: true })
                    }
                  } else {
                    setMatchUpStage(nextStage)
                    if (user?.id && playingResourceId) {
                      saveResourceProgress(user.id, playingResourceId, { stage: nextStage, findTheMatchConfirmed: true })
                    }
                  }
                } else {
                  setMatchUpStage('find_the_match_summary')
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: 'find_the_match_summary', findTheMatchConfirmed: true })
                  }
                }
              }}
            />
          )}
          
          {matchUpStage === 'open_box' && playingOpenBox && (
            <OpenBoxStage
              content={playingOpenBox}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              isCompleted={openBoxCompleted}
              continueLabel={(() => {
                const nextStage = (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null)) as PlayContainerProps['matchUpStage']
                return nextStage ? 'Continuar' : 'Finalizar'
              })()}
              onComplete={(details) => {
                setOpenBoxCompleted(true)
                setOpenBoxResults(details)
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'open_box' })
                }
              }}
              onContinue={async () => {
                const nextStage = (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null)) as PlayContainerProps['matchUpStage']
                if (!nextStage) {
                  setMatchUpStage('summary')
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: 'summary', openBoxConfirmed: true })
                  }
                } else {
                  setMatchUpStage(nextStage)
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: nextStage, openBoxConfirmed: true })
                  }
                }
              }}
            />
          )}
          {matchUpStage === 'anagram' && playingAnagram && (
            <AnagramStage
              content={playingAnagram}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              isCompleted={anagramCompleted}
              continueLabel={(() => {
                const nextStage = (playingDebate ? 'debate' : null) as PlayContainerProps['matchUpStage']
                return nextStage ? 'Continuar' : 'Finalizar'
              })()}
              onComplete={(details) => {
                setAnagramCompleted(true)
                setAnagramResults(details)
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'anagram' })
                }
              }}
              onContinue={async () => {
                const nextStage = (playingDebate ? 'debate' : null) as PlayContainerProps['matchUpStage']
                if (!nextStage) {
                  setMatchUpStage('summary')
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: 'summary', anagramConfirmed: true })
                  }
                } else {
                  setMatchUpStage(nextStage)
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: nextStage, anagramConfirmed: true })
                  }
                }
              }}
            />
          )}
          {matchUpStage === 'debate' && playingDebate && (
            <DebateStage
              title={headerTitle}
              content={playingDebate}
              attemptId={currentAttemptId}
              resourceId={playingResourceId}
              onComplete={async (lvl) => {
                setDebateLevel(lvl)
                setMatchUpStage('summary')
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'summary', debateLevel: lvl })
                }
              }}
              onSkip={() => {
                setMatchUpStage('summary')
                if (user?.id && playingResourceId) {
                  saveResourceProgress(user.id, playingResourceId, { stage: 'summary', debateLevel: debateLevel })
                }
              }}
            />
          )}

          {matchUpStage === 'lines_summary' && (
            <LinesSummaryStage
              results={linesResults}
              continueLabel={(() => {
                const nextStage = (playingGroupSort ? 'group_sort' : (playingFindTheMatch ? 'find_the_match' : (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null))))) as PlayContainerProps['matchUpStage']
                return nextStage ? 'Continuar' : 'Finalizar'
              })()}
              onContinue={() => {
                const nextStage = (playingGroupSort ? 'group_sort' : (playingFindTheMatch ? 'find_the_match' : (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null))))) as PlayContainerProps['matchUpStage']
                if (!nextStage) {
                  setMatchUpStage('summary')
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: 'summary' })
                  }
                } else {
                  setMatchUpStage(nextStage)
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: nextStage })
                  }
                }
              }}
            />
          )}
          {matchUpStage === 'group_sort_summary' && (
            <GroupSortSummaryStage
              results={groupSortResults}
              continueLabel={(() => {
                const nextStage = (playingFindTheMatch ? 'find_the_match' : (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null)))) as PlayContainerProps['matchUpStage']
                return nextStage ? 'Continuar' : 'Finalizar'
              })()}
              onContinue={() => {
                const nextStage = (playingFindTheMatch ? 'find_the_match' : (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null)))) as PlayContainerProps['matchUpStage']
                if (!nextStage) {
                  setMatchUpStage('summary')
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: 'summary' })
                  }
                } else {
                  setMatchUpStage(nextStage)
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: nextStage })
                  }
                }
              }}
            />
          )}
          {matchUpStage === 'find_the_match_summary' && (
            <FindTheMatchSummaryStage
              results={findMatchResults}
              omitted={findMatchOmitted}
              continueLabel={(() => {
                const nextStage = (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null))) as PlayContainerProps['matchUpStage']
                return nextStage ? 'Continuar' : 'Finalizar'
              })()}
              onContinue={() => {
                const nextStage = (playingOpenBox ? 'open_box' : (playingAnagram ? 'anagram' : (playingDebate ? 'debate' : null))) as PlayContainerProps['matchUpStage']
                if (!nextStage) {
                  setMatchUpStage('summary')
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: 'summary' })
                  }
                } else {
                  setMatchUpStage(nextStage)
                  if (user?.id && playingResourceId) {
                    saveResourceProgress(user.id, playingResourceId, { stage: nextStage })
                  }
                }
              }}
            />
          )}
          {matchUpStage === 'summary' && (
            <ResourceSummary
              score={computeWeightedFinalScore().score}
              breakdown={computeWeightedFinalScore().breakdown}
              openBoxResults={openBoxResults || []}
              findMatchResults={findMatchResults || []}
              quizResults={quizResults || []}
              groupSortResults={groupSortResults || []}
              groupNames={(playingGroupSort?.groups || []).map(g => g.name)}
              linesResults={linesResults || []}
              anagramResults={anagramResults || []}
              debateLevel={debateLevel}
              onExit={() => { void onExitSummary() }}
              onRetry={() => { void onRetry() }}
            />
          )}
          
        </CardBody>
      </Card>
    </VStack>
  )
}
