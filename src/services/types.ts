// Tipos compartidos entre servicios y componentes

export interface ResourceFormData {
  subject: string;
  topic: string;
  userBirthData?: {
    birth_day?: number | string;
    birth_month?: number | string;
    birth_year?: number | string;
  };
  learningGoal?: string;
}

export interface MatchUpPair {
  left: string;   // término/pregunta
  right: string;  // definición/respuesta
}

export interface MatchUpImagesItem {
  term: string;               // término que se debe arrastrar
  imageDescription: string;   // descripción de la imagen a generar
  imageUrl?: string;          // URL de imagen generada (pollinations)
}

export interface MatchUpLinesContent {
  pairs: MatchUpPair[];
}

export interface MatchUpImagesContent {
  items: MatchUpImagesItem[];
}

export interface MatchUpContent {
  templateType: 'match_up';
  title: string;
  instructions_lines: string;   // instrucciones para el modo líneas
  instructions_images: string;  // instrucciones para el modo imágenes
  subject: string;
  topic: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  linesMode: MatchUpLinesContent;   // Primer match up: conectar con líneas
  imagesMode?: MatchUpImagesContent; // Segundo match up: arrastrar términos a imágenes (opcional)
}

// Elementos de estudio previos a gamificación (máx. 2)
export type StudyElementType = 'course_presentation' | 'accordion_notes' | 'timeline'

export interface StudyCoursePresentationContent {
  backgroundImageUrl?: string; // Imagen de fondo única (Wikimedia preferentemente)
  slides: Array<{
    title: string;
    text: string;
  }>
}

export interface StudyAccordionNotesContent {
  sections: Array<{
    title: string;
    body: string;
  }>
}

export interface StudyTimelineEvent {
  title: string;
  description: string;
  date?: string;
  imageUrl?: string;
}

export interface StudyTimelineContent {
  events: StudyTimelineEvent[];
  // Imagen referencial única del tema a mostrar al final de la línea de tiempo
  topicImageUrl?: string;
}

export type StudyElement =
  | { type: 'course_presentation'; content: StudyCoursePresentationContent }
  | { type: 'accordion_notes'; content: StudyAccordionNotesContent }
  | { type: 'timeline'; content: StudyTimelineContent }

export interface GeneratedResource {
  title: string;
  summary?: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  // Contenido específico del recurso
  // Preferir gameelement para simetría en nombres solicitada; mantener gameElements/matchUp por compatibilidad
  gameelement?: MatchUpContent;
  gameElements?: MatchUpContent;
  matchUp?: MatchUpContent;
  studyElements?: StudyElement[]; // Plantillas de estudio para mostrar en el Dashboard antes de los MatchUps
}