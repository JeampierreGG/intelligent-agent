// Traducciones de mensajes de error de Supabase al español
export const translateSupabaseError = (errorMessage: string): string => {
  const translations: { [key: string]: string } = {
    'User already registered': 'El usuario ya está registrado',
    'Invalid login credentials': 'Credenciales de inicio de sesión inválidas',
    'Email not confirmed': 'Email no confirmado',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Invalid email': 'Email inválido',
    'Signup requires a valid password': 'El registro requiere una contraseña válida',
    'Unable to validate email address: invalid format': 'No se puede validar la dirección de email: formato inválido',
    'Password is too weak': 'La contraseña es muy débil',
    'Email rate limit exceeded': 'Límite de emails excedido',
    'Too many requests': 'Demasiadas solicitudes',
    'Network error': 'Error de red',
    'Database error': 'Error de base de datos',
    'Authentication failed': 'Autenticación fallida',
    'User not found': 'Usuario no encontrado',
    'Invalid password': 'Contraseña inválida',
    'Email already in use': 'El email ya está en uso',
    'Weak password': 'Contraseña débil',
    'Invalid email format': 'Formato de email inválido'
  }

  // Buscar traducción exacta
  if (translations[errorMessage]) {
    return translations[errorMessage]
  }

  // Buscar traducción parcial (si el mensaje contiene alguna de las claves)
  for (const [englishError, spanishError] of Object.entries(translations)) {
    if (errorMessage.includes(englishError)) {
      return spanishError
    }
  }

  // Si no se encuentra traducción, devolver el mensaje original
  return errorMessage
}