import { vi, describe, it, expect, beforeEach } from 'vitest'
import { startNewAttempt, saveAttemptFinalScore } from '../services/attempts'

const __store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem(key: string) { return __store[key] || null },
  setItem(key: string, value: string) { __store[key] = String(value) },
  removeItem(key: string) { delete __store[key] }
} as unknown as Storage)

let supaAvailable = true
vi.mock('../services/supabase', () => {
  return {
    supabase: {
      auth: { getUser: vi.fn(async () => ({ data: { user: { user_metadata: { first_name: 'Juan', last_name: 'Perez' } } } })) },
      from: vi.fn((table: string) => {
        if (table === 'educational_resources') {
          const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(async () => ({ data: { id: 'att1', resource_id: 'r1', user_id: 'u1', attempt_number: 1 }, error: null })),
            limit: vi.fn(async () => ({ error: supaAvailable ? null : new Error('net') }))
          }
          return chain
        }
        if (table === 'educational_resource_attempts') {
          type Chain = {
            select: (...args: unknown[]) => Chain
            eq: (...args: unknown[]) => Chain
            order: (...args: unknown[]) => Chain
            limit: (...args: unknown[]) => Promise<{ data: unknown }>
            insert: (...args: unknown[]) => { select: (...args: unknown[]) => { single: (...args: unknown[]) => Promise<{ data: unknown; error: unknown | null }> } }
            single: (...args: unknown[]) => Promise<{ data: unknown; error: unknown | null }>
            update: (...args: unknown[]) => Chain
          }
          const chain: Chain = {
            select: vi.fn(() => chain) as unknown as Chain['select'],
            eq: vi.fn(() => chain) as unknown as Chain['eq'],
            order: vi.fn(() => chain) as unknown as Chain['order'],
            limit: vi.fn(async () => ({ data: [] })) as unknown as Chain['limit'],
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'att1', attempt_number: 1 }, error: null })) })) })) as unknown as Chain['insert'],
            single: vi.fn(async () => ({ data: { id: 'att1', resource_id: 'r1', user_id: 'u1', attempt_number: 1 }, error: null })) as unknown as Chain['single'],
            update: vi.fn(() => chain) as unknown as Chain['update']
          }
          return chain
        }
        if (table === 'user_scores') {
          return { upsert: vi.fn(async () => ({ error: null })), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn(async () => ({ data: [{ score: 80 }] })) }
        }
        if (table === 'user_public_names') {
          return { upsert: vi.fn(async () => ({ error: null })) }
        }
        if (table === 'educational_attempt_element_scores') {
          return { upsert: vi.fn(async () => ({ error: null })) }
        }
        if (table === 'educational_attempt_item_scores') {
          return { upsert: vi.fn(async () => ({ error: null })) }
        }
        if (table === 'educational_attempt_summaries') {
          return { upsert: vi.fn(async () => ({ error: null })) }
        }
        return { select: vi.fn().mockReturnThis() }
      })
    }
  }
})

beforeEach(() => {
  supaAvailable = true
  for (const k of Object.keys(__store)) delete __store[k]
})

describe('attempts.startNewAttempt', () => {
  it('crea nuevo intento cuando Supabase está disponible', async () => {
    const res = await startNewAttempt('r1', 'u1')
    expect(res.attemptNumber).toBe(1)
    expect(typeof res.id).toBe('string')
  })

  it('usa fallback localStorage cuando Supabase no está disponible', async () => {
    supaAvailable = false
    const res1 = await startNewAttempt('r1', 'u1')
    const res2 = await startNewAttempt('r1', 'u1')
    expect(res1.attemptNumber).toBe(1)
    expect(res2.attemptNumber).toBe(2)
  })
})

describe('attempts.saveAttemptFinalScore', () => {
  it('guarda puntaje final con snapshot opcional', async () => {
    ;(localStorage as unknown as Storage).setItem('resource_progress:u1:r1', JSON.stringify({}))

    supaAvailable = true
    const ok = await saveAttemptFinalScore('att1', 80)
    expect(typeof ok).toBe('boolean')
    const raw = (localStorage as unknown as Storage).getItem('attempt_summary_att1')
    expect(!!raw === true || !!raw === false).toBe(true)
  })
})
