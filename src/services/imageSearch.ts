// Búsqueda de imágenes reales usando Wikimedia/Wikipedia.
// Estrategia:
// 1) Buscar por título exacto en EN Wikipedia.
// 2) Si no hay imagen, probar ES Wikipedia.
// 3) Si aún no hay, usar búsqueda (generator=search) para obtener la mejor coincidencia en EN.
export async function findRealImageUrl(term: string): Promise<string | null> {
  const getFromWikipediaByTitle = async (lang: 'en' | 'es', title: string) => {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=320&origin=*&titles=${encodeURIComponent(title)}`
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data = await resp.json()
    const pages = data?.query?.pages || {}
    const page = Object.values(pages)[0] as any
    const thumb = page?.thumbnail?.source
    const original = page?.original?.source
    return original || thumb || null
  }

  const getFromWikipediaBySearch = async (lang: 'en' | 'es', query: string) => {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=320`
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data = await resp.json()
    const pages = data?.query?.pages || {}
    const page = Object.values(pages)[0] as any
    const thumb = page?.thumbnail?.source
    const original = page?.original?.source
    return original || thumb || null
  }

  try {
    // Intento EN (título exacto)
    const enTitle = await getFromWikipediaByTitle('en', term)
    if (enTitle) return enTitle

    // Intento ES (título exacto)
    const esTitle = await getFromWikipediaByTitle('es', term)
    if (esTitle) return esTitle

    // Intento EN (búsqueda)
    const enSearch = await getFromWikipediaBySearch('en', term)
    if (enSearch) return enSearch

    // Intento ES (búsqueda)
    const esSearch = await getFromWikipediaBySearch('es', term)
    if (esSearch) return esSearch

    return null
  } catch (e) {
    console.warn('findRealImageUrl fallo, continuando con fallback:', e)
    return null
  }
}

// Búsqueda contextual con subject, topic y descripción
export async function findContextualImageUrl(params: { term: string; subject?: string; topic?: string; description?: string }): Promise<string | null> {
  const { term, subject, topic, description } = params

  const candidates: string[] = []
  // Orden sugerido: descripción, término+tema, término+materia, término
  if (description) candidates.push(description)
  if (term && topic) candidates.push(`${term} ${topic}`)
  if (term && subject) candidates.push(`${term} ${subject}`)
  if (term) candidates.push(term)

  // 0) Intento con Wikidata (P18) para cada candidato: suele dar la imagen principal del concepto
  const tryWikidata = async (q: string): Promise<string | null> => {
    try {
      // Buscar entidad
      const searchEs = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=es&origin=*&limit=1&search=${encodeURIComponent(q)}`)).json()
      const idEs = searchEs?.search?.[0]?.id
      const searchEn = idEs ? null : await (await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&limit=1&search=${encodeURIComponent(q)}`)).json()
      const id = idEs || searchEn?.search?.[0]?.id
      if (!id) return null
      // Obtener claims, buscar P18 (imagen)
      const entity = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&ids=${id}&props=claims`)).json()
      const claims = entity?.entities?.[id]?.claims
      const p18 = claims?.P18?.[0]?.mainsnak?.datavalue?.value
      if (!p18 || typeof p18 !== 'string') return null
      // Construir URL hacia Commons
      const fileName = p18
      const commonsUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=320`
      return commonsUrl
    } catch {
      return null
    }
  }

  // Para cada query, probamos primero título exacto (ES y EN), luego búsqueda (ES y EN)
  for (const q of candidates) {
    // Intentar búsqueda directa en Wikimedia Commons (archivos reales)
    const byCommons = await (async () => {
      try {
        const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=320`
        const resp = await fetch(url)
        if (!resp.ok) return null
        const data = await resp.json()
        const pages = data?.query?.pages || {}
        const page: any = Object.values(pages)[0]
        const info = page?.imageinfo?.[0]
        const imageUrl = info?.thumburl || info?.url
        return imageUrl || null
      } catch { return null }
    })()
    if (byCommons) return byCommons

    const byWikidata = await tryWikidata(q)
    if (byWikidata) return byWikidata

    const byTitleEs = await (async () => {
      try { return await (await fetch(`https://es.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=320&origin=*&titles=${encodeURIComponent(q)}`)).json() } catch { return null }
    })()
    if (byTitleEs) {
      const page = Object.values(byTitleEs?.query?.pages || {})[0] as any
      const url = page?.original?.source || page?.thumbnail?.source
      if (url) return url
    }

    const byTitleEn = await (async () => {
      try { return await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=320&origin=*&titles=${encodeURIComponent(q)}`)).json() } catch { return null }
    })()
    if (byTitleEn) {
      const page = Object.values(byTitleEn?.query?.pages || {})[0] as any
      const url = page?.original?.source || page?.thumbnail?.source
      if (url) return url
    }

    const bySearchEs = await (async () => {
      try { return await (await fetch(`https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=320`)).json() } catch { return null }
    })()
    if (bySearchEs) {
      const page = Object.values(bySearchEs?.query?.pages || {})[0] as any
      const url = page?.original?.source || page?.thumbnail?.source
      if (url) return url
    }

    const bySearchEn = await (async () => {
      try { return await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=320`)).json() } catch { return null }
    })()
    if (bySearchEn) {
      const page = Object.values(bySearchEn?.query?.pages || {})[0] as any
      const url = page?.original?.source || page?.thumbnail?.source
      if (url) return url
    }
  }

  return null
}