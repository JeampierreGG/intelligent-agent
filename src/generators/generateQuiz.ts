import type { ResourceFormData, QuizContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

export async function generateQuiz(formData: ResourceFormData): Promise<QuizContent | null> {
  const subject = formData.subject 
  const topic = formData.topic
  const difficulty = formData.difficulty 
  const level = formData.academicLevel  
  const struct = `{
  "quiz": { "templateType": "quiz", "title": "...", "questions": [ { "prompt": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- EXACTAMENTE 5 preguntas, cada una con 4 opciones y explicación breve.
- Ajusta al nivel: ${level} y dificultad: ${difficulty}.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.`
  const raw = await callOpenRouter(prompt, 0.5, 3)
  const parsed = safeParseJson(raw) as unknown
  const quiz = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).quiz as QuizContent | undefined) : undefined
  if (quiz && Array.isArray(quiz.questions) && quiz.questions.length >= 5) {
    return { ...quiz, templateType: 'quiz', difficulty }
  }
  return null
}
