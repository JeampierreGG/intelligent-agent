import type { ResourceFormData, GeneratedResource, MatchUpContent, StudyElement, StudyCoursePresentationContent, StudyAccordionNotesContent, StudyTimelineContent, QuizContent, GroupSortContent, AnagramContent, OpenTheBoxContent, GameElementBundle, FindTheMatchContent, StudyMnemonicContent } from './types'
import { decideStudyElements } from '../config/studyElements.local'

const getModel = (): string => {
  const m = import.meta.env.VITE_OPENROUTER_MODEL 
  return m
}

const getApiKey = (): string => {
  const k = import.meta.env.VITE_OPENROUTER_API_KEY || localStorage.getItem('OPENROUTER_API_KEY') || ''
  if (!k) throw new Error('Falta VITE_OPENROUTER_API_KEY en .env')
  return k
}

const callOpenRouter = async (prompt: string, temperature = 0.7): Promise<string> => {
  const apiKey = getApiKey()
  const model = getModel()
  const body = { model, messages: [ { role: 'system', content: 'Responde SOLO con JSON válido. Sin texto fuera del JSON.' }, { role: 'user', content: prompt } ], temperature }

  const attempt = async (signal: AbortSignal) => {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-KEY': apiKey,
        'X-Title': 'Learn Playing',
        'HTTP-Referer': (typeof location !== 'undefined' ? location.origin : 'http://localhost')
      },
      body: JSON.stringify(body),
      signal,
      keepalive: false
    })
    return resp
  }

  let lastErr: unknown = null
  for (let i = 0; i < 3; i++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 30000)
    try {
      const resp = await attempt(ctrl.signal)
      clearTimeout(t)
      if (resp.ok) {
        type ChatCompletion = { choices?: Array<{ message?: { content?: string } }> }
        const data: ChatCompletion = await resp.json()
        const content = data?.choices?.[0]?.message?.content ?? ''
        return content
      }
      if (resp.status >= 500) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        continue
      }
      throw new Error('Error en OpenRouter')
    } catch (e) {
      clearTimeout(t)
      lastErr = e
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Error en OpenRouter')
}

const findJsonBlock = (s: string): string | null => {
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') inStr = !inStr
    if (!inStr) {
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return s.slice(start, i + 1)
      }
    }
  }
  return null
}

const safeParseJson = (raw: string): unknown => {
  let s = (raw || '').trim()
  s = s.replace(/^```[a-zA-Z]*\s*/,'').replace(/```$/,'')
  const block = findJsonBlock(s) ?? s
  const tryParse = (t: string) => JSON.parse(t)
  try {
    return tryParse(block)
  } catch {
    const t1 = block
      .replace(/,\s*(\]|\})/g, '$1')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
    try {
      return tryParse(t1)
    } catch {
      const t2 = t1
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        .replace(/\\n/g, ' ')
        .replace(/\\t/g, ' ')
      return tryParse(t2)
    }
  }
}

const sanitizeText = (s: string | undefined): string => {
  let t = String(s || '')
  t = t.split('/').join(' ')
  t = t.replace(/\\+/g, ' ')
  t = t.replace(/\s{2,}/g, ' ').trim()
  return t
}

const sanitizeGroupSort = (gs: GroupSortContent): GroupSortContent => {
  const groups = Array.isArray(gs.groups) ? gs.groups.map(g => ({
    name: sanitizeText(g.name),
    items: Array.isArray(g.items) ? g.items.map(it => sanitizeText(it)) : []
  })) : []
  return {
    ...gs,
    title: sanitizeText(gs.title),
    instructions: sanitizeText(gs.instructions),
    groups,
  }
}

const normalizeGroupSortTwoGroups = (gs: GroupSortContent): GroupSortContent => {
  const base = sanitizeGroupSort(gs)
  const src = Array.isArray(base.groups) ? base.groups.slice(0, 2) : []
  const out: Array<{ name: string; items: string[] }> = []
  let count = 0
  for (const g of src) {
    const items: string[] = []
    for (const it of (Array.isArray(g.items) ? g.items : [])) {
      if (count >= 6) break
      items.push(it)
      count++
    }
    out.push({ name: g.name, items })
  }
  return { ...base, groups: out }
}

