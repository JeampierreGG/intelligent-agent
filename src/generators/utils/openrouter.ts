export const callOpenRouter = async (prompt: string, temperature = 0.6, retries = 3): Promise<string> => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'
  if (!apiKey) throw new Error('Falta VITE_OPENROUTER_API_KEY')
  const body = { model, messages: [ { role: 'system', content: 'Responde SOLO con JSON válido. Sin texto fuera del JSON.' }, { role: 'user', content: prompt } ], temperature }
  let lastErr: unknown = null
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      })
      if (!resp.ok) throw new Error('Error en OpenRouter')
      const data = await resp.json()
      const content = data?.choices?.[0]?.message?.content ?? ''
      return content
    } catch (e) {
      lastErr = e
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Error en OpenRouter')
}
