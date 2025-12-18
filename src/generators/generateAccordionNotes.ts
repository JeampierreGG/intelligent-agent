import type { ResourceFormData, StudyElement, StudyAccordionNotesContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

export async function generateAccordionNotes(formData: ResourceFormData): Promise<StudyElement | null> {
  const subject = formData.subject 
  const topic = formData.topic 
  const level = formData.academicLevel 
  const difficulty = formData.difficulty 
  const struct = `{
  "accordion_notes": { "sections": [ { "title": "...", "body": "5–7 puntos sin URLs, relacionados a ${topic}" } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- EXACTAMENTE 5 secciones.
- Cada sección con 5–7 puntos sustantivos.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.
- Ajusta al nivel: ${level} y dificultad: ${difficulty}.`
  const banned = ['json', 'rfc8259', 'formato', 'javascript', 'comillas', 'arrays', 'claves', 'sintaxis']
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const raw = await callOpenRouter(prompt, 0.45, 4)
      const parsed = safeParseJson(raw) as unknown
      const sections = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).accordion_notes as { sections?: Array<{ title: string; body: string }> } | undefined)?.sections : undefined
      if (Array.isArray(sections) && sections.length >= 5) {
        const cleaned = sections.slice(0, 5).filter(s => {
          const b = (s.body || '').toLowerCase()
          const hasBanned = banned.some(w => b.includes(w))
          const okTitle = typeof s.title === 'string' && s.title.trim().length > 0
          const okBody = typeof s.body === 'string' && s.body.trim().length > 0
          return !hasBanned && okTitle && okBody
        })
        if (cleaned.length === 5) {
          const content: StudyAccordionNotesContent = { sections: cleaned }
          return { type: 'accordion_notes', content }
        }
      }
    } catch {
      // continuar
    }
  }
  return null
}
