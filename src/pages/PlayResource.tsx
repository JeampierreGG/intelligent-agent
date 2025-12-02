import { Box, Flex, VStack, useColorModeValue, useToast, Spinner, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@chakra-ui/react'
import { MdDashboard, MdLibraryBooks, MdLeaderboard } from 'react-icons/md'
import { useEffect, useState, useCallback, lazy, Suspense, useRef } from 'react'
import { useAuth } from '../contexts/useAuth'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import AppSidebar from '../components/layout/AppSidebar'
import { getResourceById, type EducationalResource } from '../services/resources'
import { getResourceProgress, saveResourceProgress, clearResourceProgress } from '../services/resourceProgress'
import { computeResourceProgressPct } from '../utils/progress'
import { computeWeightedFinalScoreFromState } from '../utils/scoring'
import { startNewAttempt, completeAttempt, saveAttemptFinalScore, getAttemptCount } from '../services/attempts'
 
import { persistMnemonic } from '../services/mnemonics.ts'
import type { MatchUpContent, StudyElement, QuizContent, GroupSortContent, AnagramContent, OpenTheBoxContent, FindTheMatchContent, DebateContent, GeneratedResource } from '../services/types'
import type { ResourceProgressData, ResourceStage } from '../services/resourceProgress'

const PlayContainer = lazy(() => import('../components/dashboard/PlayContainer'))

export default function PlayResource() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { resourceId } = useParams()
  const [params] = useSearchParams()
  const forceNew = params.get('new') === '1'

  const bgColor = useColorModeValue('#f7fafc', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')

  const [resources, setResources] = useState<EducationalResource[]>([])
  const [resource, setResource] = useState<EducationalResource | null>(null)
  const [playingTitle, setPlayingTitle] = useState<string>('')

  const [playingResourceId, setPlayingResourceId] = useState<string | null>(null)
  const [playingMatchUp, setPlayingMatchUp] = useState<MatchUpContent | null>(null)
  const [playingStudyElements, setPlayingStudyElements] = useState<StudyElement[] | null>(null)
  const [playingQuiz, setPlayingQuiz] = useState<QuizContent | null>(null)
  const [playingGroupSort, setPlayingGroupSort] = useState<GroupSortContent | null>(null)
  const [playingFindTheMatch, setPlayingFindTheMatch] = useState<FindTheMatchContent | null>(null)
  const [playingOpenBox, setPlayingOpenBox] = useState<OpenTheBoxContent | null>(null)
  const [playingAnagram, setPlayingAnagram] = useState<AnagramContent | null>(null)
  const [playingDebate, setPlayingDebate] = useState<DebateContent | null>(null)

  const [matchUpStage, setMatchUpStage] = useState<'study' | 'mnemonic_practice' | 'quiz' | 'quiz_summary' | 'lines' | 'lines_summary' | 'group_sort' | 'group_sort_summary' | 'find_the_match' | 'find_the_match_summary' | 'open_box' | 'anagram' | 'debate' | 'summary' | null>(null)
  const [studyIndex, setStudyIndex] = useState<number>(0)
  const [studyItemCompleted, setStudyItemCompleted] = useState<boolean>(false)
  const [isSavingMnemonic, setIsSavingMnemonic] = useState<boolean>(false)
  const [mnemonicAuto, setMnemonicAuto] = useState<string>('')
  const [mnemonicDraft, setMnemonicDraft] = useState<string>('')

  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null)
  const [startingNewAttempt, setStartingNewAttempt] = useState<boolean>(false)
  const [finalScoreSaved, setFinalScoreSaved] = useState<boolean>(false)
  const [exitOpen, setExitOpen] = useState<boolean>(false)
  const [pendingTo, setPendingTo] = useState<string | null>(null)
  const [exiting, setExiting] = useState<boolean>(false)

  const [linesCompleted, setLinesCompleted] = useState<boolean>(false)
  const [linesResults, setLinesResults] = useState<Array<{ term: string; chosen: string; expected: string; correct: boolean }>>([])
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false)
  const [quizResults, setQuizResults] = useState<Array<{ prompt: string; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>>([])
  const [groupSortCompleted, setGroupSortCompleted] = useState<boolean>(false)
  const [groupSortResults, setGroupSortResults] = useState<Array<{ item: string; chosenGroup: string; expectedGroup: string; correct: boolean }>>([])
  const [openBoxCompleted, setOpenBoxCompleted] = useState<boolean>(false)
  const [openBoxResults, setOpenBoxResults] = useState<Array<{ question: string; options: string[]; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>>([])
  const [anagramCompleted, setAnagramCompleted] = useState<boolean>(false)
  const [anagramResults, setAnagramResults] = useState<Array<{ answer: string; userAnswer: string; correct: boolean; clue?: string }>>([])
  const [findMatchResults, setFindMatchResults] = useState<Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>>([])
  const [mnemonicPracticeCompleted, setMnemonicPracticeCompleted] = useState<boolean>(false)
  const [mnemonicPracticeResults, setMnemonicPracticeResults] = useState<Array<{ prompt: string; answer: string; userAnswer: string; correct: boolean }>>([])

  
 

  const computeCardProgress = useCallback((res: EducationalResource, prog: ResourceProgressData | null): number => {
    return computeResourceProgressPct(res, prog)
  }, [])

  const computeWeightedFinalScore = useCallback(() => {
    const prog = (user?.id && playingResourceId) ? getResourceProgress(user.id, playingResourceId) : null
    return computeWeightedFinalScoreFromState({
      prog,
      quiz: playingQuiz,
      matchUp: playingMatchUp,
      groupSort: playingGroupSort,
      openBox: playingOpenBox,
      anagram: playingAnagram,
      findTheMatch: playingFindTheMatch,
      studyElements: playingStudyElements,
      mnemonicPracticeResults,
      quizResults,
      linesResults,
      groupSortResults,
      openBoxResults,
      anagramResults,
      findMatchResults,
    })
  }, [user?.id, playingResourceId, playingQuiz, playingMatchUp, playingGroupSort, playingOpenBox, playingAnagram, playingFindTheMatch, playingStudyElements, mnemonicPracticeResults, quizResults, linesResults, groupSortResults, openBoxResults, anagramResults, findMatchResults])

  const saveStage = useCallback((stage: ResourceStage, flags?: Record<string, unknown>) => {
    if (!user?.id || !playingResourceId) return
    saveResourceProgress(user.id, playingResourceId, { stage, ...(flags || {}) })
  }, [user?.id, playingResourceId])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (matchUpStage && matchUpStage !== 'summary') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => { window.removeEventListener('beforeunload', onBeforeUnload) }
  }, [matchUpStage])

  const confirmExit = useCallback(async () => {
    setExiting(true)
    try {
      if (currentAttemptId) {
        const res = computeWeightedFinalScore()
        const rounded = Math.round(res.score)
        const prog = (user?.id && playingResourceId) ? getResourceProgress(user.id, playingResourceId) : null
        const attemptPctRaw = resource ? computeResourceProgressPct(resource, prog) : null
        const attemptPct = (attemptPctRaw == null ? undefined : attemptPctRaw)
          const summarySnapshot = {
            score: rounded,
            breakdown: res.breakdown,
            quizResults,
            linesResults,
            groupSortResults,
            openBoxResults,
            anagramResults,
            findMatchResults,
            mnemonicPracticeResults,
            attempt_progress_pct: attemptPct,
            difficulty: resource?.difficulty,
            debate_level: prog?.debateLevel ?? 0
          }
        try { await saveAttemptFinalScore(currentAttemptId, rounded, res.breakdown, summarySnapshot) } catch (err) { console.warn('saveAttemptFinalScore exit error:', err) }
        try { await completeAttempt(currentAttemptId) } catch (err) { console.warn('completeAttempt exit error:', err) }
      }
    } finally {
      setExiting(false)
      setExitOpen(false)
      const dest = pendingTo || '/dashboard'
      try { navigate(dest, { replace: true }) } catch (err) { console.warn('navigate after exit error:', err) }
    }
  }, [currentAttemptId, computeWeightedFinalScore, quizResults, linesResults, groupSortResults, openBoxResults, anagramResults, findMatchResults, user?.id, playingResourceId, resource, pendingTo, navigate])
  useEffect(() => {
    const persistFinalScore = async () => {
      if (matchUpStage === 'summary' && currentAttemptId && !finalScoreSaved) {
        const res = computeWeightedFinalScore()
        const rounded = Math.round(res.score)
        const prog = (user?.id && playingResourceId) ? getResourceProgress(user.id, playingResourceId) : null
        const attemptPctRaw = resource ? computeResourceProgressPct(resource, prog) : null
        const attemptPct = (attemptPctRaw == null ? undefined : attemptPctRaw)
        const summarySnapshot = {
          score: rounded,
          breakdown: res.breakdown,
          quizResults,
          linesResults,
          groupSortResults,
          openBoxResults,
          anagramResults,
          findMatchResults,
          mnemonicPracticeResults,
          attempt_progress_pct: attemptPct,
          difficulty: resource?.difficulty,
          debate_level: prog?.debateLevel ?? 0
        }
        try {
          const ok = await saveAttemptFinalScore(currentAttemptId, rounded, res.breakdown, summarySnapshot)
          if (ok) {
            setFinalScoreSaved(true)
            if (user?.id && playingResourceId) {
              localStorage.setItem(`final_score_${user.id}_${playingResourceId}`, String(rounded))
            }
          }
        } catch (err) {
          console.warn('saveAttemptFinalScore error:', err)
        }
      }
    }
    persistFinalScore()
  }, [matchUpStage, currentAttemptId, finalScoreSaved, computeWeightedFinalScore, quizResults, linesResults, groupSortResults, openBoxResults, anagramResults, findMatchResults, user?.id, playingResourceId])

  const loadGuardKeyRef = useRef<string | null>(null)
  const handleRetry = useCallback(async () => {
    if (!user?.id || !resource?.id) return
    const res = resource
    const content = res.content as GeneratedResource
    clearResourceProgress(user.id, res.id)
    try {
      setStartingNewAttempt(true)
      setFinalScoreSaved(false)
      const attempt = await startNewAttempt(res.id, user.id)
      setCurrentAttemptId(attempt?.id ?? null)
      try {
        const snapshot: { gameelement?: GeneratedResource['gameelement']; studyElements?: StudyElement[] } = {
          gameelement: (content as GeneratedResource)?.gameelement,
          studyElements: (content as GeneratedResource)?.studyElements,
        }
        if (attempt?.id) { const { saveAttemptSnapshot } = await import('../services/attempts'); await saveAttemptSnapshot(attempt.id, snapshot) }
      } catch (err) { console.warn('saveAttemptSnapshot error:', err) }
      setStudyIndex(0)
      setStudyItemCompleted(false)
      setQuizCompleted(false)
      setGroupSortCompleted(false)
      setOpenBoxCompleted(false)
      setAnagramCompleted(false)
      setMnemonicPracticeCompleted(false)
      setLinesCompleted(false)
      setLinesResults([])
      setQuizResults([])
      setGroupSortResults([])
      setOpenBoxResults([])
      setAnagramResults([])
      setFindMatchResults([])
      setMatchUpStage(((content?.studyElements?.length || 0) > 0) ? 'study' : 'lines')
      setStartingNewAttempt(false)
    } catch (err) {
      console.warn('retry startNewAttempt error:', err)
      setStartingNewAttempt(false)
    }
  }, [user?.id, resource])
  useEffect(() => {
    const load = async () => {
      if (!user?.id || !resourceId) return
      const guardKey = `${user.id}:${resourceId}:${forceNew ? '1' : '0'}`
      if (loadGuardKeyRef.current === guardKey) return
      loadGuardKeyRef.current = guardKey
      try {
        const { data } = await getResourceById(resourceId, user.id)
        if (!data) { navigate('/recursos'); return }
        const res = data as EducationalResource
        setResource(res)
        setResources([res])
        setPlayingResourceId(res.id)
        setPlayingTitle(res.title)

        const content = res.content as GeneratedResource
        const matchUp: MatchUpContent | null = content?.gameelement?.matchUp || content?.matchUp || (content?.gameElements as MatchUpContent | null) || null
        const quiz: QuizContent | null = content?.gameelement?.quiz || content?.quiz || null
        const groupSort: GroupSortContent | null = content?.gameelement?.groupSort || content?.groupSort || null
        const openTheBox: OpenTheBoxContent | null = content?.gameelement?.openTheBox || content?.openTheBox || null
        const anagram: AnagramContent | null = content?.gameelement?.anagram || content?.anagram || null
        const findTheMatch: FindTheMatchContent | null = content?.gameelement?.findTheMatch || content?.findTheMatch || null

        setPlayingMatchUp(matchUp)
        setPlayingQuiz(quiz)
        setPlayingGroupSort(groupSort)
        setPlayingOpenBox(openTheBox)
        setPlayingAnagram(anagram)
        setPlayingFindTheMatch(findTheMatch)
        setPlayingStudyElements(content?.studyElements || null)

        // Generar elemento de Debate temporal al iniciar el recurso
        setPlayingDebate({ templateType: 'debate', title: 'Debate', subject: res.subject || 'General', topic: res.topic || 'Tema', instructions: 'Ingresa tu opinión y debate a favor o en contra. El nivel aumenta cada ronda.' })

        if (user?.id) {
          if (forceNew) {
            clearResourceProgress(user.id, res.id)
            try {
              setStartingNewAttempt(true)
              const attempt = await startNewAttempt(res.id, user.id)
              setCurrentAttemptId(attempt?.id ?? null)
              try {
                const snapshot: { gameelement?: GeneratedResource['gameelement']; studyElements?: StudyElement[] } = {
                  gameelement: (content as GeneratedResource)?.gameelement,
                  studyElements: (content as GeneratedResource)?.studyElements,
                }
                if (attempt?.id) { const { saveAttemptSnapshot } = await import('../services/attempts'); await saveAttemptSnapshot(attempt.id, snapshot) }
              } catch (err) { console.warn('saveAttemptSnapshot error:', err) }
              // Reset de estado del flujo para iniciar desde el principio
              setStudyIndex(0)
              setStudyItemCompleted(false)
              setQuizCompleted(false)
              setGroupSortCompleted(false)
              setOpenBoxCompleted(false)
              setAnagramCompleted(false)
              setMnemonicPracticeCompleted(false)
              setLinesCompleted(false)
              setLinesResults([])
              setQuizResults([])
              setGroupSortResults([])
              setOpenBoxResults([])
              setAnagramResults([])
              setFindMatchResults([])
              setMatchUpStage(((content?.studyElements?.length || 0) > 0) ? 'study' : 'lines')
              setStartingNewAttempt(false)
            } catch (err) {
              console.warn('startNewAttempt error:', err)
              setStartingNewAttempt(false)
            }
          } else {
            try {
              const count = await getAttemptCount(res.id, user.id)
              if (count < 1) {
                setStartingNewAttempt(true)
                const attempt = await startNewAttempt(res.id, user.id)
                setCurrentAttemptId(attempt?.id ?? null)
                try {
                  const snapshot: { gameelement?: GeneratedResource['gameelement']; studyElements?: StudyElement[] } = {
                    gameelement: (content as GeneratedResource)?.gameelement,
                    studyElements: (content as GeneratedResource)?.studyElements,
                  }
                  if (attempt?.id) { const { saveAttemptSnapshot } = await import('../services/attempts'); await saveAttemptSnapshot(attempt.id, snapshot) }
                } catch (err) { console.warn('saveAttemptSnapshot error:', err) }
                setStartingNewAttempt(false)
              }
            } catch (err) {
              console.warn('getAttemptCount/startNewAttempt error:', err)
            }
          }
        }

        const initialStage: 'study' | 'lines' = (content?.studyElements?.length || 0) > 0 ? 'study' : 'lines'
        setMatchUpStage(initialStage)
      } catch {
        navigate('/recursos')
      }
    }
    void load()
  }, [user?.id, resourceId, forceNew, navigate])

  return (
    <Box minH="100vh" bg={bgColor} w="100%" maxW="100vw">
      <AppHeader user={user} onSignOut={() => { setPendingTo('/login'); setExitOpen(true) }} />
      <Flex>
        <AppSidebar locked={!!(matchUpStage && matchUpStage !== 'summary')} onLockedNavigate={(to) => { setPendingTo(to); setExitOpen(true) }} items={[
          { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, to: '/dashboard' },
          { id: 'recursos', label: 'Recursos', icon: MdLibraryBooks, to: '/recursos' },
          { id: 'ranking', label: 'Ranking', icon: MdLeaderboard, to: '/ranking' },
        ]} />

        <Box flex={1} p={6} w="100%">
          {playingMatchUp && (
            <Suspense fallback={
              <VStack spacing={4} py={8} align="stretch">
                <VStack spacing={2} align="stretch">
                  <Spinner size="lg" color="blue.500" />
                  <Text fontSize="sm" color="gray.600">Cargando juego...</Text>
                </VStack>
              </VStack>
            }>
              <PlayContainer
                cardBg={cardBg}
                borderColor={borderColor}
                startingNewAttempt={startingNewAttempt}
                headerTitle={playingTitle}
                user={user}
                resources={resources}
                playingResourceId={playingResourceId}
                matchUpStage={matchUpStage}
                setMatchUpStage={(s) => setMatchUpStage(s)}
                onExitOpen={() => { setPendingTo('/dashboard'); setExitOpen(true) }}
                playingStudyElements={playingStudyElements}
                studyIndex={studyIndex}
                setStudyIndex={(n) => setStudyIndex(n)}
                studyItemCompleted={studyItemCompleted}
                setStudyItemCompleted={(v) => setStudyItemCompleted(v)}
                isSavingMnemonic={isSavingMnemonic}
                mnemonicAuto={mnemonicAuto}
                mnemonicDraft={mnemonicDraft}
                setMnemonicAuto={(t) => setMnemonicAuto(t)}
                setMnemonicDraft={(t) => setMnemonicDraft(t)}
                persistMnemonic={async (content, auto, draft) => { if (user?.id && playingResourceId) { try { setIsSavingMnemonic(true); await persistMnemonic(playingResourceId, user.id, content, auto, draft) } finally { setIsSavingMnemonic(false) } }}}
                currentAttemptId={currentAttemptId}
                playingMatchUp={playingMatchUp}
                playingQuiz={playingQuiz}
                playingGroupSort={playingGroupSort}
                playingFindTheMatch={playingFindTheMatch}
                playingOpenBox={playingOpenBox}
                playingAnagram={playingAnagram}
                playingDebate={playingDebate}
                linesCompleted={linesCompleted}
                setLinesCompleted={(v) => setLinesCompleted(v)}
                linesResults={linesResults}
                setLinesResults={(r) => setLinesResults(r)}
                quizCompleted={quizCompleted}
                setQuizCompleted={(v) => setQuizCompleted(v)}
                quizResults={quizResults}
                setQuizResults={(r) => setQuizResults(r)}
                groupSortCompleted={groupSortCompleted}
                setGroupSortCompleted={(v) => setGroupSortCompleted(v)}
                groupSortResults={groupSortResults}
                setGroupSortResults={(r) => setGroupSortResults(r)}
                openBoxCompleted={openBoxCompleted}
                setOpenBoxCompleted={(v) => setOpenBoxCompleted(v)}
                openBoxResults={openBoxResults}
                setOpenBoxResults={(r) => setOpenBoxResults(r)}
                anagramCompleted={anagramCompleted}
                setAnagramCompleted={(v) => setAnagramCompleted(v)}
                anagramResults={anagramResults}
                setAnagramResults={(r) => setAnagramResults(r)}
                findMatchResults={findMatchResults}
                setFindMatchResults={(r) => setFindMatchResults(r)}
                mnemonicPracticeCompleted={mnemonicPracticeCompleted}
                setMnemonicPracticeCompleted={(v) => setMnemonicPracticeCompleted(v)}
                setMnemonicPracticeResults={(r) => setMnemonicPracticeResults(r)}
                getResourceProgress={(uid, rid) => getResourceProgress(uid, rid)}
                computeCardProgress={(res, prog) => computeCardProgress(res, prog)}
                computeWeightedFinalScore={() => computeWeightedFinalScore()}
                saveStage={(stage, flags) => saveStage(stage, flags)}
                saveResourceProgress={(uid, rid, payload) => saveResourceProgress(uid, rid, payload)}
                 finalizeSession={async () => { return }}
                onExitSummary={async () => {
                  if (currentAttemptId) {
                    try { await completeAttempt(currentAttemptId) } catch (err) { console.warn('completeAttempt error:', err) }
                    setCurrentAttemptId(null)
                  }
                  setPlayingMatchUp(null)
                  setPlayingStudyElements(null)
                  setMatchUpStage(null)
                  setLinesCompleted(false)
                  setLinesResults([])
                  try { window.scrollTo({ top: 0, behavior: 'auto' }) } catch (err) { console.warn('scroll error:', err) }
                  try { navigate('/recursos', { replace: true }) } catch (err) { console.warn('navigate error:', err) }
                }}
                onRetry={async () => { await handleRetry() }}
                notifyMnemonicScore={(score) => { toast({ title: 'Práctica de mnemotecnia', description: `Tu puntuación: ${score}/100`, status: 'success', duration: 3000 }) }}
              />
            </Suspense>
          )}
        </Box>
      </Flex>
      <Modal isOpen={exitOpen} onClose={() => setExitOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Salir del recurso</ModalHeader>
          <ModalBody>
            <Text fontSize="sm">Tu progreso y puntuación se quedarán tal como están. Para completar toda la actividad tendrás que iniciar un nuevo intento.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setExitOpen(false)}>Continuar</Button>
            <Button colorScheme="red" isLoading={exiting} onClick={() => { void confirmExit() }}>Salir y guardar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
