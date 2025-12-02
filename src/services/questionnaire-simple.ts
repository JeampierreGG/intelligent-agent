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

export function createQuestionnaire(params: Partial<Questionnaire> = {}): Questionnaire {
  void params;
  return { title: 'Cuestionario', questions: [] };
}

export function getQuestionnaireById(id: string): Questionnaire | null {
  void id;
  return null;
}

export function navigateToQuestionnaire(q: Questionnaire): void {
  void q;
}

export default {
  createQuestionnaire,
  getQuestionnaireById,
  navigateToQuestionnaire,
};