// Genera un prompt INTEGRADO: primero una línea de tiempo con información extensa ordenada por fecha,
// y a partir de ese mismo contenido, actividades MatchUp (líneas e imágenes).
const buildIntegratedPrompt = (formData: ResourceFormData, userAge: number): string => {
  // Sujetos opcionales: usar textos genéricos si se omiten para acelerar generación
  const subjectText = (formData.subject || 'General')
  const topicText = (formData.topic || 'Libre')
  const academicLevel = formData.academicLevel || 'Nivel general'

  return `Genera un SOLO JSON válido que incluya:
1) Una línea de tiempo vertical con eventos ordenados de MENOR a MAYOR fecha.
2) Actividad Match up (modo líneas) BASADA en esa misma información.
3) Un Cuestionario (Quiz) de EXACTAMENTE 5 preguntas de opción múltiple.
4) Una actividad de Ordenar por grupo (Group Sort) con 2 grupos y hasta 6 ítems.
5) Una actividad de Anagrama (Anagram) con 5 ítems.
6) Una actividad de Abrecajas (Open the Box) con EXACTAMENTE 5 cajas.
7) Una actividad "Cada oveja con su pareja" (Find the Match) con EXACTAMENTE 5 pares concepto-afirmación.

Formato JSON EXACTO (sin texto extra):
{
  "matchUp": {
    "templateType": "match_up",
    "title": "<título descriptivo>",
    "instructions_lines": "<instrucciones para modo líneas>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "linesMode": { "pairs": [ { "left": "...", "right": "..." } ] }
  },
  "findTheMatch": {
    "templateType": "find_the_match",
    "title": "<título descriptivo>",
    "instructions": "<instrucciones breves>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "pairs": [ { "concept": "...", "affirmation": "..." } ]
  },
  "openTheBox": {
    "templateType": "open_the_box",
    "title": "<título descriptivo>",
    "instructions": "<instrucciones breves>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "items": [
      { "question": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..." }
    ]
  },
  "anagram": {
    "templateType": "anagram",
    "title": "<título descriptivo>",
    "instructions": "<instrucciones>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "items": [
      { "clue": "<pista opcional>", "answer": "<palabra o frase>", "scrambled": "<letras desordenadas>" }
    ]
  },
  "quiz": {
    "templateType": "quiz",
    "title": "<título descriptivo>",
    "instructions": "<instrucciones>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "questions": [
      { "prompt": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..." }
    ]
  },
  "groupSort": {
    "templateType": "group_sort",
    "title": "<título descriptivo>",
    "instructions": "<instrucciones>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "groups": [
      { "name": "<nombre del grupo>", "items": ["...","..."] }
    ],
    "umbrellaWord": "<palabra que abarca varios cuadros>",
    "umbrellaCoversItems": ["<ítem>", "<ítem>"]
  },
  "timeline": {
    "events": [
      { "title": "<título del evento>", "description": "<descripción extensa y relevante>", "date": "<YYYY-MM-DD o YYYY>" }
    ]
  }
}

Requisitos:
- Línea de tiempo: máximo 8, entre 5 y 8 eventos con fecha visible y descripción amplia. Ordena de menor a mayor.
- MatchUp (líneas): 5 pares derivados del mismo tema. Las definiciones deben ser claras para ${userAge} años.
- Quiz: EXACTAMENTE 5 preguntas, cada una con EXACTAMENTE 4 opciones. Incluye justificación breve por pregunta.
- Group Sort: 2 grupos y hasta 6 ítems totales. Evita redundancias y nombres reveladores.
- Anagram: 5 ítems con "answer" y "scrambled" consistentes.
- Open the Box: EXACTAMENTE 5 cajas con preguntas de opción múltiple y explicación breve.
- Find the Match: EXACTAMENTE 5 pares {concept, affirmation} precisos y breves.
105→- Course Presentation: 5 diapositivas con texto verificable y fuentes.
106→- Adapta la dificultad al nivel académico: ${academicLevel}.
- Responde SOLO con el JSON (sin Markdown ni explicaciones).`
}

// Asegura que Open the Box tenga EXACTAMENTE 5 cajas
const ensureExactlyFiveOpenBoxItems = (otb: OpenTheBoxContent): OpenTheBoxContent => {
  const items = Array.isArray(otb.items) ? otb.items : []
  if (items.length === 0) return otb
  if (items.length > 5) return { ...otb, items: items.slice(0, 5) }
  if (items.length === 5) return otb
  const padded: typeof items = [...items]
  for (let i = 0; padded.length < 5; i++) {
    const src = items[i % items.length]
    padded.push({ ...src })
  }
  return { ...otb, items: padded }
}

// Normaliza Find the Match para que tenga EXACTAMENTE 5 pares ÚNICOS (concept y affirmation únicos).
// - Elimina duplicados por concepto y por affirmation.
// - Si hay más de 5, recorta a 5.
// - Si hay menos de 5, NO rellena con duplicados (se intentará una segunda solicitud para completar).
const ensureExactlyFiveUniqueFindTheMatchPairs = (ftm: FindTheMatchContent): FindTheMatchContent => {
  const raw = Array.isArray(ftm.pairs) ? ftm.pairs : []
  const concepts = new Set<string>()
  const affirmations = new Set<string>()
  const unique: typeof raw = []
  for (const p of raw) {
    if (!p || typeof p.concept !== 'string' || typeof p.affirmation !== 'string') continue
    const c = p.concept.trim()
    const a = p.affirmation.trim()
    if (!c || !a) continue
    const keyC = c.toLowerCase()
    const keyA = a.toLowerCase()
    if (concepts.has(keyC) || affirmations.has(keyA)) continue
    concepts.add(keyC)
    affirmations.add(keyA)
    unique.push({ concept: c, affirmation: a })
    if (unique.length === 5) break
  }
  return { ...ftm, pairs: unique.slice(0, 5) }
}

