import { supabase } from './supabase'

const ENABLE_CACHE = (import.meta as any).env?.VITE_ENABLE_IMAGE_CACHE === 'true'

// Sube una imagen a Supabase Storage y devuelve la URL pública
export async function cacheImageToSupabase(imageUrl: string, key: string): Promise<string | null> {
  try {
    // Deshabilitado por configuración: evitar intentos de subida y errores de RLS
    if (!ENABLE_CACHE) return null
    const res = await fetch(imageUrl)
    if (!res.ok) {
      console.warn('No se pudo descargar la imagen para cache:', imageUrl)
      return null
    }
    const blob = await res.blob()
    const contentType = blob.type || 'image/jpeg'
    const { error } = await supabase.storage.from('resource-images').upload(key, blob, { upsert: true, contentType })
    if (error) {
      console.error('Error subiendo imagen a Supabase Storage:', error)
      return null
    }
    const { data } = supabase.storage.from('resource-images').getPublicUrl(key)
    return data.publicUrl || null
  } catch (e) {
    console.error('Error en cacheImageToSupabase:', e)
    return null
  }
}

export function buildStorageKey(subject: string, topic: string, term: string, idx: number): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug(subject)}/${slug(topic)}/${slug(term || 'item')}-${idx}.jpg`
}

// Versión con prefijo de usuario para cumplir RLS: name LIKE auth.uid() || '/%'
export function buildUserScopedStorageKey(userId: string, subject: string, topic: string, term: string, idx: number): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const safeUser = slug(userId)
  return `${safeUser}/${slug(subject)}/${slug(topic)}/${slug(term || 'item')}-${idx}.jpg`
}