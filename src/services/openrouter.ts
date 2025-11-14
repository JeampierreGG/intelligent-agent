import type { ResourceFormData, GeneratedResource, MatchUpContent, StudyElement, StudyCoursePresentationContent, StudyAccordionNotesContent, StudyTimelineContent, QuizContent, GroupSortContent, AnagramContent, OpenTheBoxContent, GameElementBundle, FindTheMatchContent } from './types'
// Imagen cache deshabilitada: imports removidos
// Imágenes deshabilitadas: no se agregan imágenes generadas ni contextuales en recursos
import { decideMatchUpUsage } from '../config/elementUsage.local'
import { decideStudyElements } from '../config/studyElements.local'

// Genera un prompt INTEGRADO: primero una línea de tiempo con información extensa ordenada por fecha,
// y a partir de ese mismo contenido, actividades MatchUp (líneas e imágenes).
const buildIntegratedPrompt = (formData: ResourceFormData, userAge: number): string => {
  // Sujetos opcionales: usar textos genéricos si se omiten para acelerar generación
  const subjectText = (formData.subject || 'General')
  const topicText = (formData.topic || 'Libre')
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
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "linesMode": { "pairs": [ { "left": "...", "right": "..." } ] },
    "imagesMode": { "items": [ { "term": "...", "imageDescription": "FOTOGRAFÍA REAL ..." } ] }
  },
  "findTheMatch": {
    "templateType": "find_the_match",
    "title": "<título descriptivo>",
    "instructions": "<instrucciones breves: leer concepto, presionar afirmación correcta>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "pairs": [ { "concept": "...", "affirmation": "..." } ]
  },
  "openTheBox": {
    "templateType": "open_the_box",
    "title": "<título descriptivo de la actividad>",
    "instructions": "<instrucciones breves para abrir cajas y responder>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "items": [
      { "question": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..." }
    ]
  },
  "anagram": {
    "templateType": "anagram",
    "title": "<título descriptivo de la actividad>",
    "instructions": "<instrucciones para resolver anagramas>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "items": [
      { "clue": "<pista opcional>", "answer": "<palabra o frase>", "scrambled": "<letras desordenadas>" }
    ]
  },
  "quiz": {
    "templateType": "quiz",
    "title": "<título descriptivo del quiz>",
    "instructions": "<instrucciones breves para el quiz>",
    "subject": "${subjectText}",
    "topic": "${topicText}",
    "difficulty": "Básico|Intermedio|Avanzado",
    "questions": [
      { "prompt": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..." }
    ]
  },
  "groupSort": {
    "templateType": "group_sort",
    "title": "<título descriptivo de la actividad>",
    "instructions": "<instrucciones para ordenar por grupo>",
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
      { "title": "<título del evento>", "description": "<descripción extensa y relevante>", "date": "<YYYY-MM-DD o YYYY>", "imageDescription": "<describir FOTOGRAFÍA REAL>" }
    ]
  }
}

