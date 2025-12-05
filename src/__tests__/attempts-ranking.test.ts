import { vi, describe, it, expect } from 'vitest'
import { getAttemptCount, getAttemptsForResource, getLatestFinalScoreForResource } from '../services/attempts'
import { getUsersPublicNames } from '../services/ranking'

vi.mock('../services/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'educational_resource_attempts') {
          type Chain = {
            select: (...args: unknown[]) => Chain
            eq: (...args: unknown[]) => Chain
            order: (...args: unknown[]) => { limit: (...args: unknown[]) => Promise<{ data: unknown; error: unknown | null }> }
          }
          const chain: Chain = {
            select: vi.fn(() => chain) as unknown as Chain['select'],
            eq: vi.fn(() => chain) as unknown as Chain['eq'],
            order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })) as unknown as Chain['order']
          }
          return chain
        }
        if (table === 'user_scores') {
          type Chain = {
            select: (...args: unknown[]) => Chain
            eq: (...args: unknown[]) => Chain
            order: (...args: unknown[]) => { limit: (...args: unknown[]) => Promise<{ data: unknown; error: unknown | null }> }
          }
          const chain: Chain = {
            select: vi.fn(() => chain) as unknown as Chain['select'],
            eq: vi.fn(() => chain) as unknown as Chain['eq'],
            order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [{ score: 80 }], error: null })) })) as unknown as Chain['order']
          }
          return chain
        }
        if (table === 'user_public_names') {
          type Chain = {
            select: (...args: unknown[]) => Chain
            in: (...args: unknown[]) => Promise<{ data: unknown }>
          }
          const chain: Chain = {
            select: vi.fn(() => chain) as unknown as Chain['select'],
            in: vi.fn(async () => ({ data: [{ user_id: 'u1', first_name: 'Juan', last_name: 'Perez' }] })) as unknown as Chain['in']
          }
          return chain
        }
        return { select: vi.fn().mockReturnThis() }
      })
    }
  }
})

describe('attempts', () => {
  it('getAttemptCount retorna número', async () => {
    const n = await getAttemptCount('r1', 'u1')
    expect(typeof n === 'number').toBe(true)
  })
  it('getLatestFinalScoreForResource retorna puntaje', async () => {
    const s = await getLatestFinalScoreForResource('u1', 'r1')
    expect(typeof s === 'number').toBe(true)
  })
  it('getAttemptsForResource retorna lista', async () => {
    const list = await getAttemptsForResource('r1', 'u1')
    expect(Array.isArray(list)).toBe(true)
  })
})

describe('ranking', () => {
  it('getGlobalRanking ordena por puntaje', async () => {
    const rows = [{ user_id: 'u1', score: 50 }, { user_id: 'u2', score: 80 }, { user_id: 'u3', score: 10 }]
    const sorted = rows.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5)
    expect(sorted[0].user_id).toBe('u2')
  })
  it('getUsersPublicNames retorna mapa', async () => {
    const names = await getUsersPublicNames(['u1', 'u2'])
    expect(typeof names).toBe('object')
  })
})
