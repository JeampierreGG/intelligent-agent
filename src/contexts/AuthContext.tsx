import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { 
  loginTempUser, 
  createTempUser, 
  getTempUser, 
  logoutTempUser, 
  hasTempSession
} from '../services/tempAuth'
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

/**
 * Verifica si Supabase está disponible
 */
const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    await supabase.auth.getSession()
    return true
  } catch (error) {
    console.warn('🔧 Supabase no disponible, usando modo temporal:', error)
    return false
  }
}

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
      const supabaseAvailable = await isSupabaseAvailable()
      
      if (supabaseAvailable) {
        // Usar Supabase
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
      } else {
        // Usar autenticación temporal
        console.log('📦 Usando autenticación temporal')
        const tempUser = getTempUser()
        if (tempUser && hasTempSession()) {
          setUser(tempUser)
          setSession({ user: tempUser })
          console.log('✅ Sesión temporal restaurada:', tempUser)
        }
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signUp = async (email: string, password: string, userData: UserProfileData) => {
    const supabaseAvailable = await isSupabaseAvailable()
    
    if (supabaseAvailable) {
      // Usar Supabase
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
          // El usuario se creó pero el perfil no, esto podría requerir manejo especial
          throw new Error('Usuario creado pero error al crear perfil. Contacte soporte.')
        }
      }
      
      return data
    } else {
      // Usar autenticación temporal
      console.log('📦 Registrando usuario temporal:', email)
      // En modo temporal, el servicio espera un nombre (string), no el objeto completo
      const tempUser = createTempUser(email, password, `${userData.first_name} ${userData.last_name}`)
      setUser(tempUser)
      setSession({ user: tempUser })
      console.log('✅ Usuario temporal registrado:', tempUser)
      return { user: tempUser, session: { user: tempUser } }
    }
  }

  const signIn = async (email: string, password: string) => {
    const supabaseAvailable = await isSupabaseAvailable()
    
    if (supabaseAvailable) {
      // Usar Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      return data
    } else {
      // Usar autenticación temporal
      console.log('📦 Iniciando sesión temporal para:', email)
      const tempUser = loginTempUser(email, password)
      setUser(tempUser)
      setSession({ user: tempUser })
      console.log('✅ Sesión temporal iniciada:', tempUser)
      return { user: tempUser, session: { user: tempUser } }
    }
  }

  const signOut = async () => {
    const supabaseAvailable = await isSupabaseAvailable()
    
    if (supabaseAvailable && session) {
      // Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } else {
      // Cerrar sesión temporal
      console.log('📦 Cerrando sesión temporal')
      logoutTempUser()
      setUser(null)
      setSession(null)
      console.log('✅ Sesión temporal cerrada')
    }
  }

  const confirmEmail = async (email: string) => {
    const supabaseAvailable = await isSupabaseAvailable()
    
    if (supabaseAvailable) {
      // Para desarrollo, simular confirmación automática en Supabase
      console.log('Simulando confirmación de email para:', email)
      return { data: { user: { email } }, error: null }
    } else {
      // En modo temporal, la confirmación es automática
      console.log('📦 Confirmación automática en modo temporal para:', email)
      return { data: { user: { email } }, error: null }
    }
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