import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { hasCompletedQuestionnaireSimple } from '../services/questionnaire-simple'

interface AuthContextType {
  user: any | null
  session: any | null
  loading: boolean
  hasCompletedQuestionnaire: boolean | null
  checkQuestionnaireStatus: () => Promise<void>
  forceQuestionnaireCompleted: () => void
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  confirmEmail: (email: string) => Promise<any>
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
  const [hasCompletedQuestionnaireState, setHasCompletedQuestionnaireState] = useState<boolean | null>(null)
  const [isCheckingQuestionnaire, setIsCheckingQuestionnaire] = useState(false)

  const checkQuestionnaireStatus = useCallback(async () => {
    if (isCheckingQuestionnaire) return // Evitar múltiples llamadas simultáneas
    if (hasCompletedQuestionnaireState !== null) return // Ya tenemos el estado
    
    if (user) {
      setIsCheckingQuestionnaire(true)
      try {
        // Solo usar el método simple que funciona
        const completed = await hasCompletedQuestionnaireSimple(user.id)
        console.log('🔍 Resultado método simple:', completed)
        
        setHasCompletedQuestionnaireState(completed)
        console.log('📋 Estado final del cuestionario:', completed)
      } catch (error) {
        console.error('Error checking questionnaire status:', error)
        // Si hay error, asumir que no está completado para mostrar el cuestionario
        setHasCompletedQuestionnaireState(false)
      } finally {
        setIsCheckingQuestionnaire(false)
      }
    } else {
      setHasCompletedQuestionnaireState(null)
    }
  }, [user, isCheckingQuestionnaire, hasCompletedQuestionnaireState])

  useEffect(() => {
    // Obtener sesión inicial
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
    // Resetear el estado del cuestionario cuando cambie el usuario
    setHasCompletedQuestionnaireState(null)
    setLoading(false)
  })

    return () => subscription.unsubscribe()
  }, [])

  // Verificar cuestionario cuando el usuario cambie (solo una vez por usuario)
  useEffect(() => {
    if (user && !isCheckingQuestionnaire && hasCompletedQuestionnaireState === null) {
      checkQuestionnaireStatus()
    }
  }, [user, isCheckingQuestionnaire, hasCompletedQuestionnaireState])

  const signUp = async (email: string, password: string, userData: any) => {
    // Para desarrollo: intentar registrar sin confirmación de email
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    
    // Si el registro fue exitoso pero requiere confirmación, 
    // intentar hacer login inmediatamente para desarrollo
    if (data.user && !error && data.user.email_confirmed_at === null) {
      // Simular confirmación automática para desarrollo
      console.log('Usuario registrado pero requiere confirmación de email')
    }
    
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const confirmEmail = async (email: string) => {
    // Esta función es solo para desarrollo
    // En producción, la confirmación se haría a través del email
    console.log('Función de confirmación para desarrollo:', email)
    return { data: null, error: null }
  }

  const forceQuestionnaireCompleted = () => {
    console.log('🎯 Forzando estado del cuestionario como completado')
    setHasCompletedQuestionnaireState(true)
  }

  const value = {
    user,
    session,
    loading,
    hasCompletedQuestionnaire: hasCompletedQuestionnaireState,
    checkQuestionnaireStatus,
    forceQuestionnaireCompleted,
    signUp,
    signIn,
    signOut,
    confirmEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}