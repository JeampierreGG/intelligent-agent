// Genera una pregunta inicial y opiniones a favor y en contra.
export async function generateInitialDebate(subject: string, topic: string): Promise<{ question: string; pro: string; con: string }> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  const baseQuestion = `¿Debería ${topic} ser promovido activamente en el ámbito de ${subject}?`

  if (!apiKey) {
    return {
      question: baseQuestion,
      pro: `A favor: ${topic} aporta beneficios claros en ${subject}, fomentando el pensamiento crítico y habilidades aplicadas.`,
      con: `En contra: ${topic} puede distraer de fundamentos esenciales de ${subject} si no se integra con objetivos curriculares.`,
    }
  }

  try {
    const prompt = `Genera una sola pregunta de debate breve y dos opiniones iniciales (una a favor y una en contra) sobre el tema "${subject} - ${topic}".

Formato estricto (SIN usar Markdown, SIN negritas, SIN asteriscos):
Pregunta: <texto breve>
A favor: <opinión breve>
En contra: <opinión breve>`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un facilitador de debates educativos. Responde solo en texto plano. No uses Markdown ni asteriscos.' },
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!res.ok) throw new Error('Error al generar debate')

    const data = await res.json()
    let text: string = data?.choices?.[0]?.message?.content || ''

    // Limpieza por si usa Markdown igualmente
    text = text.replace(/\*/g, '').trim()

    const q = text.match(/Pregunta:\s*(.*)/)?.[1]?.trim() || baseQuestion
    const pro = text.match(/A favor:\s*(.*)/)?.[1]?.trim() || `A favor: ${topic} aporta beneficios claros en ${subject}.`
    const con = text.match(/En contra:\s*(.*)/)?.[1]?.trim() || `En contra: ${topic} puede tener inconvenientes en ${subject}.`

    return { question: q, pro, con }

  } catch {
    return {
      question: baseQuestion,
      pro: `A favor: ${topic} aporta beneficios claros en ${subject}.`,
      con: `En contra: ${topic} puede tener inconvenientes en ${subject}.`,
    }
  }
}



// Genera una nueva ronda de opiniones
export async function generateDebateRound(question: string, userOpinion: string, position: 'pro' | 'con'): Promise<{ pro: string; con: string }> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  if (!apiKey) {
    const connector = position === 'pro' ? 'Desde la postura a favor' : 'Desde la postura en contra'
    return {
      pro: `${connector}, se argumenta adicionalmente que: ${userOpinion}.`,
      con: `En respuesta, la postura opuesta señala que: ${userOpinion.replace(/\b(bueno|beneficio|ventaja)\b/gi, 'riesgo')}.`,
    }
  }

  try {
    const prompt = `Pregunta: ${question}
Opinión del estudiante (${position === 'pro' ? 'A favor' : 'En Contra'}): ${userOpinion}

Genera solo dos opiniones breves para continuar el debate.
Formato estricto (SIN Markdown):
A favor: <texto>
En contra: <texto>`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un facilitador de debates educativos. Responde solo en texto plano. No uses Markdown ni asteriscos.' },
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!res.ok) throw new Error('Error al generar ronda de debate')

    const data = await res.json()
    let text: string = data?.choices?.[0]?.message?.content || ''

    text = text.replace(/\*/g, '').trim()

    const pro = text.match(/A favor:\s*(.*)/)?.[1]?.trim() || `A favor: Se apoya que ${userOpinion}.`
    const con = text.match(/En contra:\s*(.*)/)?.[1]?.trim() || `En contra: Se cuestiona que ${userOpinion}.`

    return { pro, con }

  } catch {
    return {
      pro: `A favor: Se apoya que ${userOpinion}.`,
      con: `En contra: Se cuestiona que ${userOpinion}.`,
    }
  }
}
