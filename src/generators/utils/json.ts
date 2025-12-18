export const findJsonBlock = (s: string): string | null => {
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

export const safeParseJson = (raw: string): unknown => {
  let s = (raw || '').trim()
  s = s.replace(/^```[a-zA-Z]*\s*/,'').replace(/```$/,'')
  const block = findJsonBlock(s) ?? s

  const tryParse = (t: string) => JSON.parse(t)

  try {
    return tryParse(block)
  } catch (e1) {
    try {
      const t1 = block
        .replace(/,\s*(\]|\})/g, '$1') // comas finales
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
      return tryParse(t1)
    } catch (e2) {
      try {
        const t2 = block
          .replace(/\\"/g, '"')
          .replace(/\\\//g, '/')
          .replace(/\\n/g, ' ')
          .replace(/\\t/g, ' ')
        return tryParse(t2)
      } catch (e3) {
        console.error('❌ JSON inválido tras 3 intentos:', raw)
        return null
      }
    }
  }
}

