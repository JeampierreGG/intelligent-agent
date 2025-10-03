// Stub de servicio para compatibilidad con hooks que referencian '../services/questionnaire-simple'
// Ajusta las funciones/exports según lo que necesite el hook useNavigateWithQuestionnaire

export type Questionnaire = {
  id?: string;
  title?: string;
  questions?: Array<{
    prompt: string;
    options: string[];
    correctIndex?: number;
  }>;
};

export function createQuestionnaire(_: Partial<Questionnaire> = {}): Questionnaire {
  return { title: 'Cuestionario', questions: [] };
}

export function getQuestionnaireById(_: string): Questionnaire | null {
  return null;
}

export function navigateToQuestionnaire(_: Questionnaire): void {
  // No-op: navegación deshabilitada/pendiente de implementación
}

export default {
  createQuestionnaire,
  getQuestionnaireById,
  navigateToQuestionnaire,
};