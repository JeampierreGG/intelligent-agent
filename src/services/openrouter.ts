import type { ResourceFormData, GeneratedResource, MatchUpContent, StudyElement, StudyCoursePresentationContent, StudyAccordionNotesContent, StudyTimelineContent, QuizContent, GroupSortContent, AnagramContent, OpenTheBoxContent, GameElementBundle, FindTheMatchContent } from './types'
import { cacheImageToSupabase, buildStorageKey, buildUserScopedStorageKey } from './imageCache'
import { findContextualImageUrl } from './imageSearch'
import { decideMatchUpUsage } from '../config/elementUsage.local'
import { decideStudyElements } from '../config/studyElements.local'

// Genera un prompt INTEGRADO: primero una línea de tiempo con información extensa ordenada por fecha,
// y a partir de ese mismo contenido, actividades MatchUp (líneas e imágenes).
const buildIntegratedPrompt = (formData: ResourceFormData, userAge: number): string => {
  const subject = formData.subject
  const topic = formData.topic
  const learningGoal = formData.learningGoal || 'Aprendizaje general'

  return `Genera un SOLO JSON válido que incluya:
1) Una línea de tiempo vertical con eventos ordenados de MENOR a MAYOR fecha.
2) Actividades Match up (líneas e imágenes) BASADAS en esa misma información.
3) Un Cuestionario (Quiz) de EXACTAMENTE 6 preguntas de opción múltiple sobre el mismo tema.
4) Una actividad de Ordenar por grupo (Group Sort) con 2 a 4 grupos y hasta 12 ítems (sin mínimo).
5) Una actividad de Anagrama (Anagram) con 3 a 6 ítems.
6) Una actividad de Abrecajas (Open the Box) con EXACTAMENTE 6 cajas.
7) Una actividad "Cada oveja con su pareja" (Find the Match) con EXACTAMENTE 6 pares concepto-afirmación.

Formato JSON EXACTO (sin texto extra):
{
  "matchUp": {
    "templateType": "match_up",
    "title": "<título descriptivo>",
    "instructions_lines": "<instrucciones para modo líneas>",
    "instructions_images": "<instrucciones para modo imágenes>",
    "subject": "${subject}",
    "topic": "${topic}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "linesMode": { "pairs": [ { "left": "...", "right": "..." } ] },
    "imagesMode": { "items": [ { "term": "...", "imageDescription": "FOTOGRAFÍA REAL ..." } ] }
  },
  "findTheMatch": {
    "templateType": "find_the_match",
    "title": "<título descriptivo>",
    "instructions": "<instrucciones breves: leer concepto, presionar afirmación correcta>",
    "subject": "${subject}",
    "topic": "${topic}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "pairs": [ { "concept": "...", "affirmation": "..." } ]
  },
  "openTheBox": {
    "templateType": "open_the_box",
    "title": "<título descriptivo de la actividad>",
    "instructions": "<instrucciones breves para abrir cajas y responder>",
    "subject": "${subject}",
    "topic": "${topic}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "items": [
      { "question": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..." }
    ]
  },
  "anagram": {
    "templateType": "anagram",
    "title": "<título descriptivo de la actividad>",
    "instructions": "<instrucciones para resolver anagramas>",
    "subject": "${subject}",
    "topic": "${topic}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "items": [
      { "clue": "<pista opcional>", "answer": "<palabra o frase>", "scrambled": "<letras desordenadas>" }
    ]
  },
  "quiz": {
    "templateType": "quiz",
    "title": "<título descriptivo del quiz>",
    "instructions": "<instrucciones breves para el quiz>",
    "subject": "${subject}",
    "topic": "${topic}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "questions": [
      { "prompt": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..." }
    ]
  },
  "groupSort": {
    "templateType": "group_sort",
    "title": "<título descriptivo de la actividad>",
    "instructions": "<instrucciones para ordenar por grupo>",
    "subject": "${subject}",
    "topic": "${topic}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "groups": [
      { "name": "<nombre del grupo>", "items": ["...","..."] }
    ],
    "umbrellaWord": "<palabra que abarca varios cuadros>",
    "umbrellaCoversItems": ["<ítem>", "<ítem>"]
  },
  "timeline": {
    "events": [
      { "title": "<título del evento>", "description": "<descripción extensa y relevante>", "date": "<YYYY-MM-DD o YYYY>", "imageDescription": "<describir FOTOGRAFÍA REAL>" }
    ]
  }
}

Requisitos:
- Línea de tiempo: genera eventos sin mínimo obligatorio y con un MÁXIMO de 10. Cada evento debe tener fecha visible si es posible y una descripción amplia (contexto, causa, consecuencia, relevancia). Ordena de menor a mayor. Si el tema requiere menos eventos, incluye solo los necesarios; si requiere más, limita a los 10 más representativos.
- MatchUp (líneas): 6 a 10 pares derivados de los eventos y subtemas relevantes del mismo ${subject}/${topic}. Las definiciones deben ser claras para ${userAge} años. Incluye al final: "Ejemplo: ..." (sin revelar directamente el término del lado izquierdo).
- MatchUp (imágenes): EXACTAMENTE 4 ítems con descripciones para FOTOGRAFÍAS REALES, visualmente distintas; especifica el contexto si ayuda (p. ej., fondo blanco, mesa de madera, laboratorio).
- Quiz: Genera EXACTAMENTE 6 preguntas, cada una con EXACTAMENTE 4 opciones (1 correcta y 3 distractores plausibles). Varía la posición de la respuesta correcta. Incluye una justificación por pregunta con información precisa, completa y real (2–4 frases), suficiente para que el usuario entienda claramente el porqué de la respuesta.
- Group Sort: Define de 2 a 4 grupos con nombres claros y HASTA 12 ítems totales (sin mínimo). Evita redundancias: NINGÚN ítem debe contener como subcadena el nombre del grupo ni sus sinónimos. Usa nombres de grupo conceptuales (p. ej., "Conflictos regionales" en lugar de "Guerras") para no revelar respuestas. Los ítems deben pertenecer inequívocamente a un grupo.
 - Group Sort: Define de 2 a 4 grupos con nombres claros y HASTA 12 ítems totales (sin mínimo). Evita redundancias: NINGÚN ítem debe contener como subcadena el nombre del grupo ni sus sinónimos. Usa nombres de grupo conceptuales (p. ej., "Conflictos regionales" en lugar de "Guerras") para no revelar respuestas. Los ítems deben pertenecer inequívocamente a un grupo.
- Anagram: Genera de 3 a 6 ítems. Cada ítem debe tener "answer" (palabra o frase corta) y "scrambled" con EXACTAMENTE las mismas letras desordenadas (sin añadir ni quitar). Si el answer tiene espacios, el scrambled puede omitirlos. Evita respuestas triviales y ofrece pistas ("clue") solo si ayudan a contextualizar el tema.
- Open the Box (Abrecajas): Genera EXACTAMENTE 6 cajas. Cada caja contiene una pregunta de opción múltiple con EXACTAMENTE 4 opciones (1 correcta y 3 distractores plausibles). Varía la posición de la respuesta correcta y evita que las cajas o su título revelen la respuesta. Incluye explicación educativa breve por pregunta.
 - Find the Match (Cada oveja con su pareja): Genera EXACTAMENTE 6 pares. Cada par contiene {concept, affirmation}. Los conceptos deben ser del tema ${subject}/${topic} y las afirmaciones deben ser precisas y breves. Evita ambigüedades: cada concepto debe corresponder inequívocamente a UNA afirmación. Las afirmaciones no deben revelar la respuesta de forma trivial.
 - Course Presentation: entre 6 y 12 diapositivas. Cada diapositiva debe contener una explicación más extensa, precisa y verificable (6–10 oraciones o puntos clave), basada en información real y actualizada. Al final de cada texto, incluye "Fuentes:" seguido de 1–3 URLs confiables (p. ej., artículos y páginas oficiales, Wikipedia/Wikimedia/Wikidata, organismos internacionales, universidades). Evita opinión; usa datos verificables. El apoyo visual debe ser pertinente al tema.
- Adapta la dificultad al objetivo: ${learningGoal}.
- Responde SOLO con el JSON (sin Markdown ni explicaciones).`
}

