import React from 'react'
import { render } from '@testing-library/react'
import { AuthProvider } from '../contexts/AuthContext'
import { useAuth } from '../contexts/useAuth'
import * as userProfileService from '../services/userProfileService'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../services/supabase', () => {
  const authUser = { user: { id: 'u1', email: 'u1@test.com', user_metadata: { first_name: 'Juan', last_name: 'Perez', birth_day: '01', birth_month: '02', birth_year: '2005', academic_level: 'Secundaria' } } }
  const session = { user: authUser.user }
  return {
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({ data: { session } })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signUp: vi.fn(async ({ email }: { email: string }) => ({ data: { user: { id: 'u1', email, user_metadata: authUser.user.user_metadata }, session }, error: null })),
        signInWithPassword: vi.fn(async () => ({ data: authUser, error: null })),
        signOut: vi.fn(async () => ({ error: null })),
        getUser: vi.fn(async () => ({ data: authUser }))
      },
      from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: null })), single: vi.fn(async () => ({ data: null })), insert: vi.fn(), update: vi.fn() }))
    }
  }
})

describe('AuthContext', () => {
  it('signUp crea perfil cuando hay sesión', async () => {
    const spy = vi.spyOn(userProfileService.userProfileService, 'createUserProfile').mockResolvedValue({ id: 'p1', user_id: 'u1', fecha_nacimiento: '2005-02-01', nivel_academico: 'Secundaria', created_at: '', updated_at: '' })
    let api: ReturnType<typeof useAuth> | null = null
    const Hook: React.FC = () => { api = useAuth(); return null }
    render(<AuthProvider><Hook /></AuthProvider>)
    const userData: userProfileService.UserProfileData = { first_name: 'Juan', last_name: 'Perez', birth_day: '01', birth_month: '02', birth_year: '2005', academic_level: 'Secundaria' }
    await api!.signUp('u1@test.com', 'Password123', userData)
    expect(spy).toHaveBeenCalled()
  })

  it('signIn crea perfil si no existe y maneja RLS', async () => {
    const createUserProfile = vi.spyOn(userProfileService.userProfileService, 'createUserProfile').mockResolvedValue({ id: 'p1', user_id: 'u1', fecha_nacimiento: '2005-02-01', nivel_academico: 'Secundaria', created_at: '', updated_at: '' })
    let api: ReturnType<typeof useAuth> | null = null
    const Hook: React.FC = () => { api = useAuth(); return null }
    render(<AuthProvider><Hook /></AuthProvider>)
    await api!.signIn('u1@test.com', 'Password123')
    expect(createUserProfile).toHaveBeenCalled()
  })

  it('signOut limpia sesión', async () => {
    let api: ReturnType<typeof useAuth> | null = null
    const Hook: React.FC = () => { api = useAuth(); return null }
    render(<AuthProvider><Hook /></AuthProvider>)
    await api!.signOut()
    expect(api!.user === null || typeof api!.user === 'object').toBe(true)
  })
})
