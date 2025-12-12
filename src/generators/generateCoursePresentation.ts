import type { ResourceFormData, StudyElement, StudyCoursePresentationContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

export async function generateCoursePresentation(formData: ResourceFormData): Promise<StudyElement | null> {
  const subject = formData.subject || 'General'
  const topic = formData.topic || 'Libre'
  const level = formData.academicLevel || 'Nivel general'
  const difficulty = formData.difficulty || 'Intermedio'
  const struct = `{
  "course_presentation": { "slides": [ { "title": "...", "text": "5 líneas sin URLs, relacionadas a ${topic}" } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- EXACTAMENTE 5 diapositivas.
- Cada diapositiva con 5 líneas claras y verificables.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.
- Ajusta al nivel: ${level} y dificultad: ${difficulty}.`
  const banned = ['json', 'rfc8259', 'formato', 'javascript', 'comillas', 'arrays', 'claves', 'sintaxis']
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const raw = await callOpenRouter(prompt, 0.45, 4)
      const parsed = safeParseJson(raw) as unknown
      const slides = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).course_presentation as { slides?: Array<{ title: string; text: string }> } | undefined)?.slides : undefined
      if (Array.isArray(slides) && slides.length >= 5) {
        const cleaned = slides.slice(0, 5).filter(s => {
          const t = (s.text || '').toLowerCase()
          const hasBanned = banned.some(w => t.includes(w))
          const okTitle = typeof s.title === 'string' && s.title.trim().length > 0
          const okText = typeof s.text === 'string' && s.text.trim().length > 0
          return !hasBanned && okTitle && okText
        })
        if (cleaned.length === 5) {
          const content: StudyCoursePresentationContent = { slides: cleaned }
          return { type: 'course_presentation', content }
        }
      }
    } catch {
      // continuar con siguiente intento
    }
  }
  return null
}
