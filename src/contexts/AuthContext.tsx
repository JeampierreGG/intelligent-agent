import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { userProfileService, type UserProfileData } from '../services/userProfileService'

interface AuthContextType {
  user: any | null
  session: any | null
  loading: boolean
  signUp: (email: string, password: string, userData: UserProfileData) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  confirmEmail: (email: string) => Promise<any>
}

// Autenticación exclusivamente con Supabase

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null)
  const [session, setSession] = useState<any | null>(null)
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

  const signUp = async (email: string, password: string, userData: UserProfileData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name
        }
      }
    })

    if (error) throw error

    // Si el registro fue exitoso y tenemos un usuario, crear el perfil
    if (data.user) {
      try {
        await userProfileService.createUserProfile(data.user.id, userData)
        console.log('✅ Usuario y perfil creados exitosamente')
      } catch (profileError) {
        console.error('❌ Error creando perfil de usuario:', profileError)
        throw new Error('Usuario creado pero error al crear perfil. Contacte soporte.')
      }
    }

    return data
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const confirmEmail = async (email: string) => {
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