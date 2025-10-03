import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuración de la API de Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_GEMINI_API_KEY);

// Interfaces para los datos
export interface ResourceFormData {
  subject: string;
  topic: string;
  userBirthData: {
    birth_day?: number;
    birth_month?: number;
    birth_year?: number;
  };
  learningGoal?: string;
}

// Interfaces para contenido H5P
export interface H5PQuestion {
  question: string;
  answers: string[];
  correct: number[];
  feedback?: {
    correct?: string;
    incorrect?: string;
  };
}

export interface H5PContent {
  library: string;
  title: string;
  params: any;
  metadata: {
    title: string;
    license: string;
    licenseVersion: string;
    yearFrom?: string;
    yearTo?: string;
    source?: string;
    authors?: Array<{
      name: string;
      role: string;
    }>;
    authorComments?: string;
    contentType: string;
    defaultLanguage: string;
  };
  dependencies?: string[];
}

export interface GeneratedResource {
  title: string;
  content: string;
  h5pContent: H5PContent;
  summary?: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado';
  selectedGames?: string[];
}

// Mapeo de tipos de juego a librerías H5P con versiones
const gameTypeToH5PLibrary: Record<string, string> = {
  'Cuestionarios interactivos': 'H5P.QuestionSet 1.20',
  'Arrastrar y soltar': 'H5P.DragQuestion 1.14',
  'Juegos de memoria': 'H5P.MemoryGame 1.3',
  'Líneas de tiempo interactivas': 'H5P.Timeline 1.1',
  'Videos interactivos': 'H5P.InteractiveVideo 1.27',
  'Completar espacios en blanco': 'H5P.Blanks 1.14'
};

