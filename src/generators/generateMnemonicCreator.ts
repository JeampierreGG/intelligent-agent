import type { ResourceFormData, StudyElement, StudyMnemonicContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

export async function generateMnemonicCreator(formData: ResourceFormData): Promise<StudyElement | null> {
  const subject = formData.subject 
  const topic = formData.topic 
  const level = formData.academicLevel 
  const difficulty = formData.difficulty 
  const struct = `{
  "mnemonic_creator": { "items": [ { "prompt": "concepto", "answer": "definición breve" } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- EXACTAMENTE 4 ítems.
- Conceptos y definiciones alineados al tema.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.
- Ajusta al nivel: ${level} y dificultad: ${difficulty}.`
  const raw = await callOpenRouter(prompt, 0.5, 4)
  const parsed = safeParseJson(raw) as unknown
  const items = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).mnemonic_creator as { items?: Array<{ prompt: string; answer: string }> } | undefined)?.items : undefined
  if (Array.isArray(items) && items.length >= 4) {
    const content: StudyMnemonicContent = { items: items.slice(0, 4), subject, topic }
    return { type: 'mnemonic_creator', content }
  }
  return null
}
