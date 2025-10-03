/**
 * Servicio de autenticación temporal para usar cuando Supabase no está disponible
 * Este servicio simula la autenticación usando localStorage
 */

export interface TempUser {
  id: string
  email: string
  name: string
  created_at: string
}

const TEMP_USER_KEY = 'temp_user'
const TEMP_SESSION_KEY = 'temp_session'

/**
 * Crea un usuario temporal y lo guarda en localStorage
 */
export const createTempUser = (email: string, password: string, name: string = 'Usuario Temporal'): TempUser => {
  const tempUser: TempUser = {
    id: `temp_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    name,
    created_at: new Date().toISOString()
  }

  localStorage.setItem(TEMP_USER_KEY, JSON.stringify(tempUser))
  localStorage.setItem(TEMP_SESSION_KEY, 'active')
  
  console.log('✅ Usuario temporal creado:', tempUser)
  return tempUser
}

/**
 * Obtiene el usuario temporal actual
 */
export const getTempUser = (): TempUser | null => {
  try {
    const userStr = localStorage.getItem(TEMP_USER_KEY)
    const session = localStorage.getItem(TEMP_SESSION_KEY)
    
    if (!userStr || session !== 'active') {
      return null
    }
    
    return JSON.parse(userStr)
  } catch (error) {
    console.error('Error al obtener usuario temporal:', error)
    return null
  }
}

/**
 * Simula el login con usuario temporal
 */
export const loginTempUser = (email: string, password: string): TempUser | null => {
  // Para el demo, cualquier email/password funciona
  // En un caso real, aquí validarías las credenciales
  
  let tempUser = getTempUser()
  
  if (!tempUser || tempUser.email !== email) {
    // Crear nuevo usuario temporal si no existe o el email es diferente
    tempUser = createTempUser(email, password)
  } else {
    // Reactivar sesión
    localStorage.setItem(TEMP_SESSION_KEY, 'active')
  }
  
  console.log('✅ Login temporal exitoso:', tempUser)
  return tempUser
}

/**
 * Cierra la sesión temporal
 */
export const logoutTempUser = (): void => {
  localStorage.removeItem(TEMP_SESSION_KEY)
  console.log('✅ Logout temporal exitoso')
}

/**
 * Verifica si hay una sesión temporal activa
 */
export const hasTempSession = (): boolean => {
  const session = localStorage.getItem(TEMP_SESSION_KEY)
  const user = localStorage.getItem(TEMP_USER_KEY)
  return session === 'active' && !!user
}

/**
 * Limpia todos los datos temporales (útil para desarrollo)
 */
export const clearTempData = (): void => {
  localStorage.removeItem(TEMP_USER_KEY)
  localStorage.removeItem(TEMP_SESSION_KEY)
  console.log('✅ Datos temporales limpiados')
}