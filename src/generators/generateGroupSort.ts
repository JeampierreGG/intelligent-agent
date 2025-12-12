import type { ResourceFormData, GroupSortContent } from '../services/types'
import { callOpenRouter } from './utils/openrouter'
import { safeParseJson } from './utils/json'

const normalizeTwoGroups = (gs: GroupSortContent): GroupSortContent => {
  const src = Array.isArray(gs.groups) ? gs.groups.slice(0, 2) : []
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
  return { ...gs, groups: out }
}

export async function generateGroupSort(formData: ResourceFormData): Promise<GroupSortContent | null> {
  const subject = formData.subject || 'General'
  const topic = formData.topic || 'Libre'
  const difficulty = formData.difficulty || 'Intermedio'
  const struct = `{
  "groupSort": { "templateType": "group_sort", "title": "...", "groups": [ { "name": "Categoría 1 relacionada a ${topic}", "items": ["x","y"] }, { "name": "Categoría 2 relacionada a ${topic}", "items": ["z"] } ] }
}`
  const prompt = `Genera SOLO JSON válido en español para ${subject} - ${topic}.
${struct}
Reglas:
- 2 grupos y hasta 6 ítems en total.
- Los NOMBRES de los grupos deben ser DESCRIPTIVOS y relacionados con el tema (evita "A", "B", "Grupo 1", "Grupo 2").
- Ejemplos de buen nombre (adaptar al tema): "Números naturales", "Números enteros"; "Estructuras lineales", "Estructuras no lineales".
- Ajusta la dificultad: ${difficulty}.
- Prohibido mencionar JSON, RFC8259, formato, JavaScript, comillas, arrays, claves, sintaxis.`
  const raw = await callOpenRouter(prompt, 0.5, 3)
  const parsed = safeParseJson(raw) as unknown
  const gs = (typeof parsed === 'object' && parsed !== null) ? ((parsed as Record<string, unknown>).groupSort as GroupSortContent | undefined) : undefined
  if (gs && Array.isArray(gs.groups) && gs.groups.length > 0) {
    const norm = normalizeTwoGroups({ ...gs, templateType: 'group_sort', difficulty })
    return norm
  }
  return null
}
