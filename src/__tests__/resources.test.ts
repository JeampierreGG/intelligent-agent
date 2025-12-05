import { vi, describe, it, expect } from 'vitest'
import { getResourceById } from '../services/resources'

const __store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem(key: string) { return __store[key] || null },
  setItem(key: string, value: string) { __store[key] = String(value) },
  removeItem(key: string) { delete __store[key] }
} as unknown as Storage)

vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'educational_resources') {
        type Chain = {
          select: (...args: unknown[]) => Chain
          eq: (...args: unknown[]) => Chain
          limit: (...args: unknown[]) => Promise<{ data: unknown; error: unknown | null }>
          single: (...args: unknown[]) => Promise<{ data: unknown }>
        }
        const chain: Chain = {
          select: vi.fn(() => chain) as unknown as Chain['select'],
          eq: vi.fn(() => chain) as unknown as Chain['eq'],
          limit: vi.fn(async () => ({ data: [], error: null })) as unknown as Chain['limit'],
          single: vi.fn(async () => ({ data: { id: 'r1', user_id: 'u1', title: 'T', subject: 'Matemáticas', topic: 'Álgebra', difficulty: 'Intermedio', content: { studyElements: [], gameelement: {} }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } })) as unknown as Chain['single']
        }
        return chain
      }
      return { select: vi.fn(() => ({ })) }
    })
  }
}))

describe('resources.getResourceById', () => {
  it('retorna recurso por id con filtro de usuario', async () => {
    const { data } = await getResourceById('r1', 'u1')
    expect(data?.id).toBe('r1')
    expect(data?.user_id).toBe('u1')
  })
})
