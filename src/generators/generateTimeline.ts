import type { ResourceFormData, StudyElement, StudyTimelineContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

export async function generateTimeline(formData: ResourceFormData): Promise<StudyElement | null> {
  const subject = formData.subject || 'General'
  const topic = formData.topic || 'Libre'
  const level = formData.academicLevel || 'Nivel general'
  const difficulty = formData.difficulty || 'Intermedio'
  const struct = `{
  "timeline": { "events": [ { "title": "...", "description": "6–10 frases", "date": "YYYY o YYYY-MM-DD" } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- Entre 5 y 8 eventos, ordenables por fecha.
- Cada evento con descripción amplia (6–10 frases) y fecha.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.
- Ajusta al nivel: ${level} y dificultad: ${difficulty}.`
  const raw = await callOpenRouter(prompt, 0.5, 4)
  const parsed = safeParseJson(raw) as unknown
  const events = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).timeline as { events?: Array<{ title: string; description: string; date?: string }> } | undefined)?.events : undefined
  if (Array.isArray(events) && events.length >= 5) {
    const content: StudyTimelineContent = { events: events.slice(0, 8) }
    return { type: 'timeline', content }
  }
  return null
}