Requisitos:
- Línea de tiempo: genera eventos sin mínimo obligatorio y con un MÁXIMO de 10. Cada evento debe tener fecha visible si es posible y una descripción amplia (contexto, causa, consecuencia, relevancia). Ordena de menor a mayor. Si el tema requiere menos eventos, incluye solo los necesarios; si requiere más, limita a los 10 más representativos.
- MatchUp (líneas): 6 a 10 pares derivados de los eventos y subtemas relevantes del mismo ${subjectText}/${topicText}. Las definiciones deben ser claras para ${userAge} años. Incluye al final: "Ejemplo: ..." (sin revelar directamente el término del lado izquierdo).
- MatchUp (imágenes): EXACTAMENTE 4 ítems con descripciones para FOTOGRAFÍAS REALES, visualmente distintas; especifica el contexto si ayuda (p. ej., fondo blanco, mesa de madera, laboratorio).
- Quiz: Genera EXACTAMENTE 6 preguntas, cada una con EXACTAMENTE 4 opciones (1 correcta y 3 distractores plausibles). Varía la posición de la respuesta correcta. Incluye una justificación por pregunta con información precisa, completa y real (2–4 frases), suficiente para que el usuario entienda claramente el porqué de la respuesta.
- Group Sort: Define de 2 a 4 grupos con nombres claros y HASTA 12 ítems totales (sin mínimo). Evita redundancias: NINGÚN ítem debe contener como subcadena el nombre del grupo ni sus sinónimos. Usa nombres de grupo conceptuales (p. ej., "Conflictos regionales" en lugar de "Guerras") para no revelar respuestas. Los ítems deben pertenecer inequívocamente a un grupo.
 - Group Sort: Define de 2 a 4 grupos con nombres claros y HASTA 12 ítems totales (sin mínimo). Evita redundancias: NINGÚN ítem debe contener como subcadena el nombre del grupo ni sus sinónimos. Usa nombres de grupo conceptuales (p. ej., "Conflictos regionales" en lugar de "Guerras") para no revelar respuestas. Los ítems deben pertenecer inequívocamente a un grupo.
- Anagram: Genera de 3 a 6 ítems. Cada ítem debe tener "answer" (palabra o frase corta) y "scrambled" con EXACTAMENTE las mismas letras desordenadas (sin añadir ni quitar). Si el answer tiene espacios, el scrambled puede omitirlos. Evita respuestas triviales y ofrece pistas ("clue") solo si ayudan a contextualizar el tema.
- Open the Box (Abrecajas): Genera EXACTAMENTE 6 cajas. Cada caja contiene una pregunta de opción múltiple con EXACTAMENTE 4 opciones (1 correcta y 3 distractores plausibles). Varía la posición de la respuesta correcta y evita que las cajas o su título revelen la respuesta. Incluye explicación educativa breve por pregunta.
- Find the Match (Cada oveja con su pareja): Genera EXACTAMENTE 6 pares. Cada par contiene {concept, affirmation}. Los conceptos deben ser del tema ${subjectText}/${topicText} y las afirmaciones deben ser precisas y breves. Evita ambigüedades: cada concepto debe corresponder inequívocamente a UNA afirmación. Las afirmaciones no deben revelar la respuesta de forma trivial.
 - Course Presentation: entre 6 y 12 diapositivas. Cada diapositiva debe contener una explicación más extensa, precisa y verificable (6–10 oraciones o puntos clave), basada en información real y actualizada. Al final de cada texto, incluye "Fuentes:" seguido de 1–3 URLs confiables (p. ej., artículos y páginas oficiales, Wikipedia/Wikimedia/Wikidata, organismos internacionales, universidades). Evita opinión; usa datos verificables. El apoyo visual debe ser pertinente al tema.
