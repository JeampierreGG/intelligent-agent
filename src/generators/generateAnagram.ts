import type { ResourceFormData, AnagramContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

export async function generateAnagram(formData: ResourceFormData): Promise<AnagramContent | null> {
  const subject = formData.subject
  const topic = formData.topic 
  const difficulty = formData.difficulty 
  const level = formData.academicLevel 
  const struct = `{
  "anagram": { "templateType": "anagram", "title": "...", "items": [ { "clue": "pista", "answer": "término", "scrambled": "letras" } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- EXACTAMENTE 5 ítems.
- Ajusta al nivel: ${level} y dificultad: ${difficulty}.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.`
  const raw = await callOpenRouter(prompt, 0.5, 3)
  const parsed = safeParseJson(raw) as unknown
  const anagram = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).anagram as AnagramContent | undefined) : undefined
  if (anagram && Array.isArray(anagram.items) && anagram.items.length >= 5) {
    return { ...anagram, templateType: 'anagram', difficulty }
  }
  return null
}
