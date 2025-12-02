import { supabase } from './supabase'
import { getResourceProgress } from './resourceProgress'

export interface BreakdownItem {
  name: string
  weight: number
  totalItems: number
  correct: number
  contribution: number
}

export interface SummarySnapshot {
  score: number
  breakdown: BreakdownItem[]
  linesResults?: Array<{ term: string; chosen: string; expected: string; correct: boolean }>
  groupSortResults?: Array<{ item: string; chosenGroup?: string; expectedGroup: string; correct: boolean }>
  quizResults?: Array<{ prompt: string; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>
  findMatchResults?: Array<{ concept: string; chosen?: string; expected: string; correct: boolean }>
  anagramResults?: Array<{ answer: string; userAnswer: string; correct: boolean; clue?: string }>
  openBoxResults?: Array<{ question: string; options: string[]; chosenIndex: number; correctIndex: number; chosenText: string; correctText: string; correct: boolean; explanation?: string }>
  mnemonicPracticeResults?: Array<{ prompt: string; answer: string; userAnswer: string; correct: boolean }>
  attempt_progress_pct?: number
  difficulty?: string
  debate_level?: number
}

export interface Attempt {
  id?: string
  attempt_number: number
  final_score?: number | null
  final_score_breakdown?: BreakdownItem[]
  summary_snapshot?: SummarySnapshot
}

const ATTEMPT_LOCAL_PREFIX = 'attempts'

const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('educational_resources').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export async function getAttemptCount(resourceId: string, userId: string): Promise<number> {
  const supa = await isSupabaseAvailable()
  if (supa) {
    const { count, error } = await supabase
      .from('educational_resource_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
    if (error) throw error
    return count || 0
  }
  const key = `${ATTEMPT_LOCAL_PREFIX}:${userId}:${resourceId}`
  const raw = localStorage.getItem(key)
  return raw ? parseInt(raw, 10) || 0 : 0
}

export async function startNewAttempt(resourceId: string, userId: string): Promise<{ id?: string; attemptNumber: number }> {
  const supa = await isSupabaseAvailable()
  // Seleccionar el último intento para calcular el siguiente de forma segura
  const getLatest = async () => {
    const { data } = await supabase
      .from('educational_resource_attempts')
      .select('id, attempt_number')
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
      .order('attempt_number', { ascending: false })
      .limit(1)
    const latest = (data?.[0] as { id?: string; attempt_number?: number } | undefined)
    return { id: latest?.id, attemptNumber: (latest?.attempt_number ?? 0) }
  }

  if (supa) {
    // Calcular siguiente número y tratar conflictos de forma resiliente
    const latest = await getLatest()
    const next = (latest.attemptNumber ?? 0) + 1
    try {
      const { data, error } = await supabase
        .from('educational_resource_attempts')
        .insert({ resource_id: resourceId, user_id: userId, attempt_number: next })
        .select('id, attempt_number')
        .single()
      if (error) throw error
      return { id: data?.id, attemptNumber: data?.attempt_number || next }
    } catch {
      // Conflicto por duplicado: otro proceso pudo crear el mismo intento
      // Recuperar el último y, si es válido, devolverlo
      const latest2 = await getLatest()
      const attNum = (latest2.attemptNumber ?? 0)
      if (attNum >= next && latest2.id) {
        return { id: latest2.id, attemptNumber: attNum }
      }
      // Intentar una vez más con attNum + 1
      const retryNext = attNum + 1
      const { data: dataRetry, error: errRetry } = await supabase
        .from('educational_resource_attempts')
        .insert({ resource_id: resourceId, user_id: userId, attempt_number: retryNext })
        .select('id, attempt_number')
        .single()
      if (errRetry) {
        // Último fallback: devolver el último existente si hay
        if (latest2.id) return { id: latest2.id, attemptNumber: attNum }
        throw errRetry
      }
      return { id: dataRetry?.id, attemptNumber: dataRetry?.attempt_number || retryNext }
    }
  }

  // Fallback localStorage
  const current = await getAttemptCount(resourceId, userId)
  const next = current + 1
  const key = `${ATTEMPT_LOCAL_PREFIX}:${userId}:${resourceId}`
  localStorage.setItem(key, String(next))
  return { attemptNumber: next }
}

export async function saveAttemptSnapshot(attemptId: string, snapshot: unknown): Promise<void> {
  try {
    localStorage.setItem(`attempt_snapshot_${attemptId}`, JSON.stringify(snapshot))
  } catch (err) {
    void err
  }
}

export async function completeAttempt(attemptId: string): Promise<void> {
  try {
    await supabase
      .from('educational_resource_attempts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', attemptId)
  } catch (e) {
    console.warn('No se pudo completar el intento (fallback silencioso):', e)
  }
}

export async function saveAttemptFinalScore(
  attemptId: string,
  finalScore: number,
  breakdown?: BreakdownItem[],
  summarySnapshot?: SummarySnapshot
): Promise<boolean> {
  try {
    void breakdown
    const { data: attRow, error: attErr } = await supabase
      .from('educational_resource_attempts')
      .select('id, resource_id, user_id, attempt_number')
      .eq('id', attemptId)
      .single()
    if (attErr) throw attErr
    const resourceId = (attRow as { resource_id: string }).resource_id
    const userId = (attRow as { user_id: string }).user_id
    const attemptNumber = (attRow as { attempt_number: number }).attempt_number

    const payload = {
      user_id: userId,
      resource_id: resourceId,
      attempt_id: attemptId,
      attempt_number: attemptNumber,
      score: finalScore,
      percentage: finalScore,
      progress_pct: (summarySnapshot?.attempt_progress_pct ?? null) as number | null,
      computed_at: new Date().toISOString()
    }
    const { error } = await supabase
      .from('user_scores')
      .insert(payload)
    if (error) throw error

    const prog = getResourceProgress(userId, resourceId)
    const denom = (name: string): number => {
      switch (name) {
        case 'Quiz': return (summarySnapshot?.quizResults?.length ?? 0)
        case 'Unir parejas': return (summarySnapshot?.linesResults?.length ?? 0)
        case 'Ordenar por grupo': return (summarySnapshot?.groupSortResults?.length ?? 0)
        case 'Abrecajas': return (summarySnapshot?.openBoxResults?.length ?? 0)
        case 'Anagrama': return (summarySnapshot?.anagramResults?.length ?? 0)
        case 'Cada oveja con su pareja': return (summarySnapshot?.findMatchResults?.length ?? 0)
        case 'Práctica de mnemotecnia': return (summarySnapshot?.mnemonicPracticeResults?.length ?? 0)
        case 'Línea de tiempo': return 1
        case 'Presentación de curso': return 1
        case 'Notas en acordeón': return 1
        case 'Creador de mnemotecnia': return 1
        default: return 0
      }
    }
    const correct = (name: string): number => {
      switch (name) {
        case 'Quiz': return (summarySnapshot?.quizResults || []).filter(x => x.correct).length
        case 'Unir parejas': return (summarySnapshot?.linesResults || []).filter(x => x.correct).length
        case 'Ordenar por grupo': return (summarySnapshot?.groupSortResults || []).filter(x => x.correct).length
        case 'Abrecajas': return (summarySnapshot?.openBoxResults || []).filter(x => x.correct).length
        case 'Anagrama': return (summarySnapshot?.anagramResults || []).filter(x => x.correct).length
        case 'Cada oveja con su pareja': return (summarySnapshot?.findMatchResults || []).filter(x => x.correct).length
        case 'Práctica de mnemotecnia': return (summarySnapshot?.mnemonicPracticeResults || []).filter(x => x.correct).length
        case 'Línea de tiempo': return prog?.timelineConfirmed ? 1 : 0
        case 'Presentación de curso': return prog?.coursePresentationConfirmed ? 1 : 0
        case 'Notas en acordeón': return prog?.accordionNotesConfirmed ? 1 : 0
        case 'Creador de mnemotecnia': return prog?.mnemonicCreatorConfirmed ? 1 : 0
        default: return 0
      }
    }
    const typeOf = (name: string): string => {
      switch (name) {
        case 'Quiz': return 'quiz'
        case 'Unir parejas': return 'lines'
        case 'Ordenar por grupo': return 'group_sort'
        case 'Abrecajas': return 'open_box'
        case 'Anagrama': return 'anagram'
        case 'Cada oveja con su pareja': return 'find_the_match'
        case 'Línea de tiempo': return 'timeline'
        case 'Presentación de curso': return 'course_presentation'
        case 'Notas en acordeón': return 'accordion_notes'
        case 'Práctica de mnemotecnia': return 'mnemonic_creator'
        case 'Creador de mnemotecnia': return 'mnemonic_creator'
        default: return 'unknown'
      }
    }
    const rows = (breakdown || []).map(b => {
      const d = denom(b.name)
      const c = correct(b.name)
      const ratio = d > 0 ? (c / d) : 0
      const pointsScored = Math.round((20 * ratio) * 100) / 100
      const reviewed = (() => {
        switch (b.name) {
          case 'Quiz': return !!prog?.quizConfirmed
          case 'Unir parejas': return !!prog?.linesConfirmed
          case 'Ordenar por grupo': return !!prog?.groupSortConfirmed
          case 'Abrecajas': return !!prog?.openBoxConfirmed
          case 'Anagrama': return !!prog?.anagramConfirmed
          case 'Cada oveja con su pareja': return !!prog?.findTheMatchConfirmed
          case 'Línea de tiempo': return !!prog?.timelineConfirmed
          case 'Presentación de curso': return !!prog?.coursePresentationConfirmed
          case 'Notas en acordeón': return !!prog?.accordionNotesConfirmed
          case 'Creador de mnemotecnia': return !!prog?.mnemonicCreatorConfirmed
          default: return false
        }
      })()
      return {
        user_id: userId,
        resource_id: resourceId,
        attempt_id: attemptId,
        attempt_number: attemptNumber,
        element_type: typeOf(b.name),
        element_name: b.name,
        total_items: d,
        correct_items: c,
        max_points: 20,
        points_scored: pointsScored,
        reviewed,
        computed_at: new Date().toISOString(),
      }
    })
    if (rows.length > 0) {
      const { error: esErr } = await supabase
        .from('educational_attempt_element_scores')
        .upsert(rows, { onConflict: 'attempt_id,element_type' })
      if (esErr) throw esErr
    }

    // Guardar puntaje por ítem, derivado del contenido JSON del snapshot
    const buildItemRows = () => {
      const out: Array<Record<string, unknown>> = []
      const addRows = (type: string, items: Array<{ correct: boolean }>, keys: string[], confirmed: boolean) => {
        const denomItems = items.length
        const perItemPoints = denomItems > 0 ? (20 / denomItems) : 0
        items.forEach((it, idx) => {
          const pts = confirmed && it.correct ? perItemPoints : 0
          out.push({
            user_id: userId,
            resource_id: resourceId,
            attempt_id: attemptId,
            attempt_number: attemptNumber,
            element_type: type,
            element_item_index: idx,
            element_item_key: keys[idx] || null,
            max_points_item: 20,
            points_scored_item: Math.round(pts * 100) / 100,
            correct: !!it.correct,
            computed_at: new Date().toISOString(),
          })
        })
      }

      // Quiz
      if (Array.isArray(summarySnapshot?.quizResults)) {
        const items = summarySnapshot!.quizResults!.map(q => ({ correct: q.correct }))
        const keys = summarySnapshot!.quizResults!.map(q => q.prompt)
        addRows('quiz', items, keys, !!prog?.quizConfirmed)
      }
      // Lines
      if (Array.isArray(summarySnapshot?.linesResults)) {
        const items = summarySnapshot!.linesResults!.map(r => ({ correct: r.correct }))
        const keys = summarySnapshot!.linesResults!.map(r => r.term)
        addRows('lines', items, keys, !!prog?.linesConfirmed)
      }
      // Group sort
      if (Array.isArray(summarySnapshot?.groupSortResults)) {
        const items = summarySnapshot!.groupSortResults!.map(r => ({ correct: r.correct }))
        const keys = summarySnapshot!.groupSortResults!.map(r => r.item)
        addRows('group_sort', items, keys, !!prog?.groupSortConfirmed)
      }
      // Open the box
      if (Array.isArray(summarySnapshot?.openBoxResults)) {
        const items = summarySnapshot!.openBoxResults!.map(r => ({ correct: r.correct }))
        const keys = summarySnapshot!.openBoxResults!.map(r => r.question)
        addRows('open_box', items, keys, !!prog?.openBoxConfirmed)
      }
      // Anagram
      if (Array.isArray(summarySnapshot?.anagramResults)) {
        const items = summarySnapshot!.anagramResults!.map(a => ({ correct: a.correct }))
        const keys = summarySnapshot!.anagramResults!.map(a => a.answer)
        addRows('anagram', items, keys, !!prog?.anagramConfirmed)
      }
      // Find the match
      if (Array.isArray(summarySnapshot?.findMatchResults)) {
        const items = summarySnapshot!.findMatchResults!.map(r => ({ correct: r.correct }))
        const keys = summarySnapshot!.findMatchResults!.map(r => r.concept)
        addRows('find_the_match', items, keys, !!prog?.findTheMatchConfirmed)
      }
      
      return out
    }

    const itemRows = buildItemRows()
    if (itemRows.length > 0) {
      const { error: isErr } = await supabase
        .from('educational_attempt_item_scores')
        .upsert(itemRows, { onConflict: 'attempt_id,element_type,element_item_index' })
      if (isErr) throw isErr
    }

    try {
      if (summarySnapshot) {
        localStorage.setItem(`attempt_summary_${attemptId}`, JSON.stringify(summarySnapshot))
      }
    } catch (e) {
      console.warn('No se pudo persistir summarySnapshot en localStorage:', e)
    }

    // Persistir resumen en Supabase para disponibilidad entre navegadores
    try {
      const payload = {
        attempt_id: attemptId,
        user_id: userId,
        resource_id: resourceId,
        attempt_number: attemptNumber,
        summary_snapshot: summarySnapshot ?? null,
        computed_at: new Date().toISOString(),
      }
      const { error: ssErr } = await supabase
        .from('educational_attempt_summaries')
        .upsert(payload, { onConflict: 'attempt_id' })
      if (ssErr) throw ssErr
    } catch (e) {
      console.warn('No se pudo guardar summary_snapshot en Supabase (fallback a local):', e)
    }
    return true
  } catch (e) {
    console.warn('No se pudo guardar el puntaje final del intento:', e)
    return false
  }
}

export function getAttemptSummarySnapshot(attemptId: string): SummarySnapshot | null {
  try {
    const raw = localStorage.getItem(`attempt_summary_${attemptId}`)
    return raw ? (JSON.parse(raw) as SummarySnapshot) : null
  } catch (e) {
    console.warn('getAttemptSummarySnapshot error:', e)
    return null
  }
}

async function getAttemptSummarySnapshotRemote(attemptId: string): Promise<SummarySnapshot | null> {
  try {
    const { data, error } = await supabase
      .from('educational_attempt_summaries')
      .select('summary_snapshot')
      .eq('attempt_id', attemptId)
      .single()
    if (error) throw error
    const snapshot = (data as { summary_snapshot?: SummarySnapshot | null })?.summary_snapshot ?? null
    return snapshot ?? null
  } catch {
    return null
  }
}

async function getAttemptElementBreakdown(attemptId: string): Promise<BreakdownItem[]> {
  try {
    const { data, error } = await supabase
      .from('educational_attempt_element_scores')
      .select('element_name, total_items, correct_items, max_points, points_scored')
      .eq('attempt_id', attemptId)
    if (error) throw error
    const list = (data || []) as Array<{ element_name: string | null; total_items: number | null; correct_items: number | null; max_points: number | null; points_scored: number | null }>
    return list.map(row => ({
      name: row.element_name || 'Elemento',
      weight: typeof row.max_points === 'number' ? row.max_points : 20,
      totalItems: typeof row.total_items === 'number' ? row.total_items : 0,
      correct: typeof row.correct_items === 'number' ? row.correct_items : 0,
      contribution: typeof row.points_scored === 'number' ? Number(row.points_scored) : 0,
    }))
  } catch {
    return []
  }
}

export async function getLatestFinalScoreForResource(
  userId: string,
  resourceId: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('user_scores')
      .select('score, computed_at')
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
      .order('computed_at', { ascending: false })
      .limit(1)
    if (error) throw error
    const score = (data?.[0]?.score as number | null) ?? null
    return score
  } catch (e) {
    console.warn('No se pudo leer el puntaje final del recurso:', e)
    return null
  }
}

export async function getAttemptsForResource(
  userId: string,
  resourceId: string
): Promise<Attempt[]> {
  const supa = await isSupabaseAvailable()
  if (supa) {
    try {
      const { data, error } = await supabase
        .from('user_scores')
        .select('attempt_id, attempt_number, score, computed_at')
        .eq('user_id', userId)
        .eq('resource_id', resourceId)
        .order('attempt_number', { ascending: true })
      if (error) throw error
      const rows = (data || [])
      const out: Attempt[] = []
      for (const row of rows) {
        const id = (row as { attempt_id?: string }).attempt_id
        const attempt_number = (row as { attempt_number: number }).attempt_number
        const final_score = ((row as { score?: number | null }).score) ?? null
        let summary_snapshot: SummarySnapshot | undefined = undefined
        let final_score_breakdown: BreakdownItem[] | undefined = undefined
        if (id) {
          const remote = await getAttemptSummarySnapshotRemote(id)
          summary_snapshot = remote ?? getAttemptSummarySnapshot(id) ?? undefined
          if (!summary_snapshot) {
            const elems = await getAttemptElementBreakdown(id)
            if (elems.length > 0) final_score_breakdown = elems
          }
        }
        out.push({ id, attempt_number, final_score, final_score_breakdown, summary_snapshot })
      }
      return out
    } catch (e) {
      console.warn('No se pudieron obtener los intentos del recurso:', e)
      return []
    }
  }
  const count = await getAttemptCount(resourceId, userId)
  return Array.from({ length: count }, (_, i) => ({ attempt_number: i + 1, final_score: null })) as Attempt[]
}

/**
 * Obtiene el mejor puntaje (máximo final_score) por recurso para un usuario
 * Devuelve un mapa: { [resource_id]: max_score }
 */
export async function getUserBestScores(
  userId: string
): Promise<Record<string, number>> {
  const supa = await isSupabaseAvailable()
  if (supa) {
    try {
      const { data, error } = await supabase
        .from('user_scores')
        .select('resource_id, score')
        .eq('user_id', userId)
      if (error) throw error
      const best: Record<string, number> = {}
      for (const row of data || []) {
        const rid = (row as { resource_id: string }).resource_id
        const score = ((row as { score: number | null }).score) ?? null
        if (score != null) {
          best[rid] = Math.max(best[rid] ?? 0, Math.round(score))
        }
      }
      return best
    } catch (e) {
      console.warn('No se pudieron obtener los mejores puntajes del usuario:', e)
      return {}
    }
  }
  return {}
}

/**
 * Suma todos los puntajes de todos los intentos del usuario
 * en la tabla `user_scores`.
 */
export async function getUserTotalPoints(
  userId: string
): Promise<number> {
  const supa = await isSupabaseAvailable()
  if (supa) {
    try {
      const { data, error } = await supabase
        .from('user_scores')
        .select('score')
        .eq('user_id', userId)
      if (error) throw error
      let sum = 0
      for (const row of data || []) {
        const s = (row as { score: number | null }).score
        if (typeof s === 'number' && !isNaN(s)) sum += Math.round(s)
      }
      return sum
    } catch (e) {
      console.warn('No se pudieron sumar los puntajes del usuario:', e)
      return 0
    }
  }
  return 0
}

/**
 * Suma el tiempo (en segundos) que tardó el usuario en completar cada intento
 * (solo intentos con completed_at no nulo). Calculado como completed_at - started_at
 */
export async function getUserTotalCompletedAttemptSeconds(userId: string): Promise<number> {
  const supa = await isSupabaseAvailable()
  if (!supa) return 0
  try {
    const { data, error } = await supabase
      .from('educational_resource_attempts')
      .select('started_at, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)

    if (error) throw error

    let total = 0
    for (const row of (data || [])) {
      try {
        const started = new Date((row as { started_at: string }).started_at)
        const completed = new Date((row as { completed_at: string }).completed_at)
        const diff = Math.max(0, Math.floor((completed.getTime() - started.getTime()) / 1000))
        if (!isNaN(diff)) total += diff
      } catch (err) {
        console.warn('attempt time parse error:', err)
      }
    }
    return total
  } catch (e) {
    console.warn('No se pudo calcular el tiempo total por intentos completados:', e)
    return 0
  }
}
