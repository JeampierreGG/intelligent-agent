import { vi, describe, it, expect, beforeEach } from 'vitest'
import { generateMatchUp } from '../generators/generateMatchUp'
import { generateCoursePresentation } from '../generators/generateCoursePresentation'
import { generateGroupSort } from '../generators/generateGroupSort'
import type { ResourceFormData } from '../services/types'

vi.mock('../generators/utils/openrouter', () => {
  return {
    callOpenRouter: vi.fn(async (prompt: string) => {
      if (prompt.includes('match_up')) {
        return `{"matchUp": {"templateType": "match_up", "title": "Unir parejas", "linesMode": {"pairs": [
          {"left": "Termino 1", "right": "Definicion 1"},
          {"left": "Termino 2", "right": "Definicion 2"},
          {"left": "Termino 3", "right": "Definicion 3"},
          {"left": "Termino 4", "right": "Definicion 4"},
          {"left": "Termino 5", "right": "Definicion 5"}
        ]}}}`
      }
      if (prompt.includes('course_presentation')) {
        return `{"course_presentation": {"slides": [
          {"title": "T1", "text": "Linea 1"},
          {"title": "T2", "text": "Linea 2"},
          {"title": "T3", "text": "Linea 3"},
          {"title": "T4", "text": "Linea 4"},
          {"title": "T5", "text": "Linea 5"}
        ]}}`
      }
      if (prompt.includes('group_sort')) {
        return `{"groupSort": {"templateType": "group_sort", "title": "Clasifica", "groups": [
          {"name": "Categoría 1 relacionada a Tema", "items": ["a","b","c"]},
          {"name": "Categoría 2 relacionada a Tema", "items": ["d","e","f"]}
        ]}}`
      }
      return '{}'
    })
  }
})

const __store: Record<string, string> = {}
beforeEach(() => { for (const k of Object.keys(__store)) delete __store[k] })

vi.stubGlobal('localStorage', {
  getItem(key: string) { return __store[key] || null },
  setItem(key: string, value: string) { __store[key] = String(value) },
  removeItem(key: string) { delete __store[key] }
} as unknown as Storage)

describe('generators (modular)', () => {
  const baseForm: ResourceFormData = { subject: 'Materia', topic: 'Tema', difficulty: 'Intermedio' }

  it('generateMatchUp produce pares', async () => {
    const res = await generateMatchUp(baseForm)
    expect(res?.linesMode?.pairs?.length).toBeGreaterThan(0)
  })

  it('generateCoursePresentation produce 5 slides', async () => {
    const el = await generateCoursePresentation(baseForm)
    expect(el?.type).toBe('course_presentation')
    const slides = (el?.content as { slides: Array<{ title: string; text: string }> })?.slides || []
    expect(slides.length).toBe(5)
  })

  it('generateGroupSort produce 2 grupos con ítems', async () => {
    const gs = await generateGroupSort(baseForm)
    expect(gs?.templateType).toBe('group_sort')
    expect((gs?.groups || []).length).toBe(2)
    const items = (gs?.groups || []).flatMap(g => g.items)
    expect(items.length).toBeGreaterThan(0)
  })
})