- Adapta la dificultad al objetivo: ${learningGoal}.
- Responde SOLO con el JSON (sin Markdown ni explicaciones).`
}

// Asegura que Open the Box tenga al menos 6 cajas
const ensureMinOpenBoxItems = (otb: OpenTheBoxContent): OpenTheBoxContent => {
  const items = Array.isArray(otb.items) ? otb.items : []
  if (items.length >= 6) return otb
  if (items.length === 0) return otb // si no hay ítems válidos, no forzar placeholders aquí
  const padded = [...items]
  for (let i = 0; padded.length < 6; i++) {
    const src = items[i % items.length]
    // Copia superficial para evitar referencias compartidas
    padded.push({ ...src })
  }
  return { ...otb, items: padded }
}

// Normaliza Find the Match para que tenga EXACTAMENTE 6 pares ÚNICOS (concept y affirmation únicos).
// - Elimina duplicados por concepto y por affirmation.
// - Si hay más de 6, recorta a 6.
// - Si hay menos de 6, NO rellena con duplicados (se intentará una segunda solicitud para completar).
const ensureExactlySixUniqueFindTheMatchPairs = (ftm: FindTheMatchContent): FindTheMatchContent => {
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
    if (unique.length === 6) break
  }
  return { ...ftm, pairs: unique.slice(0, 6) }
}

// DEPRECATED: generación integrada (timeline + múltiples juegos). Mantener solo para compatibilidad.
// No agrega imágenes ni campos relacionados a imágenes.
export async function generateMatchUpResource(formData: ResourceFormData): Promise<GeneratedResource> {
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
//tngtech/deepseek-r1t2-chimera:free
//moonshotai/kimi-k2:free
//openai/gpt-4o-mini
//google/gemini-2.0-flash-exp:free
//qwen/qwen3-coder:free
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

  // Deshabilitar por completo el modo de imágenes para MatchUp
  if (parsed.imagesMode) {
    delete parsed.imagesMode
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
  summary: `Actividad “Unir parejas” (líneas) sobre ${formData.topic} en ${formData.subject}`,
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
      const ensured = ensureMinOpenBoxItems(otbBlock as OpenTheBoxContent)
      generated.openTheBox = ensured
      generated.gameelement = { ...(generated.gameelement || {}), openTheBox: ensured }
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

    // Fondo o imágenes deshabilitados: no se generan ni se adjuntan

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
      // Ya no usamos imagen de fondo en Course Presentation
      const cp: StudyCoursePresentationContent = { slides }
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

        // Construir eventos sin imágenes
        let events = sourceEvents.map((e) => ({ title: e.title, description: e.description, date: (e as any).date }))
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
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) throw new Error('Falta VITE_OPENROUTER_API_KEY en .env')

  // Edad del usuario no utilizada en esta generación: omitir cálculo

  const subjectText = (formData.subject || 'General')
  const topicText = (formData.topic || 'Libre')
  const learningGoal = formData.learningGoal || 'Aprendizaje general'

  // Construye dinámicamente la estructura y los requisitos según los checkboxes marcados
  const wantTimeline = selectedLearningKeys.includes('timeline')
  const wantCourse = selectedLearningKeys.includes('course_presentation')
  const wantAccordion = selectedLearningKeys.includes('accordion_notes')

  const structureParts: string[] = []
  if (wantTimeline) {
    structureParts.push(`"timeline": { "events": [ { "title": "...", "description": "Descripción rigurosa con contexto, causas y consecuencias (6–10 frases).", "date": "YYYY o YYYY-MM-DD" } ] }`)
  }
  if (wantCourse) {
    structureParts.push(`"course_presentation": { "slides": [ { "title": "...", "text": "Explicación extensa, precisa y verificable (6–10 frases o viñetas). Debe incluir definiciones, ejemplos, datos y relaciones clave. Al final, añade: \"Fuentes:\" seguido de 1–3 URLs confiables (organismos, universidades, Wikipedia/Wikimedia/Wikidata, páginas oficiales)." } ] }`)
  }
  if (wantAccordion) {
    structureParts.push(`"accordion_notes": { "sections": [ { "title": "...", "body": "Síntesis estructurada y clara del subtema (6–10 frases o viñetas). Evita vaguedades y relleno; incluye conceptos, ejemplos y conexiones. No repetir contenido exacto de las diapositivas; complementar." } ] }`)
  }

  const structureJson = `{
  ${structureParts.join(',\n  ')}
}`

  const requirements: string[] = []
  if (wantCourse) requirements.push('- Presentación (course_presentation): entre 6 y 12 diapositivas. Cada diapositiva con contenido extenso y verificable (6–10 frases o puntos) y cierre con "Fuentes:" + 1–3 URLs reales y relevantes.')
  if (wantAccordion) requirements.push('- Notas en acordeón (accordion_notes): entre 4 y 8 secciones. Cada sección con contenido sustantivo (6–10 frases o viñetas) que complemente a las diapositivas.')
  if (wantTimeline) requirements.push('- Línea de tiempo (timeline): entre 6 y 10 eventos. Ordenados de menor a mayor fecha. Cada evento con fecha y descripción rigurosa (causas, consecuencias, relevancia).')
  requirements.push(`- Tema de referencia: ${subjectText}/${topicText}. Adapta la dificultad al objetivo: ${learningGoal}.`)
  requirements.push('- No incluyas claves para elementos NO solicitados.')
  requirements.push('- No incluyas campos relacionados con imágenes (imageUrl, imageDescription, background_image_url) ni URLs de imágenes.')
  requirements.push('- Responde ÚNICAMENTE con el JSON, sin texto adicional ni Markdown.')

  const prompt = `Genera SOLO JSON válido en español con ELEMENTOS DE APRENDIZAJE completos y profesionales, únicamente los elementos solicitados:
