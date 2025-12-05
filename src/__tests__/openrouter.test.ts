import { vi, describe, it, expect, beforeEach } from 'vitest'
import { generateMatchUpResource, generateStudyOnlyResource, generateGameElementsOnly } from '../services/openrouter'

const __store: Record<string, string> = {}
beforeEach(() => { for (const k of Object.keys(__store)) delete __store[k] })

vi.stubGlobal('localStorage', {
  getItem(key: string) { return __store[key] || null },
  setItem(key: string, value: string) { __store[key] = String(value) },
  removeItem(key: string) { delete __store[key] }
} as unknown as Storage)

describe('openrouter generation', () => {
  it('generateMatchUpResource construye recurso', async () => {
    localStorage.setItem('OPENROUTER_API_KEY', 'k')
    vi.stubGlobal('fetch', vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"matchUp": {"templateType": "match_up", "title": "Unir parejas", "linesMode": {"pairs": [{"left": "Concepto", "right": "Definición"}]}}}' } }] })
      }
    }))
    const res = await generateMatchUpResource({ subject: 'Matemáticas', topic: 'Álgebra', difficulty: 'Intermedio', academicLevel: 'Secundaria' })
    expect(res?.gameelement?.matchUp?.linesMode?.pairs?.length).toBeGreaterThan(0)
  })

  it('generateStudyOnlyResource retorna elementos de estudio', async () => {
    localStorage.setItem('OPENROUTER_API_KEY', 'k')
    vi.stubGlobal('fetch', vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"timeline": {"events": [{"title": "Evento", "description": "Desc", "date": "2000"}]}}' } }] })
      }
    }))
    const res = await generateStudyOnlyResource({ subject: 'Historia', topic: 'Roma', difficulty: 'Básico' }, ['timeline'])
    expect((res?.studyElements || []).length).toBeGreaterThan(0)
  })

  it('generateGameElementsOnly crea solo elementos seleccionados', async () => {
    localStorage.setItem('OPENROUTER_API_KEY', 'k')
    vi.stubGlobal('fetch', vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"quiz": {"templateType": "quiz", "questions": [{"prompt": "p", "options": ["a","b","c","d"], "correctIndex": 0}]}}' } }] })
      }
    }))
    const res = await generateGameElementsOnly({ subject: 'Ciencia', topic: 'Física', difficulty: 'Avanzado' }, ['quiz'])
    expect(res?.quiz?.questions?.length).toBeGreaterThan(0)
  })
})
