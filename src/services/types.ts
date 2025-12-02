// Tipos compartidos entre servicios y componentes

export interface ResourceFormData {
  subject: string;
  topic: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  userBirthData?: {
    birth_day?: number | string;
    birth_month?: number | string;
    birth_year?: number | string;
  };
  academicLevel?: string;
}

export interface MatchUpPair {
  left: string;   // término/pregunta
  right: string;  // definición/respuesta
}

export interface MatchUpLinesContent {
  pairs: MatchUpPair[];
}

export interface MatchUpContent {
  templateType: 'match_up';
  title: string;
  instructions_lines: string;   // instrucciones para el modo líneas
  subject: string;
  topic: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  linesMode: MatchUpLinesContent;   // Primer match up: conectar con líneas
}

// Nuevo: Cuestionario (Wordwall: Quiz)
export interface QuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number; // índice de la opción correcta
  explanation?: string; // explicación educativa
}

export interface QuizContent {
  templateType: 'quiz';
  title: string;
  instructions: string;
  subject: string;
  topic: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  questions: QuizQuestion[];
}

// Nuevo: Ordenar por grupo (Wordwall: Group Sort)
export interface GroupSortGroup {
  name: string;
  items: string[]; // ítems que pertenecen a este grupo
}

export interface GroupSortContent {
  templateType: 'group_sort';
  title: string;
  instructions: string;
  subject: string;
  topic: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  groups: GroupSortGroup[];
  // Opcional: una palabra "paraguas" que abarca varios cuadros (ítems)
  umbrellaWord?: string;
  umbrellaCoversItems?: string[]; // ítems a los que aplica la palabra paraguas
}

// Nuevo: Anagrama (Wordwall: Anagram)
export interface AnagramItem {
  clue?: string;       // pista opcional
  answer: string;      // respuesta correcta (palabra/frase)
  scrambled: string;   // versión desordenada para mostrar
}

export interface AnagramContent {
  templateType: 'anagram';
  title: string;
  instructions: string;
  subject: string;
  topic: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  items: AnagramItem[];
}

// Nuevo: Abrecajas (Wordwall: Open the Box)
export interface OpenTheBoxItem {
  question: string;        // pregunta a mostrar cuando se abre la caja
  options: string[];       // opciones múltiples
  correctIndex: number;    // índice de la opción correcta
  explanation?: string;    // explicación educativa opcional
}

export interface OpenTheBoxContent {
  templateType: 'open_the_box';
  title: string;
  instructions: string;
  subject: string;
  topic: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  items: OpenTheBoxItem[]; // cada ítem corresponde a una caja
}

// Nuevo: Cada oveja con su pareja (Wordwall: Find the Match)
export interface FindTheMatchPair {
  concept: string;       // concepto que rota
  affirmation: string;   // afirmación correcta para ese concepto
}

export interface FindTheMatchContent {
  templateType: 'find_the_match';
  title: string;
  instructions: string;
  subject: string;
  topic: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  pairs: FindTheMatchPair[]; // Deben ser exactamente 6 pares
  // Opcional: velocidades de rotación por concepto (ms), longitud igual a pairs.length
  speedsMs?: number[];
}

// Elementos de estudio previos a gamificación (máx. 2)
export type StudyElementType = 'course_presentation' | 'accordion_notes' | 'timeline' | 'mnemonic_creator'

export interface StudyCoursePresentationContent {
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
}

export interface StudyTimelineContent {
  events: StudyTimelineEvent[];
}

// Nuevo: Nemotecnia (creación de mnemotecnia por el alumno con opción de generación automática)
export interface StudyMnemonicItem {
  prompt: string;   // concepto/pregunta
  answer: string;   // definición/respuesta
}

export interface StudyMnemonicContent {
  title?: string;
  instructions?: string;
  exampleText?: string; // breve ejemplo de qué es una mnemotecnia
  items: StudyMnemonicItem[]; // idealmente 4 items
  subject?: string;
  topic?: string;
}

export type StudyElement =
  | { type: 'course_presentation'; content: StudyCoursePresentationContent }
  | { type: 'accordion_notes'; content: StudyAccordionNotesContent }
  | { type: 'timeline'; content: StudyTimelineContent }
  | { type: 'mnemonic_creator'; content: StudyMnemonicContent }

// Nuevo: paquete de elementos de juego para logs y consistencia
export interface GameElementBundle {
  matchUp?: MatchUpContent;
  quiz?: QuizContent;
  groupSort?: GroupSortContent;
  anagram?: AnagramContent;
  openTheBox?: OpenTheBoxContent;
  findTheMatch?: FindTheMatchContent;
}

export interface GeneratedResource {
  title: string;
  summary?: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  // Contenido específico del recurso
  // Preferir gameelement para simetría en nombres solicitada; mantener propiedades por compatibilidad
  gameelement?: GameElementBundle;
  gameElements?: MatchUpContent;
  matchUp?: MatchUpContent;
  // Nuevos elementos de juego
  quiz?: QuizContent;
  groupSort?: GroupSortContent;
  anagram?: AnagramContent;
  openTheBox?: OpenTheBoxContent;
  findTheMatch?: FindTheMatchContent;
  studyElements?: StudyElement[]; // Plantillas de estudio para mostrar en el Dashboard antes de los MatchUps
}

// Nuevo: Debates (elemento final, sin puntaje)
export interface DebateContent {
  templateType: 'debate'
  title: string
  subject: string
  topic: string
  instructions?: string
  initialQuestion?: string
}
