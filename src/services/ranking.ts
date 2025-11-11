import { supabase } from './supabase'

export interface GlobalRankingEntry {
  user_id: string
  total_score: number
}

const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('educational_resource_attempts').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

// Obtiene el ranking global sumando el mayor puntaje final por recurso para cada usuario.
// Limita a topN usuarios para eficiencia.
export async function getGlobalRanking(topN = 50): Promise<GlobalRankingEntry[]> {
  const supa = await isSupabaseAvailable()
  if (!supa) {
    // Sin Supabase no podemos construir un ranking global confiable
    return []
  }
  const { data, error } = await supabase
    .from('educational_resource_attempts')
    .select('user_id, resource_id, final_score, attempt_number')
    .not('final_score', 'is', null)

  if (error) throw error

  // Para cada usuario y recurso, tomar el puntaje del último intento (attempt_number más alto)
  const perUserPerResourceLatest: Map<string, Map<string, { attempt: number; score: number }>> = new Map()
  for (const row of (data || [])) {
    const userId = (row as any).user_id as string
    const resId = (row as any).resource_id as string
    const score = Number((row as any).final_score)
    const attempt = Number((row as any).attempt_number)
    if (!userId || !resId || isNaN(score) || isNaN(attempt)) continue
    let resMap = perUserPerResourceLatest.get(userId)
    if (!resMap) {
      resMap = new Map()
      perUserPerResourceLatest.set(userId, resMap)
    }
    const prev = resMap.get(resId)
    if (!prev || attempt > prev.attempt) {
      resMap.set(resId, { attempt, score })
    }
  }

  const totals: GlobalRankingEntry[] = []
  for (const [userId, resMap] of perUserPerResourceLatest.entries()) {
    let sum = 0
    for (const { score } of resMap.values()) sum += score
    totals.push({ user_id: userId, total_score: Math.round(sum) })
  }

  totals.sort((a, b) => b.total_score - a.total_score)
  return totals.slice(0, topN)
}