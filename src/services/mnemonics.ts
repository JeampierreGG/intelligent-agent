import type { StudyMnemonicItem, StudyMnemonicContent } from './types'

export async function generateMnemonicForItems(items: StudyMnemonicItem[], topic?: string, subject?: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'
  const localFallback = () => {
    // Genera un acrónimo simple a partir de las respuestas objetivo
    const initials = items.map(i => (i.prompt?.[0] || '').toUpperCase()).join('')
    return `Para recordar las respuestas (${items.map(i => i.prompt).join(', ')}), usa el acrónimo ${initials}.`
  }
  if (!apiKey) {
    // Sin API key: usa el fallback local
    return localFallback()
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

  try {
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
      console.warn('OpenRouter respondió con error al generar mnemotecnia:', res.status, res.statusText)
      return localFallback()
    }
    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content?.trim() || ''
    return text || localFallback()
  } catch (err) {
    console.error('Fallo al llamar OpenRouter para mnemotecnia, usando fallback local:', err)
    return localFallback()
  }
}

export async function persistMnemonic(resourceId: string, userId: string, content: StudyMnemonicContent, autoText: string | undefined, userText: string | undefined) {
  
  
  const key = `mnemonic_${resourceId}_${userId}`
  const payload = { content, autoText: autoText || null, userText: userText || null, ts: Date.now() }
  try {
    localStorage.setItem(key, JSON.stringify(payload))
  } catch (err) {
    console.warn('localStorage persistMnemonic error:', err)
  }
  return null
}