// Función para generar el prompt basado en los datos del usuario y del formulario
export const generateH5PPrompt = (subject: string, topic: string, userAge: number, learningGoal: string): string => {
  return `
Genera contenido educativo para múltiples preguntas sobre el tema "${topic}" de la materia "${subject}".

Usuario: ${userAge} años, objetivo: ${learningGoal}

Debes generar EXACTAMENTE este formato JSON con MÚLTIPLES preguntas:

{
  "titulo": "TÍTULO_DESCRIPTIVO_DEL_TEMA",
  "descripcion": "DESCRIPCIÓN_BREVE_DEL_CONTENIDO",
  "preguntas": [
    {
      "question": "PRIMERA_PREGUNTA_EDUCATIVA",
      "options": [
        "RESPUESTA_CORRECTA",
        "RESPUESTA_INCORRECTA_1", 
        "RESPUESTA_INCORRECTA_2",
        "RESPUESTA_INCORRECTA_3"
      ],
      "correct": 0,
      "explanation": "EXPLICACIÓN_DE_POR_QUÉ_ES_CORRECTA"
    },
    {
      "question": "SEGUNDA_PREGUNTA_EDUCATIVA",
      "options": [
        "RESPUESTA_INCORRECTA_1",
        "RESPUESTA_CORRECTA",
        "RESPUESTA_INCORRECTA_2", 
        "RESPUESTA_INCORRECTA_3"
      ],
      "correct": 1,
      "explanation": "EXPLICACIÓN_DE_POR_QUÉ_ES_CORRECTA"
    },
    {
      "question": "TERCERA_PREGUNTA_EDUCATIVA",
      "options": [
        "RESPUESTA_INCORRECTA_1",
        "RESPUESTA_INCORRECTA_2",
        "RESPUESTA_CORRECTA",
        "RESPUESTA_INCORRECTA_3"
      ],
      "correct": 2,
      "explanation": "EXPLICACIÓN_DE_POR_QUÉ_ES_CORRECTA"
    }
  ]
}

Instrucciones específicas:
1. Genera EXACTAMENTE 3 preguntas educativas sobre el tema específico
2. Cada pregunta debe tener 4 opciones (1 correcta, 3 incorrectas)
3. Las opciones incorrectas deben ser plausibles pero claramente incorrectas
4. Incluye explicación educativa para cada respuesta correcta
5. Adapta el nivel de dificultad a la edad del usuario (${userAge} años)
6. Usa un lenguaje claro y apropiado para el objetivo: ${learningGoal}
7. El título debe ser descriptivo del tema específico
8. Las preguntas deben ser específicas y educativas sobre "${topic}" en "${subject}"
9. Varía la posición de la respuesta correcta en cada pregunta (índice 0, 1, 2 o 3)
10. Asegúrate de que las preguntas cubran diferentes aspectos del tema

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;
};

// (fin del bloque eliminado)

// Función para generar parámetros H5P específicos para QuestionSet
function generateDefaultH5PParams(formData: ResourceFormData): any {
  // Solo soportamos H5P.QuestionSet por ahora
  return {
    introPage: {
      showIntroPage: true,
      title: `Cuestionario: ${formData.topic}`,
      introduction: `Responde las siguientes preguntas sobre ${formData.topic}`
    },
    progressType: 'textual',
    passPercentage: 70,
    questions: [], // Se llenará con el contenido de Gemini
    texts: {
      prevButton: 'Anterior',
      nextButton: 'Siguiente',
      finishButton: 'Finalizar',
      textualProgress: 'Pregunta: @current de @total',
      jumpToQuestion: 'Pregunta %d de %d',
      questionLabel: 'Pregunta',
      readSpeakerProgress: 'Pregunta @current de @total',
      unansweredText: 'Sin responder',
      answeredText: 'Respondida',
      currentQuestionText: 'Pregunta actual'
    },
    disableBackwardsNavigation: false,
    randomQuestions: false,
    endGame: {
      showResultPage: true,
      showSolutionButton: true,
      showRetryButton: true,
      noResultMessage: 'Terminado',
      message: 'Tu resultado:',
      overallFeedback: [
        {
          from: 0,
          to: 49,
          feedback: 'Necesitas estudiar más este tema. ¡Sigue practicando!'
        },
        {
          from: 50,
          to: 79,
          feedback: '¡Buen trabajo! Tienes una comprensión sólida del tema.'
        },
        {
          from: 80,
          to: 100,
          feedback: '¡Excelente! Dominas muy bien este tema.'
        }
      ],
      solutionButtonText: 'Mostrar solución',
      retryButtonText: 'Reintentar',
      finishButtonText: 'Finalizar',
      submitButtonText: 'Enviar',
      showAnimations: false,
      skippable: false,
      skipButtonText: 'Saltar video'
    },
    override: {
      checkButton: true
    }
  };
}

// Función principal para generar recursos educativos
export async function generateEducationalResource(
  formData: ResourceFormData
): Promise<GeneratedResource> {
  try {
    // Obtener el modelo
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Calcular edad del usuario desde userBirthData (manejar ausencia de datos)
    const currentYear = new Date().getFullYear();
    const birthYear = formData.userBirthData?.birth_year;
    const userAge = typeof birthYear === 'number' ? currentYear - birthYear : 0;

    // Generar el prompt usando la nueva función simplificada
    const prompt = generateH5PPrompt(
      formData.subject,
      formData.topic,
      userAge,
      formData.learningGoal ?? 'Aprendizaje'
    );

    console.log('🚀 Enviando prompt a Gemini para H5P:', prompt);

    // Generar el contenido
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Respuesta de Gemini:', text);

    // Intentar parsear la respuesta JSON
    try {
      // Extraer JSON de bloques de código markdown si están presentes
      let jsonText = text;
      const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonText = jsonBlockMatch[1];
        console.log('📋 JSON extraído de bloque markdown');
      }

      const h5pContent = JSON.parse(jsonText);
      console.log('✅ JSON parseado exitosamente:', h5pContent);
      
      // Validar que el contenido H5P tenga la estructura correcta
      if (!h5pContent || !h5pContent.library || !h5pContent.params) {
        throw new Error('Contenido H5P inválido en la respuesta');
      }

      // Completar metadata si falta información
      if (!h5pContent.metadata) {
        h5pContent.metadata = {
          title: h5pContent.metadata?.title || `${formData.topic} - Actividad Interactiva`,
          license: 'CC BY-SA',
          licenseVersion: '4.0',
          contentType: 'Interactive Content',
          defaultLanguage: 'es'
        };
      }

      return {
        title: h5pContent.metadata.title,
        content: `Pregunta interactiva sobre ${formData.topic}`,
        h5pContent: h5pContent,
        summary: `Actividad de opción múltiple sobre ${formData.topic} en ${formData.subject}`
      };
    } catch (parseError) {
      console.warn('⚠️ No se pudo parsear como JSON, generando contenido H5P por defecto');
      console.error('Error de parsing:', parseError);
      
      // Generar contenido H5P por defecto
      const primaryGameType = 'Cuestionarios interactivos';
      const h5pLibrary = gameTypeToH5PLibrary[primaryGameType] || 'H5P.QuestionSet 1.20';
      
      return {
        title: `${formData.subject}: ${formData.topic}`,
        content: text,
        h5pContent: {
          library: h5pLibrary,
          title: `Actividad: ${formData.topic}`,
          params: generateDefaultH5PParams(formData),
          metadata: {
            title: `${formData.topic} - Actividad Interactiva`,
            license: 'CC BY-SA',
            licenseVersion: '4.0',
            contentType: 'Interactive Content',
            defaultLanguage: 'es'
          }
        },
        summary: 'Recurso generado exitosamente'
      };
    }

  } catch (error) {
    console.error('❌ Error al generar recurso con Gemini:', error);
    throw new Error(`Error al generar el recurso: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función de prueba para verificar la conexión con Gemini
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Responde solo con 'OK' si puedes leer este mensaje.");
    const response = await result.response;
    const text = response.text();
    
    console.log('🔍 Test de conexión Gemini:', text);
    return text.toLowerCase().includes('ok');
  } catch (error) {
    console.error('❌ Error en test de conexión:', error);
    return false;
  }
}