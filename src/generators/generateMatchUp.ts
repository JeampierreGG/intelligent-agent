import type { ResourceFormData, MatchUpContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

const sanitizePairs = (pairs: Array<{ left: string; right: string }>): Array<{ left: string; right: string }> => {
  return pairs.map(p => {
    const leftNorm = (p.left || '').toLowerCase().trim()
    let rightText = p.right || ''
    const rightNorm = rightText.toLowerCase()
    if (leftNorm && rightNorm.includes(leftNorm)) {
      const idx = rightText.toLowerCase().indexOf('ejemplo:')
      if (idx >= 0) rightText = rightText.slice(0, idx).trim()
    }
    return { left: p.left, right: rightText }
  })
}

export async function generateMatchUp(formData: ResourceFormData): Promise<MatchUpContent | null> {
  const subject = formData.subject || 'General'
  const topic = formData.topic || 'Libre'
  const difficulty = formData.difficulty || 'Intermedio'
  const struct = `{
  "matchUp": { "templateType": "match_up", "title": "...", "linesMode": { "pairs": [ { "left": "concepto", "right": "definición breve" } ] } }
}`
  const basePrompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- EXACTAMENTE 5 pares concepto-definición en modo líneas.
- Evita que la definición repita literal el término.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.
- Ajusta la dificultad: ${difficulty}.`

  for (let attempt = 0; attempt < 4; attempt++) {
    const raw = await callOpenRouter(basePrompt, 0.5, 3)
    const parsed = safeParseJson(raw) as unknown
    const mu = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).matchUp as MatchUpContent | undefined) : undefined
    const pairs = mu?.linesMode?.pairs
    if (Array.isArray(pairs) && pairs.length >= 5) {
      const cleaned = sanitizePairs(pairs).slice(0, 5)
      return {
        templateType: 'match_up',
        title: mu?.title || `${subject}: ${topic}`,
        subject,
        topic,
        difficulty,
        instructions_lines: 'Une cada concepto con su definición correcta. Traza líneas entre las columnas.',
        linesMode: { pairs: cleaned }
      }
    }
  }
  return null
}
