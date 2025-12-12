import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { userProfileService, type UserProfileData } from '../services/userProfileService'
import type { Session, User, AuthResponse } from '@supabase/supabase-js'
import { AuthContext } from './authContextBase'
// Context lives in a separate file to satisfy React Fast Refresh rules

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      // Inicializar sesión con Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })

      // Escuchar cambios de autenticación
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })

      return () => subscription.unsubscribe()
    }

    initializeAuth()
  }, [])

  const signUp = async (email: string, password: string, userData: UserProfileData): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          birth_day: userData.birth_day,
          birth_month: userData.birth_month,
          birth_year: userData.birth_year,
          academic_level: userData.academic_level,
        }
      }
    })

    if (error) throw error

    // Si el registro fue exitoso y tenemos un usuario y sesión, crear el perfil.
    // Si no hay sesión (confirmación de email habilitada), diferir hasta signIn.
    if (data.user && data.session) {
      try {
        await userProfileService.createUserProfile(data.user.id, userData)
     
      } catch (profileError) {
       
      }
    }

    return { data, error }
  }

  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    // Tras iniciar sesión, si el perfil no existe, crearlo ahora que hay sesión
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!profile) {
          const meta = user.user_metadata as {
            first_name?: string
            last_name?: string
            birth_day?: string
            birth_month?: string
            birth_year?: string
            academic_level?: string
          }
          await userProfileService.createUserProfile(user.id, {
            first_name: meta?.first_name ?? '',
            last_name: meta?.last_name ?? '',
            birth_day: meta?.birth_day ?? '01',
            birth_month: meta?.birth_month ?? '01',
            birth_year: meta?.birth_year ?? '2000',
            academic_level: meta?.academic_level ?? 'Secundaria',
          })
        }
      }
    } catch (e) {
      console.warn('post-signIn profile ensure error:', e)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const confirmEmail = async (email: string): Promise<{ data: { user: { email: string } }; error: null }> => {
    // Para desarrollo, simulamos confirmación automática
    console.log('Simulando confirmación de email para:', email)
    return { data: { user: { email } }, error: null }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    confirmEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
