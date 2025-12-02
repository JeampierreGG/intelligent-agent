import { supabase } from './supabase'

export interface UserProfileData {
  first_name: string
  last_name: string
  birth_day: string
  birth_month: string
  birth_year: string
  academic_level: string
}

export interface UserProfile {
  id: string
  user_id: string
  fecha_nacimiento: string
  nivel_academico: string
  created_at: string
  updated_at: string
}

export const userProfileService = {
  // Crear perfil de usuario después del registro
  async createUserProfile(userId: string, userData: UserProfileData): Promise<UserProfile | null> {
    try {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess?.session?.user) {
        throw new Error('No hay sesión activa; no se puede crear perfil por RLS')
      }
      // Convertir fecha de nacimiento al formato DATE
      const fechaNacimiento = `${userData.birth_year}-${userData.birth_month.padStart(2, '0')}-${userData.birth_day.padStart(2, '0')}`
      
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          fecha_nacimiento: fechaNacimiento,
          nivel_academico: userData.academic_level
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        throw error
      }

      console.log('✅ User profile created successfully:', data)
      return data
    } catch (error) {
      console.error('Error in createUserProfile:', error)
      throw error
    }
  },

  // Obtener perfil de usuario
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data || null
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw error
    }
  },

  // Actualizar perfil de usuario
  async updateUserProfile(userId: string, updates: Partial<UserProfileData>): Promise<UserProfile | null> {
    try {
      const updateData: Partial<{ fecha_nacimiento: string; nivel_academico: string }> = {}

      if (updates.birth_day && updates.birth_month && updates.birth_year) {
        updateData.fecha_nacimiento = `${updates.birth_year}-${updates.birth_month.padStart(2, '0')}-${updates.birth_day.padStart(2, '0')}`
      }

      if (updates.academic_level) {
        updateData.nivel_academico = updates.academic_level
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateUserProfile:', error)
      throw error
    }
  }
}
