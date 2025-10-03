// Política local para elegir plantillas de estudio previas a los MatchUps.
// Este archivo forma parte del proyecto para definir reglas de uso por Materia/Curso y tema.

import type { ResourceFormData } from '../services/types'

export type StudyElementType =
  | 'course_presentation'      // Presentación tipo diapositivas: texto + imágenes
  | 'accordion_notes'          // Notas en acordeón: definiciones, ejemplos breves
  | 'timeline'                 // Línea de tiempo (Historia, evolución de temas)
  | 'image_hotspots'           // Imagen con hotspots (geografía, biología, arte)
  | 'image_gallery'            // Galería de imágenes con descripción
  | 'interactive_video'        // Video con pausas y notas (ciencias, procedimientos)
  | 'text_highlight'           // Resaltado de partes del texto (lengua: partes de la oración)

export interface StudyElementDecision {
  type: StudyElementType
  reason: string
  prefersWikimedia?: boolean
  prefersPollinations?: boolean
  maxUnits?: number // p. ej., máximo de diapositivas o hotspots
}

export function decideStudyElements(formData: ResourceFormData): StudyElementDecision[] {
  const subject = (formData.subject || '').toLowerCase()
  const topic = (formData.topic || '').toLowerCase()

  const decisions: StudyElementDecision[] = []

  const isHistory = subject.includes('historia') || subject.includes('history') || topic.includes('historia') || topic.includes('history')
  const isGeography = subject.includes('geograf') || topic.includes('mapa') || topic.includes('map')
  const isBiology = subject.includes('biolog') || topic.includes('anatom') || topic.includes('órgano') || topic.includes('organ')
  const isMath = subject.includes('matem') || subject.includes('math')
  const isLanguage = subject.includes('lengua') || subject.includes('language') || subject.includes('comunicación')
  const isLab = topic.includes('laboratorio') || topic.includes('experimento') || topic.includes('instrumento')
  const isArt = subject.includes('arte') || topic.includes('pintura') || topic.includes('escultura') || topic.includes('música')

  // Historia: contenido lineal + evidencia visual
  if (isHistory) {
    decisions.push({ type: 'timeline', reason: 'Estudiar eventos/biografías/evoluciones en orden cronológico.', prefersWikimedia: true })
    decisions.push({ type: 'course_presentation', reason: 'Resumen en diapositivas con imágenes reales para cada hito.', prefersWikimedia: true, maxUnits: 12 })
    decisions.push({ type: 'image_gallery', reason: 'Refuerzo visual de artefactos/personajes/escenas históricas.', prefersWikimedia: true, maxUnits: 6 })
  }

  // Geografía: mapas y puntos de interés
  if (isGeography) {
    decisions.push({ type: 'image_hotspots', reason: 'Mapa con hotspots para ubicar regiones/accidentes geográficos.', prefersWikimedia: true, maxUnits: 6 })
    decisions.push({ type: 'course_presentation', reason: 'Diapositivas con fotos reales y breves explicaciones.', prefersWikimedia: true, maxUnits: 12 })
  }

  // Biología/Anatomía: diagramas y partes
  if (isBiology) {
    decisions.push({ type: 'image_hotspots', reason: 'Identificar partes/estructuras sobre una imagen clara.', prefersPollinations: true, maxUnits: 6 })
    decisions.push({ type: 'course_presentation', reason: 'Definiciones y funciones con imágenes representativas.', prefersWikimedia: true, maxUnits: 12 })
    decisions.push({ type: 'image_gallery', reason: 'Varias especies/órganos para comparación visual.', prefersWikimedia: true, maxUnits: 6 })
  }

  // Matemáticas: conceptos y ejemplos paso a paso (prefiere texto + fórmulas)
  if (isMath) {
    decisions.push({ type: 'course_presentation', reason: 'Explicar conceptos con ejemplos numéricos simples.', maxUnits: 12 })
    decisions.push({ type: 'accordion_notes', reason: 'Formulas y propiedades organizadas por secciones.', maxUnits: 6 })
  }

  // Lengua/Idioma
  if (isLanguage) {
    decisions.push({ type: 'course_presentation', reason: 'Reglas y ejemplos de gramática con oraciones completas.', maxUnits: 12 })
    decisions.push({ type: 'text_highlight', reason: 'Resaltar partes del texto (sujeto, verbo, predicado).', maxUnits: 6 })
    // Vocabulario específico puede preferir imágenes, pero para estudio previo mantenemos texto + ejemplos.
  }

  // Laboratorio (Ciencias)
  if (isLab) {
    decisions.push({ type: 'interactive_video', reason: 'Demostrar procedimientos con pausas y notas.', maxUnits: 1 })
    decisions.push({ type: 'image_hotspots', reason: 'Identificación de equipos/partes sobre imagen.', prefersWikimedia: true, maxUnits: 6 })
    decisions.push({ type: 'course_presentation', reason: 'Resumen del tema en diapositivas con ejemplos.', maxUnits: 12 })
  }

  // Arte
  if (isArt) {
    decisions.push({ type: 'image_gallery', reason: 'Obras y estilos para contraste visual.', prefersWikimedia: true, maxUnits: 6 })
    decisions.push({ type: 'course_presentation', reason: 'Contexto y características de movimientos artísticos.', prefersWikimedia: true, maxUnits: 12 })
  }

  // Si no se detecta caso específico, usar presentación simple + notas
  if (decisions.length === 0) {
    decisions.push({ type: 'course_presentation', reason: 'Resumen del tema en diapositivas con ejemplos.', maxUnits: 12 })
    decisions.push({ type: 'accordion_notes', reason: 'Definiciones clave organizadas para estudio.', maxUnits: 6 })
  }

  return decisions
}