export async function generateMatchUpResource(formData: ResourceFormData, opts?: { userId?: string }): Promise<GeneratedResource> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('Falta VITE_OPENROUTER_API_KEY en .env')
  }

  // Calcular edad aproximada
  const currentYear = new Date().getFullYear()
  const birthYearStr = formData.userBirthData?.birth_year
  const birthYear = typeof birthYearStr === 'string' ? parseInt(birthYearStr, 10) : (birthYearStr as number | undefined)
  const userAge = typeof birthYear === 'number' ? Math.max(0, currentYear - birthYear) : 0

  const prompt = buildIntegratedPrompt(formData, userAge)

  const body = {
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Genera SOLO JSON válido. No incluyas explicación fuera del JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  }

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text()
    console.error('OpenRouter error:', text)
    throw new Error('Error al generar recurso en OpenRouter')
  }

  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content || ''

  let jsonText = content
  // Limpieza básica si el modelo devuelve envolturas
  const match = content.match(/\{[\s\S]*\}/)
  if (match) jsonText = match[0]

  const parsedAny = JSON.parse(jsonText) as any

  // Seleccionar bloque MatchUp desde el JSON integrado (o aceptar formato antiguo)
  let parsed: MatchUpContent
  if (parsedAny?.templateType === 'match_up') {
    parsed = parsedAny as MatchUpContent
  } else if (parsedAny?.matchUp?.templateType === 'match_up') {
    parsed = parsedAny.matchUp as MatchUpContent
  } else {
    throw new Error('Respuesta inválida: no se encontró bloque matchUp en el JSON')
  }

  // Validación mínima: aseguramos templateType y estructura de pares
  if (!parsed.templateType) {
    parsed.templateType = 'match_up'
  }
  if (!parsed.linesMode || !Array.isArray(parsed.linesMode.pairs) || parsed.linesMode.pairs.length < 1) {
    throw new Error('Respuesta inválida: faltan pares en el modo líneas de la actividad match up')
  }

  // Sanitizar definiciones para evitar que el ejemplo revele la respuesta (no repetir el término exacto)
  parsed.linesMode.pairs = parsed.linesMode.pairs.map(p => {
    const leftNorm = (p.left || '').toLowerCase().trim()
    let rightText = p.right || ''
    const rightNorm = rightText.toLowerCase()
    // Si la definición contiene el término exacto, eliminar el segmento de ejemplo
    if (leftNorm && rightNorm.includes(leftNorm)) {
      const idx = rightText.toLowerCase().indexOf('ejemplo:')
      if (idx >= 0) {
        rightText = rightText.slice(0, idx).trim()
      }
    }
    return { left: p.left, right: rightText }
  })

  // Aplicar política local para decidir si usar imágenes y cuántas
  const usage = decideMatchUpUsage(formData)
  if (!usage.useImages) {
    delete parsed.imagesMode
  }

  // Generar URLs de imágenes a partir de imageDescription si existe imagesMode
  if (parsed.imagesMode && Array.isArray(parsed.imagesMode.items)) {
    // Limitar cantidad según política
    parsed.imagesMode.items = parsed.imagesMode.items.slice(0, usage.maxImages)
    // Primero construir URLs de fallback (Pollinations)
    // Utilidad: timeout para búsqueda de imágenes reales (Wikimedia/Wikipedia/Wikidata)
    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T | null> => {
      return new Promise<T | null>((resolve) => {
        const id = setTimeout(() => resolve(null), ms)
        p.then((v) => { clearTimeout(id); resolve(v) }).catch(() => { clearTimeout(id); resolve(null) })
      })
    }
    parsed.imagesMode.items = await Promise.all(parsed.imagesMode.items.map(async (item, idx) => {
      const baseDesc = item.imageDescription || item.term
      // Forzamos estilo foto real y diferenciación visual, y añadimos contexto de materia/tema
      const desc = `Photorealistic real-world photo illustrating "${item.term}" in the context of ${formData.subject}: ${formData.topic}. ${baseDesc}. High contrast, distinct background, educational context.`
      const encoded = encodeURIComponent(desc)
      const seed = Math.floor(Math.random() * 1000000) + idx
      // Calidad media y resolución moderada para carga equilibrada
      const pollinationsUrl = `https://pollinations.ai/p/${encoded}?model=nanobanana&width=320&height=240&nologo=true&safe=true&quality=${usage.pollinationsQuality}&transparent=false&seed=${seed}`
      // Estrategia: según política local, priorizar Wikimedia en historia
      const useWikiPriority = usage.useWikimediaPriority
      let chosenUrl = pollinationsUrl
      if (useWikiPriority) {
        // Limitar el tiempo de espera para no demorar la actividad
        const realUrl = await withTimeout(findContextualImageUrl({
          term: item.term,
          subject: formData.subject,
          topic: formData.topic,
          description: item.imageDescription,
        }), 1500)
        chosenUrl = realUrl || pollinationsUrl
      }
      // Cachear en Supabase Storage para mejorar tiempos de reutilización
      const storageKey = opts?.userId
        ? buildUserScopedStorageKey(opts.userId, formData.subject, formData.topic, item.term, idx)
        : buildStorageKey(formData.subject, formData.topic, item.term, idx)
      const cachedPublicUrl = await cacheImageToSupabase(chosenUrl, storageKey)
      return { ...item, imageUrl: cachedPublicUrl || chosenUrl }
    }))
  }

  // Construir bundle de elementos de juego priorizando respuesta API si existe
  const apiBundle: any = parsedAny?.gameelement
  let gameBundle: GameElementBundle = { matchUp: parsed }
  try {
    if (apiBundle && typeof apiBundle === 'object') {
      if (apiBundle?.matchUp?.templateType === 'match_up') {
        gameBundle.matchUp = apiBundle.matchUp
      }
      if (apiBundle?.quiz?.templateType === 'quiz') {
        gameBundle.quiz = apiBundle.quiz
      }
      if (apiBundle?.groupSort?.templateType === 'group_sort') {
        gameBundle.groupSort = apiBundle.groupSort
      }
      if (apiBundle?.anagram?.templateType === 'anagram') {
        gameBundle.anagram = apiBundle.anagram
      }
      if (apiBundle?.openTheBox?.templateType === 'open_the_box') {
        gameBundle.openTheBox = apiBundle.openTheBox
      }
      if (apiBundle?.findTheMatch?.templateType === 'find_the_match') {
        gameBundle.findTheMatch = apiBundle.findTheMatch as FindTheMatchContent
      }
    }
  } catch (e) {
    console.warn('Bundle gameelement inválido u ausente, usando solo MatchUp procesado:', e)
  }

  const generated: GeneratedResource = {
    title: parsed.title || `${formData.subject}: ${formData.topic}`,
    summary: `Actividad Match up (líneas e imágenes) sobre ${formData.topic} en ${formData.subject}`,
    difficulty: parsed.difficulty || 'Intermedio',
    gameelement: gameBundle,
    matchUp: gameBundle.matchUp,
    studyElements: []
  }

  // Adjuntar Quiz si existe en el JSON
  try {
    const quizBlock: any = (apiBundle?.quiz ?? parsedAny?.quiz)
    if (quizBlock?.templateType === 'quiz' && Array.isArray(quizBlock.questions) && quizBlock.questions.length > 0) {
      generated.quiz = quizBlock as QuizContent
      generated.gameelement = { ...(generated.gameelement || {}), quiz: quizBlock as QuizContent }
    }
  } catch (e) {
    console.warn('Quiz inválido u ausente en JSON:', e)
  }

  // Adjuntar Group Sort si existe en el JSON
  try {
    const gsBlock: any = (apiBundle?.groupSort ?? parsedAny?.groupSort)
    if (gsBlock?.templateType === 'group_sort' && Array.isArray(gsBlock.groups) && gsBlock.groups.length > 0) {
      generated.groupSort = gsBlock as GroupSortContent
      generated.gameelement = { ...(generated.gameelement || {}), groupSort: gsBlock as GroupSortContent }
    }
  } catch (e) {
    console.warn('GroupSort inválido u ausente en JSON:', e)
  }

  // Adjuntar Anagram si existe en el JSON
  try {
    const anBlock: any = (apiBundle?.anagram ?? parsedAny?.anagram)
    if (anBlock?.templateType === 'anagram' && Array.isArray(anBlock.items) && anBlock.items.length > 0) {
      generated.anagram = anBlock as AnagramContent
      generated.gameelement = { ...(generated.gameelement || {}), anagram: anBlock as AnagramContent }
    }
  } catch (e) {
    console.warn('Anagram inválido u ausente en JSON:', e)
  }

  // Adjuntar Open the Box si existe en el JSON
  try {
    const otbBlock: any = (apiBundle?.openTheBox ?? parsedAny?.openTheBox)
    if (otbBlock?.templateType === 'open_the_box' && Array.isArray(otbBlock.items) && otbBlock.items.length > 0) {
      generated.openTheBox = otbBlock as OpenTheBoxContent
      generated.gameelement = { ...(generated.gameelement || {}), openTheBox: otbBlock as OpenTheBoxContent }
    }
  } catch (e) {
    console.warn('OpenTheBox inválido u ausente en JSON:', e)
  }

  // Adjuntar Find the Match si existe en el JSON
  try {
    const ftmBlock: any = (apiBundle?.findTheMatch ?? parsedAny?.findTheMatch)
    if (ftmBlock?.templateType === 'find_the_match' && Array.isArray(ftmBlock.pairs) && ftmBlock.pairs.length === 6) {
      generated.findTheMatch = ftmBlock as FindTheMatchContent
      generated.gameelement = { ...(generated.gameelement || {}), findTheMatch: ftmBlock as FindTheMatchContent }
    }
  } catch (e) {
    console.warn('FindTheMatch inválido u ausente en JSON:', e)
  }

  // Construir elementos de estudio (máximo 2) antes de los MatchUps
  try {
    const studyDecisions = decideStudyElements(formData)
    const selected = studyDecisions.slice(0, 2) // siempre máximo 2

    const elements: StudyElement[] = []
    const cpTitles: string[] = []

    // Imagen de fondo para Course Presentation: usar Pollinations con referencia al tema, con fallback a Wikimedia
    let backgroundImageUrl: string | undefined
    {
      const desc = `Professional slide background related to ${formData.subject}: ${formData.topic}. Clean, modern, educational, subtle texture.`
      const encoded = encodeURIComponent(desc)
      const pollUrl = `https://pollinations.ai/p/${encoded}?model=nanobanana&width=1280&height=720&nologo=true&safe=true&quality=medium&transparent=false&seed=${Math.floor(Math.random()*1000000)}`
      const bgKey = opts?.userId
        ? buildUserScopedStorageKey(opts.userId, formData.subject, formData.topic, 'bg', 0)
        : buildStorageKey(formData.subject, formData.topic, 'bg', 0)
      const cachedPoll = await cacheImageToSupabase(pollUrl, bgKey)
      backgroundImageUrl = cachedPoll || pollUrl
      // Fallback a Wikimedia si falla cacheo o se requiere imagen real contextual
      if (!backgroundImageUrl) {
        const bgUrl = await findContextualImageUrl({ term: formData.topic, subject: formData.subject, topic: formData.topic, description: `Imagen general del tema` })
        if (bgUrl) {
          const cachedBg = await cacheImageToSupabase(bgUrl, bgKey)
          backgroundImageUrl = cachedBg || bgUrl
        }
      }
    }

    for (const decision of selected) {
      // Si el JSON integrado trae eventos de timeline, usarlos como fuente principal
      const integratedEvents: Array<{ title: string; description: string; date?: string; imageDescription?: string }> = (parsedAny?.timeline?.events || [])

      if (decision.type === 'course_presentation') {
        const maxSlides = decision.maxUnits || 8
        // Preferir eventos integrados (más descriptivos) como fuente de diapositivas; fallback a pares si no existen
        const slidesSource = (integratedEvents && integratedEvents.length > 0)
          ? integratedEvents
          : (parsed.linesMode.pairs || [])
        const slides = slidesSource.slice(0, maxSlides).map(p => ({ title: (p as any).title || (p as any).left, text: (p as any).description || (p as any).right }))
        cpTitles.splice(0, cpTitles.length, ...slides.map(s => (s.title || '').trim().toLowerCase()))
        const cp: StudyCoursePresentationContent = { backgroundImageUrl, slides }
        elements.push({ type: 'course_presentation', content: cp })
      } else if (decision.type === 'accordion_notes') {
        const maxSecs = decision.maxUnits || 6
        // PRIORIDAD: usar pares del MatchUp (contenido textual preciso del tema)
        // Fallback: usar eventos integrados solo si no hay pares disponibles
        const sourceBase = (parsed.linesMode.pairs && parsed.linesMode.pairs.length > 0)
          ? parsed.linesMode.pairs
          : (integratedEvents || [])
        let sections = (sourceBase || []).slice(0, maxSecs).map(p => ({ title: (p as any).left || (p as any).title, body: (p as any).right || (p as any).description }))
        // Filtrar títulos ya usados por Course Presentation para evitar duplicación
        if (cpTitles.length > 0) {
          sections = sections.filter(sec => !cpTitles.includes((sec.title || '').trim().toLowerCase()))
          // Si tras filtrar quedó muy corto, ampliar desde la fuente original para alcanzar maxSecs sin repetir títulos
          const extraSource = (sourceBase || [])
          for (const p of extraSource) {
            if (sections.length >= maxSecs) break
            const title = (p as any).left || (p as any).title
            const body = (p as any).right || (p as any).description
            const tnorm = (title || '').trim().toLowerCase()
            const exists = sections.find(s => (s.title || '').trim().toLowerCase() === tnorm) || cpTitles.includes(tnorm)
            if (!exists) sections.push({ title, body })
          }
        }
        // Fallback: si aún no hay secciones, crear al menos 3 usando pares o eventos disponibles
        if (!sections || sections.length === 0) {
          const fallbackSrc = (parsed.linesMode.pairs && parsed.linesMode.pairs.length > 0) ? parsed.linesMode.pairs : integratedEvents
          sections = (fallbackSrc || []).slice(0, Math.min(3, maxSecs)).map(p => ({ title: (p as any).left || (p as any).title || 'Concepto', body: (p as any).right || (p as any).description || 'Descripción breve' }))
        }
        const ac: StudyAccordionNotesContent = { sections }
        elements.push({ type: 'accordion_notes', content: ac })
      } else if (decision.type === 'timeline') {
        const maxEv = decision.maxUnits || 10
        const extractYearFromText = (txt?: string): string | undefined => {
          if (!txt) return undefined
          const m = txt.match(/\b(\d{4})\b/)
          return m ? m[1] : undefined
        }
        const sourceEventsAll = integratedEvents.length > 0
          ? integratedEvents
          : (parsed.linesMode.pairs || [])
              .map(p => ({ title: p.left, description: p.right, date: extractYearFromText(p.left) || extractYearFromText(p.right) }))
        const sourceEvents = typeof maxEv === 'number' ? sourceEventsAll.slice(0, maxEv) : sourceEventsAll

        const parseYear = (d?: string): number => {
          if (!d) return Number.POSITIVE_INFINITY
          const m = d.match(/\b(\d{4})\b/)
          if (m) return parseInt(m[1], 10)
          const t = Date.parse(d)
          return isNaN(t) ? Number.POSITIVE_INFINITY : t
        }

        // Utilidad: timeout para evitar bloqueos en búsqueda de imágenes reales
        const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T | null> => {
          return new Promise<T | null>((resolve) => {
            const id = setTimeout(() => resolve(null), ms)
            p.then((v) => { clearTimeout(id); resolve(v) }).catch(() => { clearTimeout(id); resolve(null) })
          })
        }

        const eventsPromises = sourceEvents.map(async (e, idx) => {
          const dateLabel = (e as any).date
          // Buscar imagen contextual preferentemente desde imageDescription; si no, usar título/tema
          const url = await withTimeout(findContextualImageUrl({
            term: e.title,
            subject: formData.subject,
            topic: formData.topic,
            description: (e as any).imageDescription || e.description,
          }), 1500)
          let finalUrl = url || undefined
          if (finalUrl) {
            const key = opts?.userId
              ? buildUserScopedStorageKey(opts.userId, formData.subject, formData.topic, `timeline-${e.title}`, idx)
              : buildStorageKey(formData.subject, formData.topic, `timeline-${e.title}`, idx)
            const cached = await cacheImageToSupabase(finalUrl, key)
            finalUrl = cached || finalUrl
          }
          return { title: e.title, description: e.description, date: dateLabel, imageUrl: finalUrl }
        })

        let events = await Promise.all(eventsPromises)
        // Ordenar eventos ASC por fecha (el menor primero)
        events = events.sort((a, b) => parseYear(a.date) - parseYear(b.date))
        // Incluir Timeline si hay al menos 1 evento (preferentemente con fecha)
        const eventsWithDate = events.filter(ev => !!ev.date)
        const finalEvents = eventsWithDate.length > 0 ? eventsWithDate : events
        if (finalEvents.length >= 1) {
          const tl: StudyTimelineContent = { events: finalEvents, topicImageUrl: backgroundImageUrl }
          elements.push({ type: 'timeline', content: tl })
        } else {
          console.info('ℹ️ Timeline descartada: insuficientes eventos con fecha detectable')
        }
      }
    }

    generated.studyElements = elements
  } catch (err) {
    console.warn('⚠️ No se pudieron construir elementos de estudio:', err)
  }

  return generated
}

export async function testOpenRouterConnection(): Promise<boolean> {
  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    if (!apiKey) return false
    const resp = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return resp.ok
  } catch (e) {
    console.error('Error conectando a OpenRouter:', e)
    return false
  }
}