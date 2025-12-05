import { describe, it, expect } from 'vitest'
import { computeResourceProgressPct } from '../utils/progress'

describe('progress utils', () => {
  it('retorna 0 sin elementos', () => {
    const pct = computeResourceProgressPct({ id: 'r1', user_id: 'u1', title: 't', subject: 's', topic: 't', difficulty: 'Básico', content: { title: 't' } as unknown as import('../services/types').GeneratedResource, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, null)
    expect(pct).toBe(0)
  })
})
