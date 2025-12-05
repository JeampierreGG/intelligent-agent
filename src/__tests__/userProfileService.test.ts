import { vi, describe, it, expect } from 'vitest'
import { userProfileService } from '../services/userProfileService'

vi.mock('../services/supabase', () => {
  const updateChain = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn(async () => ({ data: { id: 'p1', user_id: 'u1', fecha_nacimiento: '2005-02-01', nivel_academico: 'Universidad' } })) }
  return {
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: { user: { id: 'u1' } } } }))
      },
      from: vi.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            insert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: vi.fn(async () => ({ data: { id: 'p1', user_id: 'u1', fecha_nacimiento: '2005-02-01', nivel_academico: 'Secundaria' } })) })),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({ data: { id: 'p1', user_id: 'u1', fecha_nacimiento: '2005-02-01', nivel_academico: 'Secundaria' } })),
            update: vi.fn(() => updateChain)
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })
    }
  }
})

describe('userProfileService', () => {
  it('createUserProfile formatea fecha', async () => {
    const res = await userProfileService.createUserProfile('u1', { first_name: 'Juan', last_name: 'Perez', birth_day: '01', birth_month: '02', birth_year: '2005', academic_level: 'Secundaria' })
    expect(res?.fecha_nacimiento).toBe('2005-02-01')
  })

  it('getUserProfile retorna perfil', async () => {
    const res = await userProfileService.getUserProfile('u1')
    expect(res?.user_id).toBe('u1')
  })

  it('updateUserProfile actualiza nivel', async () => {
    const res = await userProfileService.updateUserProfile('u1', { academic_level: 'Universidad' })
    expect(res?.nivel_academico).toBe('Universidad')
  })
})