${structureJson}
Requisitos estrictos:\n${requirements.join('\n')}`

  const body = {
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Responde SOLO con JSON válido. Sin texto fuera del JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  }

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body)
  })
  if (!resp.ok) throw new Error('Error al generar elementos de aprendizaje en OpenRouter')

  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content || ''
  const match = content.match(/\{[\s\S]*\}/)
  const jsonText = match ? match[0] : content
  const parsed: any = JSON.parse(jsonText)

  const generated: GeneratedResource = {
    title: `${subjectText}: ${topicText}`,
    summary: `Elementos de aprendizaje sobre ${topicText} en ${subjectText}`,
    difficulty: 'Intermedio',
    studyElements: []
  }

  // Construcción de elementos de estudio (solo los seleccionados)
  try {
    const elements: StudyElement[] = []
    const cp = parsed?.course_presentation?.slides
    if (wantCourse && Array.isArray(cp) && cp.length > 0) {
      elements.push({ type: 'course_presentation', content: { slides: cp } as StudyCoursePresentationContent })
    }
    const acc = parsed?.accordion_notes?.sections
    if (wantAccordion && Array.isArray(acc) && acc.length > 0) {
      elements.push({ type: 'accordion_notes', content: { sections: acc } as StudyAccordionNotesContent })
    }
  const tl = parsed?.timeline?.events
    if (wantTimeline && Array.isArray(tl) && tl.length > 0) {
      // Adjuntar eventos sin imágenes
      elements.push({ type: 'timeline', content: { events: tl } as StudyTimelineContent })
    }
    generated.studyElements = elements
  } catch (e) {
    console.warn('Error construyendo elementos de estudio (solo):', e)
  }

  return generated
}

// Generación SOLO de elementos de juego, retorna bundle para combinar con recurso existente
export async function generateGameElementsOnly(formData: ResourceFormData, selectedGameKeys: string[]): Promise<GameElementBundle> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) throw new Error('Falta VITE_OPENROUTER_API_KEY en .env')

  const subjectText = (formData.subject || 'General')
  const topicText = (formData.topic || 'Libre')
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

    const subPrompt = `Genera SOLO JSON válido en español con TODOS los ELEMENTOS DE JUEGO SOLICITADOS para el tema ${subjectText}/${topicText}:
${struct}
Requisitos estrictos:
- Cada elemento debe aportar aprendizaje real (evitar trivialidades y redundancias).
- Genera entre 6 y 12 ítems por elemento solicitado.
- Las explicaciones deben ser breves, claras y correctas; usar terminología apropiada.
- No incluyas claves para elementos NO solicitados.
- No incluyas campos de imágenes (imageUrl, imageDescription, background_image_url) ni URLs de imágenes.
- Para findTheMatch: EXACTAMENTE 6 pares. No repitas conceptos ni afirmaciones; cada afirmación debe ser única.
- Debes INCLUIR TODAS las llaves presentes en la estructura anterior. No omitas ninguna.
- Para cada bloque, agrega el campo templateType con exactamente estos valores:
  - matchUp.templateType = "match_up"
  - quiz.templateType = "quiz"
  - groupSort.templateType = "group_sort"
  - anagram.templateType = "anagram"
  - openTheBox.templateType = "open_the_box"
  - findTheMatch.templateType = "find_the_match"
