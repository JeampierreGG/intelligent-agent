export type ResourceStage =
  | 'study'
  | 'mnemonic_practice'
  | 'quiz'
  | 'quiz_summary'
  | 'lines'
  | 'lines_summary'
  | 'debate'
  | 'images'
  | 'group_sort'
  | 'group_sort_summary'
  | 'find_the_match'
  | 'find_the_match_summary'
  | 'open_box'
  | 'anagram'
  | 'summary'

export interface ResourceProgressData {
  stage: ResourceStage
  studyIndex: number
  studyItemCompleted?: boolean
  mnemonicPracticeCompleted?: boolean
  linesCompleted?: boolean
  debateCompleted?: boolean
  imagesCompleted?: boolean
  // Flags de confirmación al presionar "Continuar" para contabilizar puntuación
  quizConfirmed?: boolean
  linesConfirmed?: boolean
  groupSortConfirmed?: boolean
  findTheMatchConfirmed?: boolean
  openBoxConfirmed?: boolean
  anagramConfirmed?: boolean
  updatedAt?: string
}

const keyFor = (userId: string, resourceId: string) => `resource_progress_${userId}_${resourceId}`

export function getResourceProgress(userId: string, resourceId: string): ResourceProgressData | null {
  try {
    const raw = localStorage.getItem(keyFor(userId, resourceId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed as ResourceProgressData
  } catch (e) {
    console.warn('getResourceProgress error:', e)
    return null
  }
}

export function saveResourceProgress(userId: string, resourceId: string, data: Partial<ResourceProgressData>) {
  try {
    const current = getResourceProgress(userId, resourceId) || { stage: 'study', studyIndex: 0 }
    const merged: ResourceProgressData = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(keyFor(userId, resourceId), JSON.stringify(merged))
  } catch (e) {
    console.warn('saveResourceProgress error:', e)
  }
}

export function clearResourceProgress(userId: string, resourceId: string) {
  try {
    localStorage.removeItem(keyFor(userId, resourceId))
  } catch (e) {
    console.warn('clearResourceProgress error:', e)
  }
}