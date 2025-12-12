import type { ResourceFormData, FindTheMatchContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

const uniqueFive = (ftm: FindTheMatchContent): FindTheMatchContent => {
  const raw = Array.isArray(ftm.pairs) ? ftm.pairs : []
  const concepts = new Set<string>()
  const affirmations = new Set<string>()
  const unique: typeof raw = []
  for (const p of raw) {
    if (!p || typeof p.concept !== 'string' || typeof p.affirmation !== 'string') continue
    const c = p.concept.trim().toLowerCase()
    const a = p.affirmation.trim().toLowerCase()
    if (!c || !a) continue
    if (concepts.has(c) || affirmations.has(a)) continue
    concepts.add(c)
    affirmations.add(a)
    unique.push({ concept: p.concept.trim(), affirmation: p.affirmation.trim() })
    if (unique.length === 5) break
  }
  return { ...ftm, pairs: unique }
}

export async function generateFindTheMatch(formData: ResourceFormData): Promise<FindTheMatchContent | null> {
  const subject = formData.subject || 'General'
  const topic = formData.topic || 'Libre'
  const difficulty = formData.difficulty || 'Intermedio'
  const struct = `{
  "findTheMatch": { "templateType": "find_the_match", "title": "...", "pairs": [ { "concept": "...", "affirmation": "..." } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- EXACTAMENTE 5 pares únicos concepto-afirmación.
- Ajusta la dificultad: ${difficulty}.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.`
  const raw = await callOpenRouter(prompt, 0.5, 3)
  const parsed = safeParseJson(raw) as unknown
  const ftm = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).findTheMatch as FindTheMatchContent | undefined) : undefined
  if (ftm && Array.isArray(ftm.pairs) && ftm.pairs.length > 0) {
    return uniqueFive({ ...ftm, templateType: 'find_the_match', difficulty })
  }
  return null
}