- Responde ÚNICAMENTE con el JSON, sin texto adicional ni Markdown.`

    const body = {
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Responde SOLO con JSON válido. Sin texto fuera del JSON.' },
        { role: 'user', content: subPrompt },
      ],
      temperature: 0.7,
    }

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body)
    })
    if (!resp.ok) throw new Error('Error al generar elementos de juego en OpenRouter')

    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content || ''
    const match = content.match(/\{[\s\S]*\}/)
    const jsonText = match ? match[0] : content
    return JSON.parse(jsonText)
  }

  // Primera solicitud para todas las llaves seleccionadas
  const parsed1 = await requestParsed(selectedGameKeys)

  let bundle: GameElementBundle = {}

  // Función de fusión relajada: acepta bloques aunque falte templateType si la forma es válida
  const acceptBlocks = (parsed: any) => {
    if (selectedGameKeys.includes('match_up')) {
      const mu = parsed?.matchUp
      const valid = mu?.linesMode?.pairs && mu.linesMode.pairs.length > 0
      if (valid) bundle.matchUp = { templateType: 'match_up', title: mu.title || 'Unir parejas', linesMode: mu.linesMode } as MatchUpContent
    }
    if (selectedGameKeys.includes('quiz')) {
      const qz = parsed?.quiz
      const valid = Array.isArray(qz?.questions) && qz.questions.length > 0
      if (valid) bundle.quiz = { ...(qz as QuizContent), templateType: 'quiz' }
    }
    if (selectedGameKeys.includes('group_sort')) {
      const gs = parsed?.groupSort
      const valid = Array.isArray(gs?.groups) && gs.groups.length > 0
      if (valid) bundle.groupSort = { ...(gs as GroupSortContent), templateType: 'group_sort' }
    }
    if (selectedGameKeys.includes('anagram')) {
      const ag = parsed?.anagram
      const valid = Array.isArray(ag?.items) && ag.items.length > 0
      if (valid) bundle.anagram = { ...(ag as AnagramContent), templateType: 'anagram' }
    }
    if (selectedGameKeys.includes('open_the_box')) {
      const otb = parsed?.openTheBox
      const valid = Array.isArray(otb?.items) && otb.items.length > 0
      if (valid) bundle.openTheBox = ensureMinOpenBoxItems({ ...(otb as OpenTheBoxContent), templateType: 'open_the_box' })
    }
    if (selectedGameKeys.includes('find_the_match')) {
      const ftm = parsed?.findTheMatch
      const valid = Array.isArray(ftm?.pairs) && ftm.pairs.length > 0
      if (valid) bundle.findTheMatch = ensureExactlySixUniqueFindTheMatchPairs({ ...(ftm as FindTheMatchContent), templateType: 'find_the_match' })
    }
  }

  acceptBlocks(parsed1)

  // Intento de completar pares únicos para Find the Match si quedaron menos de 6
  if (selectedGameKeys.includes('find_the_match') && bundle.findTheMatch) {
    const currentCount = Array.isArray(bundle.findTheMatch.pairs) ? bundle.findTheMatch.pairs.length : 0
    if (currentCount < 6) {
      try {
        const parsedExtra = await requestParsed(['find_the_match'])
        const ftm2 = parsedExtra?.findTheMatch
        if (Array.isArray(ftm2?.pairs) && ftm2.pairs.length > 0) {
          const merged = ensureExactlySixUniqueFindTheMatchPairs({
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
    bundle.findTheMatch = ensureExactlySixUniqueFindTheMatchPairs(bundle.findTheMatch)
  }

  return bundle
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