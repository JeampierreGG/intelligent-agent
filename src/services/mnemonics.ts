import { supabase } from './supabase'
import type { StudyMnemonicItem, StudyMnemonicContent } from './types'

export async function generateMnemonicForItems(items: StudyMnemonicItem[], topic?: string, subject?: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'
  if (!apiKey) {
    // Sin API key: genera acrónimo a partir de las respuestas (target), con contexto de definiciones
    const initials = items.map(i => (i.prompt?.[0] || '').toUpperCase()).join('')
    return `Para recordar las respuestas (${items.map(i => i.prompt).join(', ')}), usa el acrónimo ${initials}.`
  }
  const prompt = `Eres un profesor creativo. Genera UNA sola mnemotecnia breve y fácil de recordar sobre el tema "${subject || ''} - ${topic || ''}".

Objetivo: que el estudiante recuerde las RESPUESTAS listadas abajo.
Contexto: usa sus DEFINICIONES para dar sentido a la mnemotecnia.

Datos:
${items.map((i, idx) => `${idx + 1}. Respuesta objetivo: ${i.prompt}; Definición (contexto): ${i.answer}`).join('\n')}

Requisitos:
- Debe ser corta (una frase o acrónimo).
- No incluyas explicaciones largas ni formatos especiales.
- Devuelve solo la mnemotecnia, sin comillas ni prefijos.`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Eres un asistente educativo experto en crear mnemotecnias útiles y breves. Enfócate en ayudar a recordar las RESPUESTAS utilizando el contexto de las definiciones.' },
        { role: 'user', content: prompt }
      ]
    })
  })
  if (!res.ok) {
    throw new Error('Error al generar mnemotecnia')
  }
  const data = await res.json()
  const text: string = data?.choices?.[0]?.message?.content?.trim() || ''
  return text || 'Genera tu propia frase corta que te ayude a recordar estos conceptos.'
}

export async function persistMnemonic(resourceId: string, userId: string, content: StudyMnemonicContent, autoText: string | undefined, userText: string | undefined) {
  // Intentar guardar en Supabase si hay sesión
  try {
    const sess = await supabase.auth.getSession()
    if (sess.data.session) {
      const { data: mn, error: errMn } = await supabase
        .from('educational_mnemonics')
        .insert({ resource_id: resourceId, user_id: userId, system_mnemonic: autoText || null, user_mnemonic: userText || null, items_count: content.items.length })
        .select()
        .single()
      if (errMn) throw errMn
      const mnemonicId = mn.id
      const itemsRows = content.items.map(it => ({ mnemonic_id: mnemonicId, prompt: it.prompt, answer: it.answer }))
      const { error: errItems } = await supabase.from('educational_mnemonic_items').insert(itemsRows)
      if (errItems) throw errItems
      return mnemonicId
    }
  } catch (e) {
    console.warn('Persistencia Supabase falló, se usará localStorage', e)
  }
  // Fallback localStorage
  const key = `mnemonic_${resourceId}_${userId}`
  const payload = { content, autoText: autoText || null, userText: userText || null, ts: Date.now() }
  try {
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {}
  return null
}