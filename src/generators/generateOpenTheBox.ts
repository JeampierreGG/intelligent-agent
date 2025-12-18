import type { ResourceFormData, OpenTheBoxContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

const ensureFive = (otb: OpenTheBoxContent): OpenTheBoxContent => {
  const items = Array.isArray(otb.items) ? otb.items : []
  if (items.length > 5) return { ...otb, items: items.slice(0, 5) }
  if (items.length === 5) return otb
  const padded = [...items]
  for (let i = 0; padded.length < 5; i++) padded.push({ ...items[i % items.length] })
  return { ...otb, items: padded }
}

export async function generateOpenTheBox(formData: ResourceFormData): Promise<OpenTheBoxContent | null> {
  const subject = formData.subject 
  const topic = formData.topic
  const difficulty = formData.difficulty
  const level = formData.academicLevel 
  const struct = `{
  "openTheBox": { "templateType": "open_the_box", "title": "...", "items": [ { "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- EXACTAMENTE 5 cajas.
- Ajusta al nivel: ${level} y dificultad: ${difficulty}.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.`
  const raw = await callOpenRouter(prompt, 0.5, 3)
  const parsed = safeParseJson(raw) as unknown
  const otb = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).openTheBox as OpenTheBoxContent | undefined) : undefined
  if (otb && Array.isArray(otb.items) && otb.items.length > 0) {
    return ensureFive({ ...otb, templateType: 'open_the_box', difficulty })
  }
  return null
}
