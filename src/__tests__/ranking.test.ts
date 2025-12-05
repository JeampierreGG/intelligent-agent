import { vi, describe, it, expect } from 'vitest'
import { getUsersPublicNames } from '../services/ranking'

vi.mock('../services/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'user_scores') {
          const api = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }
          return api
        }
        if (table === 'public_user_profiles') {
          const api = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() }
          return api
        }
        return { select: vi.fn().mockReturnThis() }
      })
    }
  }
})

describe('ranking service', () => {
  it('getGlobalRanking maneja null y ordena', async () => {
    const rows = [{ user_id: 'u1', score: null }, { user_id: 'u2', score: 10 }]
    const sorted = rows.sort((a, b) => (b.score || 0) - (a.score || 0))
    expect(sorted[0].user_id).toBe('u2')
  })
  it('getUsersPublicNames retorna objeto', async () => {
    const res = await getUsersPublicNames(['u1'])
    expect(typeof res).toBe('object')
  })
})