// DEPRECATED: generación integrada (timeline + múltiples juegos). Mantener solo para compatibilidad.
// No agrega imágenes ni campos relacionados a imágenes.
export async function generateMatchUpResource(formData: ResourceFormData): Promise<GeneratedResource> {

  // Calcular edad aproximada
  const currentYear = new Date().getFullYear()
  const birthYearStr = formData.userBirthData?.birth_year
  const birthYear = typeof birthYearStr === 'string' ? parseInt(birthYearStr, 10) : (birthYearStr as number | undefined)
  const userAge = typeof birthYear === 'number' ? Math.max(0, currentYear - birthYear) : 0

  const prompt = buildIntegratedPrompt(formData, userAge)
  const content = await callOpenRouter(prompt, 0.7)
  const parsedUnknown: unknown = safeParseJson(content)

  // Seleccionar bloque MatchUp desde el JSON integrado (o aceptar formato antiguo)
  let parsed: MatchUpContent | null = null
  if (typeof parsedUnknown === 'object' && parsedUnknown !== null && (parsedUnknown as Record<string, unknown>).templateType === 'match_up') {
    parsed = parsedUnknown as MatchUpContent
  } else if (typeof parsedUnknown === 'object' && parsedUnknown !== null && (parsedUnknown as Record<string, unknown>).matchUp && ((parsedUnknown as Record<string, unknown>).matchUp as Record<string, unknown>).templateType === 'match_up') {
    parsed = ((parsedUnknown as Record<string, unknown>).matchUp) as MatchUpContent
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

  // Deshabilitar por completo el modo de imágenes para MatchUp (no permitido)
  const parsedObj = parsed as unknown as Record<string, unknown>
  if (parsedObj.imagesMode) {
    delete parsedObj.imagesMode
  }

  // Construir bundle de elementos de juego priorizando respuesta API si existe
  const apiBundle = (typeof parsedUnknown === 'object' && parsedUnknown !== null) ? (parsedUnknown as { gameelement?: GameElementBundle }).gameelement : undefined
  const gameBundle: GameElementBundle = { matchUp: parsed }
  try {
    if (apiBundle && typeof apiBundle === 'object') {
      const b = apiBundle as GameElementBundle
      if ((b.matchUp as MatchUpContent | undefined)?.templateType === 'match_up') gameBundle.matchUp = b.matchUp as MatchUpContent
      if ((b.quiz as QuizContent | undefined)?.templateType === 'quiz') gameBundle.quiz = b.quiz as QuizContent
      if ((b.groupSort as GroupSortContent | undefined)?.templateType === 'group_sort') gameBundle.groupSort = b.groupSort as GroupSortContent
      if ((b.anagram as AnagramContent | undefined)?.templateType === 'anagram') gameBundle.anagram = b.anagram as AnagramContent
      if ((b.openTheBox as OpenTheBoxContent | undefined)?.templateType === 'open_the_box') gameBundle.openTheBox = b.openTheBox as OpenTheBoxContent
      if ((b.findTheMatch as FindTheMatchContent | undefined)?.templateType === 'find_the_match') gameBundle.findTheMatch = b.findTheMatch as FindTheMatchContent
    }
  } catch (e) {
    console.warn('Bundle gameelement inválido u ausente, usando solo MatchUp procesado:', e)
  }

  const generated: GeneratedResource = {
    title: parsed.title || `${formData.subject}: ${formData.topic}`,
    summary: `Actividad “Unir parejas” (líneas) sobre ${formData.topic} en ${formData.subject}`,
    difficulty: parsed.difficulty || 'Intermedio',
    gameelement: gameBundle,
    studyElements: []
  }

  // Adjuntar Quiz si existe en el JSON
  try {
    const quizBlock = (apiBundle as GameElementBundle | undefined)?.quiz ?? (typeof parsedUnknown === 'object' && parsedUnknown !== null ? (parsedUnknown as Record<string, unknown>).quiz as QuizContent | undefined : undefined)
    if ((quizBlock as QuizContent | undefined)?.templateType === 'quiz' && Array.isArray((quizBlock as QuizContent).questions) && (quizBlock as QuizContent).questions.length > 0) {
      generated.gameelement = { ...(generated.gameelement || {}), quiz: quizBlock as QuizContent }
    }
  } catch (e) {
    console.warn('Quiz inválido u ausente en JSON:', e)
  }

  // Adjuntar Group Sort si existe en el JSON
  try {
    const gsBlock = (apiBundle as GameElementBundle | undefined)?.groupSort ?? (typeof parsedUnknown === 'object' && parsedUnknown !== null ? (parsedUnknown as Record<string, unknown>).groupSort as GroupSortContent | undefined : undefined)
    if ((gsBlock as GroupSortContent | undefined)?.templateType === 'group_sort' && Array.isArray((gsBlock as GroupSortContent).groups) && (gsBlock as GroupSortContent).groups.length > 0) {
      const cleaned = normalizeGroupSortTwoGroups(gsBlock as GroupSortContent)
      generated.gameelement = { ...(generated.gameelement || {}), groupSort: cleaned }
    }
  } catch (e) {
    console.warn('GroupSort inválido u ausente en JSON:', e)
  }

  // Adjuntar Anagram si existe en el JSON
  try {
    const anBlock = (apiBundle as GameElementBundle | undefined)?.anagram ?? (typeof parsedUnknown === 'object' && parsedUnknown !== null ? (parsedUnknown as Record<string, unknown>).anagram as AnagramContent | undefined : undefined)
    if ((anBlock as AnagramContent | undefined)?.templateType === 'anagram' && Array.isArray((anBlock as AnagramContent).items) && (anBlock as AnagramContent).items.length > 0) {
      generated.gameelement = { ...(generated.gameelement || {}), anagram: anBlock as AnagramContent }
    }
  } catch (e) {
    console.warn('Anagram inválido u ausente en JSON:', e)
  }

  // Adjuntar Open the Box si existe en el JSON
  try {
    const otbBlock = (apiBundle as GameElementBundle | undefined)?.openTheBox ?? (typeof parsedUnknown === 'object' && parsedUnknown !== null ? (parsedUnknown as Record<string, unknown>).openTheBox as OpenTheBoxContent | undefined : undefined)
    if ((otbBlock as OpenTheBoxContent | undefined)?.templateType === 'open_the_box' && Array.isArray((otbBlock as OpenTheBoxContent).items) && (otbBlock as OpenTheBoxContent).items.length > 0) {
      const ensured = ensureExactlyFiveOpenBoxItems(otbBlock as OpenTheBoxContent)
      generated.gameelement = { ...(generated.gameelement || {}), openTheBox: ensured }
    }
  } catch (e) {
    console.warn('OpenTheBox inválido u ausente en JSON:', e)
  }

  // Adjuntar Find the Match si existe en el JSON
  try {
    const ftmBlock = (apiBundle as GameElementBundle | undefined)?.findTheMatch ?? (typeof parsedUnknown === 'object' && parsedUnknown !== null ? (parsedUnknown as Record<string, unknown>).findTheMatch as FindTheMatchContent | undefined : undefined)
    if ((ftmBlock as FindTheMatchContent | undefined)?.templateType === 'find_the_match' && Array.isArray((ftmBlock as FindTheMatchContent).pairs) && (ftmBlock as FindTheMatchContent).pairs.length === 5) {
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

    // Fondo o imágenes deshabilitados: no se generan ni se adjuntan

    for (const decision of selected) {
      // Si el JSON integrado trae eventos de timeline, usarlos como fuente principal
      const integratedEvents: Array<{ title: string; description: string; date?: string }> = ((typeof parsedUnknown === 'object' && parsedUnknown !== null) ? ((parsedUnknown as Record<string, unknown>).timeline as { events?: Array<{ title: string; description: string; date?: string }> } | undefined)?.events ?? [] : [])

      if (decision.type === 'course_presentation') {
        const maxSlides = decision.maxUnits || 8
        // Preferir eventos integrados (más descriptivos) como fuente de diapositivas; fallback a pares si no existen
        const slidesSource = (integratedEvents && integratedEvents.length > 0)
          ? integratedEvents
          : (parsed.linesMode.pairs || [])
        const slides = slidesSource.slice(0, maxSlides).map((p) => {
          const o = p as Record<string, unknown>
          const title = (typeof o.title === 'string' ? o.title : typeof o.left === 'string' ? o.left : '')
          const text = (typeof o.description === 'string' ? o.description : typeof o.right === 'string' ? o.right : '')
          return { title, text }
        })
        cpTitles.splice(0, cpTitles.length, ...slides.map(s => (s.title || '').trim().toLowerCase()))
      // Ya no usamos imagen de fondo en Course Presentation
      const cp: StudyCoursePresentationContent = { slides }
        elements.push({ type: 'course_presentation', content: cp })
      } else if (decision.type === 'accordion_notes') {
        const maxSecs = decision.maxUnits || 5
        // PRIORIDAD: usar pares del MatchUp (contenido textual preciso del tema)
        // Fallback: usar eventos integrados solo si no hay pares disponibles
        const sourceBase = (parsed.linesMode.pairs && parsed.linesMode.pairs.length > 0)
          ? parsed.linesMode.pairs
          : (integratedEvents || [])
        let sections = (sourceBase || []).slice(0, maxSecs).map((p) => {
          const o = p as Record<string, unknown>
          const title = (typeof o.left === 'string' ? o.left : typeof o.title === 'string' ? o.title : 'Concepto')
          const body = (typeof o.right === 'string' ? o.right : typeof o.description === 'string' ? o.description : 'Descripción breve')
          return { title, body }
        })
        // Filtrar títulos ya usados por Course Presentation para evitar duplicación
        if (cpTitles.length > 0) {
          sections = sections.filter(sec => !cpTitles.includes((sec.title || '').trim().toLowerCase()))
          // Si tras filtrar quedó muy corto, ampliar desde la fuente original para alcanzar maxSecs sin repetir títulos
          const extraSource = (sourceBase || [])
          for (const p of extraSource) {
            if (sections.length >= maxSecs) break
            const o = p as Record<string, unknown>
            const title = (typeof o.left === 'string' ? o.left : typeof o.title === 'string' ? o.title : '')
            const body = (typeof o.right === 'string' ? o.right : typeof o.description === 'string' ? o.description : '')
            const tnorm = (title || '').trim().toLowerCase()
            const exists = sections.find(s => (s.title || '').trim().toLowerCase() === tnorm) || cpTitles.includes(tnorm)
            if (!exists) sections.push({ title, body })
          }
        }
        // Fallback: si aún no hay secciones, crear al menos 3 usando pares o eventos disponibles
        if (!sections || sections.length === 0) {
          const fallbackSrc = (parsed.linesMode.pairs && parsed.linesMode.pairs.length > 0) ? parsed.linesMode.pairs : integratedEvents
          sections = (fallbackSrc || []).slice(0, Math.min(3, maxSecs)).map((p) => {
            const o = p as Record<string, unknown>
            const title = (typeof o.left === 'string' ? o.left : typeof o.title === 'string' ? o.title : 'Concepto')
            const body = (typeof o.right === 'string' ? o.right : typeof o.description === 'string' ? o.description : 'Descripción breve')
            return { title, body }
          })
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

        // Construir eventos sin imágenes
        let events = sourceEvents.map((e) => ({ title: e.title, description: e.description, date: (e as { date?: string }).date }))
        // Ordenar eventos ASC por fecha (el menor primero)
        events = events.sort((a, b) => parseYear(a.date) - parseYear(b.date))
        // Incluir Timeline si hay al menos 1 evento (preferentemente con fecha)
        const eventsWithDate = events.filter(ev => !!ev.date)
        const finalEvents = eventsWithDate.length > 0 ? eventsWithDate : events
        if (finalEvents.length >= 1) {
          const tl: StudyTimelineContent = { events: finalEvents }
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

// Generación rápida SOLO de elementos de aprendizaje (Timeline, Course Presentation, Accordion Notes)
export async function generateStudyOnlyResource(
  formData: ResourceFormData,
  selectedLearningKeys: string[],
  // opts removed
): Promise<GeneratedResource> {
  

  // Edad del usuario no utilizada en esta generación: omitir cálculo

  const subjectText = (formData.subject || 'General')
  const topicText = (formData.topic || 'Libre')
  const academicLevel = formData.academicLevel || 'Nivel general'
  const selectedDifficulty = formData.difficulty || 'Intermedio'
  const birth = formData.userBirthData
  const ageYears = (() => {
    try {
      const yy = birth?.birth_year ? Number(birth.birth_year) : NaN
      const mm = birth?.birth_month ? Number(birth.birth_month) : 1
      const dd = birth?.birth_day ? Number(birth.birth_day) : 1
      if (!Number.isFinite(yy)) return null
      const now = new Date()
      let age = now.getFullYear() - yy
      const m = now.getMonth() + 1
      const d = now.getDate()
      if (m < mm || (m === mm && d < dd)) age -= 1
      return age >= 0 && age <= 120 ? age : null
    } catch { return null }
  })()

  // Construye dinámicamente la estructura y los requisitos según los checkboxes marcados
  const wantTimeline = selectedLearningKeys.includes('timeline')
  const wantCourse = selectedLearningKeys.includes('course_presentation')
  const wantAccordion = selectedLearningKeys.includes('accordion_notes')
  const wantMnemonic = selectedLearningKeys.includes('mnemonic_creator')

  const structureParts: string[] = []
  if (wantTimeline) {
    structureParts.push(`"timeline": { "events": [ { "title": "...", "description": "Descripción rigurosa con contexto, causas y consecuencias (6–10 frases).", "date": "YYYY o YYYY-MM-DD" } ] }`)
  }
  if (wantCourse) {
    structureParts.push(`"course_presentation": { "slides": [ { "title": "...", "text": "Explicación clara y verificable en EXACTAMENTE 5 frases o puntos. Incluye definiciones, ejemplos breves, datos y relaciones clave. Al final, añade: Fuentes: seguido de 1–3 URLs confiables." } ] }`)
  }
  if (wantAccordion) {
    structureParts.push(`"accordion_notes": { "sections": [ { "title": "...", "body": "Contenido contundente y verificable del subtema, en 5–7 puntos claros. Debe incluir definiciones precisas, datos concretos (años, cifras, nombres propios), ejemplos breves y relaciones clave entre conceptos. Evitar relleno y vaguedades; no repetir literalmente las diapositivas, complementar con nueva información rigurosa." } ] }`)
  }
  if (wantMnemonic) {
    structureParts.push(`"mnemonic_creator": { "items": [ { "prompt": "concepto", "answer": "definición breve y rigurosa" } ] }`)
  }

  const structureJson = `{
  ${structureParts.join(',\n  ')}
}`

  const requirements: string[] = []
  if (wantCourse) requirements.push('- Presentación (course_presentation): entre 5 diapositivas. Cada diapositiva con EXACTAMENTE 5 frases o puntos verificables.')
  if (wantAccordion) requirements.push('- Notas en acordeón (accordion_notes): 5 secciones. Cada sección con contenido sustantivo (5 frases o viñetas) que complemente a las diapositivas.')
  if (wantTimeline) requirements.push('- Línea de tiempo (timeline): entre 5 y 8 eventos. Ordenados de menor a mayor fecha. Cada evento con fecha y descripción rigurosa (causas, consecuencias, relevancia).')
  if (wantMnemonic) requirements.push('- Mnemotecnia (mnemonic_creator): genera 5 ítems con pares {prompt, answer}. prompt es el término a recordar; answer es la definición. No generes el texto de mnemotecnia automáticamente aquí.')
  requirements.push(`- Tema de referencia: ${subjectText} - ${topicText}. Ajusta el contenido al nivel académico: ${academicLevel} y a la dificultad: ${selectedDifficulty}.`)
  if (ageYears != null) requirements.push(`- Edad estimada del estudiante: ${ageYears} años. Adapta vocabulario, ejemplos y profundidad a esa edad.`)
  requirements.push('- No incluyas claves para elementos NO solicitados.')
  requirements.push('- No incluyas campos relacionados con imágenes (imageUrl, imageDescription, background_image_url) ni URLs de imágenes.')
  requirements.push('- Responde ÚNICAMENTE con el JSON, sin texto adicional ni Markdown.')

  const prompt = `Genera SOLO JSON válido en español con ELEMENTOS DE APRENDIZAJE completos y profesionales, únicamente los elementos solicitados:
${structureJson}
Requisitos estrictos\n${requirements.join('\n')}`

  const content = await callOpenRouter(prompt, 0.5)
  let parsedUnknown: unknown
  try {
    parsedUnknown = safeParseJson(content)
  } catch {
    const repairPrompt = `Repite la respuesta EN FORMATO JSON ESTRICTO válido (RFC8259). No incluyas texto fuera del JSON ni Markdown. No uses claves sin comillas. No uses comillas escapadas (\\"). No uses comillas tipográficas. No añadas comentarios ni comas finales. Debes incluir EXACTAMENTE las llaves y forma mostradas:\n${structureJson}`
    const content2 = await callOpenRouter(repairPrompt, 0.2)
    parsedUnknown = safeParseJson(content2)
  }

  const generated: GeneratedResource = {
    title: `${subjectText}: ${topicText}`,
    summary: `Elementos de aprendizaje sobre ${topicText} en ${subjectText}`,
    difficulty: selectedDifficulty,
    studyElements: []
  }

  // Construcción de elementos de estudio (solo los seleccionados)
  try {
    const elements: StudyElement[] = []
    const cp = (typeof parsedUnknown === 'object' && parsedUnknown !== null) ? ((parsedUnknown as Record<string, unknown>).course_presentation as { slides?: Array<{ title: string; text: string }> } | undefined)?.slides : undefined
    if (wantCourse && Array.isArray(cp) && cp.length > 0) {
      elements.push({ type: 'course_presentation', content: { slides: cp } as StudyCoursePresentationContent })
    }
    const acc = (typeof parsedUnknown === 'object' && parsedUnknown !== null) ? ((parsedUnknown as Record<string, unknown>).accordion_notes as { sections?: Array<{ title: string; body: string }> } | undefined)?.sections : undefined
    if (wantAccordion && Array.isArray(acc) && acc.length > 0) {
      elements.push({ type: 'accordion_notes', content: { sections: acc } as StudyAccordionNotesContent })
    }
    const tl = (typeof parsedUnknown === 'object' && parsedUnknown !== null) ? ((parsedUnknown as Record<string, unknown>).timeline as { events?: Array<{ title: string; description: string; date?: string }> } | undefined)?.events : undefined
    if (wantTimeline && Array.isArray(tl) && tl.length > 0) {
      // Adjuntar eventos sin imágenes
      elements.push({ type: 'timeline', content: { events: tl } as StudyTimelineContent })
    }
    const mn = (typeof parsedUnknown === 'object' && parsedUnknown !== null) ? ((parsedUnknown as Record<string, unknown>).mnemonic_creator as { items?: Array<{ prompt: string; answer: string }> } | undefined)?.items : undefined
    if (wantMnemonic) {
      let itemsSrc: Array<{ prompt: string; answer: string }> = Array.isArray(mn) && mn.length > 0 ? mn : []
      if (itemsSrc.length === 0) {
        // Fallback: derivar 4 ítems desde timeline o acordeón
        const pickFromAcc: Array<{ prompt: string; answer: string }> = (Array.isArray(acc) ? acc : []).slice(0, 4).map(s => ({ prompt: s.title || 'Concepto', answer: s.body || 'Definición' }))
        const pickFromTl: Array<{ prompt: string; answer: string }> = (Array.isArray(tl) ? tl : []).slice(0, 4).map(e => ({ prompt: e.title || 'Evento', answer: e.description || 'Descripción' }))
        itemsSrc = pickFromAcc.length > 0 ? pickFromAcc : pickFromTl
        if (itemsSrc.length === 0) {
          // Último recurso: placeholders razonables
          itemsSrc = [
            { prompt: `${topicText} 1`, answer: `Definición breve de ${topicText} 1` },
            { prompt: `${topicText} 2`, answer: `Definición breve de ${topicText} 2` },
            { prompt: `${topicText} 3`, answer: `Definición breve de ${topicText} 3` },
            { prompt: `${topicText} 4`, answer: `Definición breve de ${topicText} 4` },
          ]
        }
      }
      const mc: StudyMnemonicContent = { items: itemsSrc.slice(0, 4), subject: subjectText, topic: topicText }
      elements.push({ type: 'mnemonic_creator', content: mc })
    }
    generated.studyElements = elements
  } catch (e) {
    console.warn('Error construyendo elementos de estudio (solo):', e)
  }

  return generated
}

// Generación SOLO de elementos de juego, retorna bundle para combinar con recurso existente
export async function generateGameElementsOnly(formData: ResourceFormData, selectedGameKeys: string[]): Promise<GameElementBundle> {
  

  const subjectText = (formData.subject || 'General')
  const topicText = (formData.topic || 'Libre')
  const selectedDifficulty = formData.difficulty || 'Intermedio'
  const birth = formData.userBirthData
  const ageYears = (() => {
    try {
      const yy = birth?.birth_year ? Number(birth.birth_year) : NaN
      const mm = birth?.birth_month ? Number(birth.birth_month) : 1
      const dd = birth?.birth_day ? Number(birth.birth_day) : 1
      if (!Number.isFinite(yy)) return null
      const now = new Date()
      let age = now.getFullYear() - yy
      const m = now.getMonth() + 1
      const d = now.getDate()
      if (m < mm || (m === mm && d < dd)) age -= 1
      return age >= 0 && age <= 120 ? age : null
    } catch { return null }
  })()
  // La selección de elementos se maneja dentro de requestParsed(keys) usando "keys" directamente

  // Nota: La construcción del prompt dinámico se realiza abajo en requestParsed(keys).

  // Helper para llamar al endpoint y obtener JSON parseado
  const requestParsed = async (keys: string[]) => {
    const wantMU = keys.includes('match_up')
    const wantQZ = keys.includes('quiz')
    const wantGS = keys.includes('group_sort')
    const wantAG = keys.includes('anagram')
    const wantOTB = keys.includes('open_the_box')
    const wantFTM = keys.includes('find_the_match')

    const parts: string[] = []
    if (wantMU) parts.push(`"matchUp": { "templateType": "match_up", "title": "...", "linesMode": { "pairs": [ { "left": "concepto", "right": "definición breve y rigurosa" } ] } }`)
    if (wantQZ) parts.push(`"quiz": { "templateType": "quiz", "title": "...", "questions": [ { "prompt": "pregunta clara y específica", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "razón breve y correcta" } ] }`)
    if (wantGS) parts.push(`"groupSort": { "templateType": "group_sort", "title": "...", "groups": [ { "name": "Categoría A", "items": ["x","y"] }, { "name": "Categoría B", "items": ["z"] } ] }`)
    if (wantAG) parts.push(`"anagram": { "templateType": "anagram", "title": "...", "items": [ { "clue": "pista conceptual", "answer": "término", "scrambled": "letras desordenadas" } ] }`)
    if (wantOTB) parts.push(`"openTheBox": { "templateType": "open_the_box", "title": "...", "items": [ { "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "razón breve y correcta" } ] }`)
    if (wantFTM) parts.push(`"findTheMatch": { "templateType": "find_the_match", "title": "...", "pairs": [ { "concept": "...", "affirmation": "definición o afirmación correcta" } ] }`)

    const struct = `{
  ${parts.join(',\n  ')}
}`

    const subPrompt = `Genera SOLO JSON válido en español con TODOS los ELEMENTOS DE JUEGO SOLICITADOS para el tema ${subjectText} - ${topicText}:
${struct}
Requisitos estrictos:
- Cada elemento debe aportar aprendizaje real (evitar trivialidades y redundancias).
- Genera entre 5 ítems por elemento solicitado.
- Las explicaciones deben ser breves, claras y correctas; usar terminología apropiada.
- No incluyas claves para elementos NO solicitados.
- No incluyas campos de imágenes (imageUrl, imageDescription, background_image_url) ni URLs de imágenes.
- Para findTheMatch: EXACTAMENTE 5 pares. No repitas conceptos ni afirmaciones; cada afirmación debe ser única.
- Debes INCLUIR TODAS las llaves presentes en la estructura anterior. No omitas ninguna.
- Para cada bloque, agrega el campo templateType con exactamente estos valores:
  - matchUp.templateType = "match_up"
  - quiz.templateType = "quiz"
  - groupSort.templateType = "group_sort"
  - anagram.templateType = "anagram"
  - openTheBox.templateType = "open_the_box"
  - findTheMatch.templateType = "find_the_match"
- Ajusta el contenido y complejidad a la dificultad: ${selectedDifficulty} y al nivel académico del usuario si está disponible.
${ageYears != null ? `- Edad estimada del estudiante: ${ageYears} años. Adapta vocabulario y profundidad a esa edad.` : ''}
- Responde ÚNICAMENTE con el JSON, sin texto adicional ni Markdown.`

    const content = await callOpenRouter(subPrompt, 0.5)
    try {
      return safeParseJson(content) as unknown
    } catch {
      const repairPrompt = `Repite la respuesta EN FORMATO JSON ESTRICTO válido (RFC8259). No incluyas texto fuera del JSON ni Markdown. No uses claves sin comillas. No uses comillas escapadas (\\"). No uses comillas tipográficas. No añadas comentarios ni comas finales. Debes incluir EXACTAMENTE las llaves y forma mostradas:\n${struct}`
      const content2 = await callOpenRouter(repairPrompt, 0.2)
      return safeParseJson(content2) as unknown
    }
  }

  // Primera solicitud para todas las llaves seleccionadas
  const parsed1 = await requestParsed(selectedGameKeys)

  const bundle: GameElementBundle = {}

  // Función de fusión relajada: acepta bloques aunque falte templateType si la forma es válida
  const acceptBlocks = (parsed: unknown) => {
    if (selectedGameKeys.includes('match_up')) {
      const mu = (typeof parsed === 'object' && parsed !== null) ? (parsed as Record<string, unknown>).matchUp as MatchUpContent | undefined : undefined
      const valid = !!(mu?.linesMode?.pairs && mu.linesMode.pairs.length > 0)
      if (valid) bundle.matchUp = { templateType: 'match_up', title: mu.title || 'Unir parejas', linesMode: mu.linesMode, difficulty: selectedDifficulty } as MatchUpContent
    }
    if (selectedGameKeys.includes('quiz')) {
      const qz = (typeof parsed === 'object' && parsed !== null) ? (parsed as Record<string, unknown>).quiz as QuizContent | undefined : undefined
      const valid = !!(Array.isArray(qz?.questions) && qz!.questions.length > 0)
      if (valid) bundle.quiz = { ...(qz as QuizContent), templateType: 'quiz', difficulty: selectedDifficulty }
    }
    if (selectedGameKeys.includes('group_sort')) {
      const gs = (typeof parsed === 'object' && parsed !== null) ? (parsed as Record<string, unknown>).groupSort as GroupSortContent | undefined : undefined
      const valid = !!(Array.isArray(gs?.groups) && gs!.groups.length > 0)
      if (valid) bundle.groupSort = normalizeGroupSortTwoGroups({ ...(gs as GroupSortContent), templateType: 'group_sort', difficulty: selectedDifficulty })
    }
    if (selectedGameKeys.includes('anagram')) {
      const ag = (typeof parsed === 'object' && parsed !== null) ? (parsed as Record<string, unknown>).anagram as AnagramContent | undefined : undefined
      const valid = !!(Array.isArray(ag?.items) && ag!.items.length > 0)
      if (valid) bundle.anagram = { ...(ag as AnagramContent), templateType: 'anagram', difficulty: selectedDifficulty }
    }
    if (selectedGameKeys.includes('open_the_box')) {
      const otb = (typeof parsed === 'object' && parsed !== null) ? (parsed as Record<string, unknown>).openTheBox as OpenTheBoxContent | undefined : undefined
      const valid = !!(Array.isArray(otb?.items) && otb!.items.length > 0)
      if (valid) bundle.openTheBox = ensureExactlyFiveOpenBoxItems({ ...(otb as OpenTheBoxContent), templateType: 'open_the_box', difficulty: selectedDifficulty })
    }
    if (selectedGameKeys.includes('find_the_match')) {
      const ftm = (typeof parsed === 'object' && parsed !== null) ? (parsed as Record<string, unknown>).findTheMatch as FindTheMatchContent | undefined : undefined
      const valid = !!(Array.isArray(ftm?.pairs) && ftm!.pairs.length > 0)
      if (valid) bundle.findTheMatch = ensureExactlyFiveUniqueFindTheMatchPairs({ ...(ftm as FindTheMatchContent), templateType: 'find_the_match', difficulty: selectedDifficulty })
    }
  }

  acceptBlocks(parsed1)

  // Intento de completar pares únicos para Find the Match si quedaron menos de 6
  if (selectedGameKeys.includes('find_the_match') && bundle.findTheMatch) {
    const currentCount = Array.isArray(bundle.findTheMatch.pairs) ? bundle.findTheMatch.pairs.length : 0
    if (currentCount < 5) {
      try {
        const parsedExtra = await requestParsed(['find_the_match'])
        const ftm2 = (typeof parsedExtra === 'object' && parsedExtra !== null) ? (parsedExtra as Record<string, unknown>).findTheMatch as FindTheMatchContent | undefined : undefined
        if (Array.isArray(ftm2?.pairs) && ftm2.pairs.length > 0) {
          const merged = ensureExactlyFiveUniqueFindTheMatchPairs({
            ...(bundle.findTheMatch as FindTheMatchContent),
            pairs: [ ...(bundle.findTheMatch.pairs || []), ...ftm2.pairs ],
          })
          bundle.findTheMatch = { ...merged, templateType: 'find_the_match' }
        }
      } catch (e) {
        console.warn('No se pudieron completar pares únicos de Find the Match en primer intento:', e)
      }
    }
  }

  // Reintento para llaves faltantes (una sola vez)
  const missing = selectedGameKeys.filter(k => {
    if (k === 'match_up') return !bundle.matchUp
    if (k === 'quiz') return !bundle.quiz
    if (k === 'group_sort') return !bundle.groupSort
    if (k === 'anagram') return !bundle.anagram
    if (k === 'open_the_box') return !bundle.openTheBox
    if (k === 'find_the_match') return !bundle.findTheMatch
    return false
  })

  if (missing.length > 0) {
    try {
      const parsed2 = await requestParsed(missing)
      acceptBlocks(parsed2)
    } catch (e) {
      console.warn('Reintento de elementos de juego faltantes falló:', e)
    }
  }

  // Normalización final: asegurar exactamente 6 pares únicos si existe find_the_match
  if (bundle.findTheMatch) {
    bundle.findTheMatch = ensureExactlyFiveUniqueFindTheMatchPairs(bundle.findTheMatch)
  }

  return bundle
}

export async function testOpenRouterConnection(): Promise<boolean> {
  try {
    const apiKey = getApiKey()
    const resp = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return resp.ok
  } catch (e) {
    console.error('Error conectando a OpenRouter:', e)
    return false
  }
}
