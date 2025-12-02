import { supabase } from './supabase'

export interface GlobalRankingEntry {
  user_id: string
  total_score: number
}

const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('user_scores').select('user_id').limit(1)
    return !error
  } catch {
    return false
  }
}

// Obtiene el ranking global sumando el MEJOR puntaje por recurso para cada usuario.
// Fuente de datos: tabla `user_scores` (score por intento y recurso).
export async function getGlobalRanking(topN = 50): Promise<GlobalRankingEntry[]> {
  const supa = await isSupabaseAvailable()
  if (!supa) return []

  const { data, error } = await supabase
    .from('user_scores')
    .select('user_id, score')

  if (error) throw error

  type Row = { user_id: string; score: number | null }
  const totalsMap: Map<string, number> = new Map()
  for (const row of (data || []) as Row[]) {
    const userId = row.user_id
    const s = Number(row.score)
    if (!userId || isNaN(s)) continue
    totalsMap.set(userId, (totalsMap.get(userId) || 0) + Math.round(s))
  }

  const totals: GlobalRankingEntry[] = Array.from(totalsMap.entries()).map(([user_id, total_score]) => ({ user_id, total_score }))
  totals.sort((a, b) => b.total_score - a.total_score)
  return totals.slice(0, topN)
}

export async function getUsersPublicNames(userIds: string[]): Promise<Record<string, { first_name?: string | null; last_name?: string | null }>> {
  const supa = await isSupabaseAvailable()
  if (!supa || userIds.length === 0) return {}
  try {
    const { data, error } = await supabase
      .from('user_public_names')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds)
    if (error) throw error
    const map: Record<string, { first_name?: string | null; last_name?: string | null }> = {}
    for (const row of data || []) {
      const uid = (row as { user_id: string }).user_id
      const fn = (row as { first_name?: string | null }).first_name ?? null
      const ln = (row as { last_name?: string | null }).last_name ?? null
      map[uid] = { first_name: fn, last_name: ln }
    }
    return map
  } catch (e) {
    console.warn('No se pudieron leer nombres públicos:', e)
    return {}
  }
}
