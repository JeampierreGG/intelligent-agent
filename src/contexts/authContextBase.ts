import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { UserProfileData } from '../services/userProfileService'

export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, userData: UserProfileData) => Promise<import('@supabase/supabase-js').AuthResponse>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  confirmEmail: (email: string) => Promise<{ data: { user: { email: string } }; error: null }>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
