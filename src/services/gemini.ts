import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuración de la API de Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_GEMINI_API_KEY);

// Interfaces para los datos
export interface UserPreferences {
  academicLevel: string;
  formatPreferences: string[];
  interactiveActivities: string[];
}

export interface ResourceFormData {
  subject: string;
  topic: string;
  difficulty: string;
  resourceType: string;
  selectedGames: string[];
}

export interface GeneratedResource {
  title: string;
  content: string;
  exercises?: Record<string, unknown>[];
  games?: Record<string, unknown>[];
  summary?: string;
}

// Función para generar el prompt basado en las preferencias del usuario y datos del formulario
function generatePrompt(formData: ResourceFormData, userPreferences: UserPreferences): string {
  const prompt = `
Eres un asistente educativo especializado en crear recursos de aprendizaje personalizados. 

INFORMACIÓN DEL ESTUDIANTE:
- Nivel académico: ${userPreferences.academicLevel}
- Formatos preferidos: ${userPreferences.formatPreferences.join(', ')}
- Actividades interactivas preferidas: ${userPreferences.interactiveActivities.join(', ')}

RECURSO SOLICITADO:
- Materia: ${formData.subject}
- Tema: ${formData.topic}
- Dificultad: ${formData.difficulty}
- Tipo de recurso: ${formData.resourceType}
- Juegos seleccionados: ${formData.selectedGames.join(', ')}

INSTRUCCIONES:
1. Crea un recurso educativo completo sobre "${formData.topic}" en la materia "${formData.subject}"
2. Adapta el contenido al nivel de dificultad "${formData.difficulty}" y nivel académico "${userPreferences.academicLevel}"
3. Considera los formatos preferidos del estudiante: ${userPreferences.formatPreferences.join(', ')}
4. El recurso debe ser apropiado para el nivel académico especificado

ESTRUCTURA REQUERIDA:
1. **Título**: Un título atractivo para el recurso
2. **Introducción**: Breve introducción al tema (2-3 párrafos)
3. **Contenido Principal**: Desarrollo del tema adaptado al nivel y estilo de aprendizaje
4. **Ejemplos Prácticos**: Al menos 2-3 ejemplos relevantes
5. **Resumen**: Puntos clave del tema
6. **Actividades Interactivas**: Propuestas para los juegos seleccionados: ${formData.selectedGames.join(', ')}

FORMATO DE RESPUESTA:
Responde en formato JSON con la siguiente estructura:
{
  "title": "Título del recurso",
  "introduction": "Introducción al tema",
  "mainContent": "Contenido principal desarrollado",
  "examples": ["Ejemplo 1", "Ejemplo 2", "Ejemplo 3"],
  "summary": "Resumen con puntos clave",
  "interactiveActivities": [
    {
      "gameType": "Tipo de juego",
      "title": "Título de la actividad",
      "description": "Descripción de la actividad",
      "questions": ["Pregunta 1", "Pregunta 2", "Pregunta 3"],
      "answers": ["Respuesta 1", "Respuesta 2", "Respuesta 3"],
      "correctAnswers": [0, 1, 2]
    }
  ]
}

Asegúrate de que el contenido sea educativo, apropiado para el nivel académico, y que las actividades interactivas sean engaging y relevantes al tema.
`;

  return prompt;
}

// Función principal para generar recursos educativos
export async function generateEducationalResource(
  formData: ResourceFormData,
  userPreferences: UserPreferences
): Promise<GeneratedResource> {
  try {
    // Obtener el modelo
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Generar el prompt
    const prompt = generatePrompt(formData, userPreferences);

    console.log('🚀 Enviando prompt a Gemini:', prompt);

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

      const parsedResponse = JSON.parse(jsonText);
      console.log('✅ JSON parseado exitosamente:', parsedResponse);
      
      return {
        title: parsedResponse.title,
        content: `${parsedResponse.introduction}\n\n${parsedResponse.mainContent}`,
        exercises: parsedResponse.examples,
        games: parsedResponse.interactiveActivities,
        summary: parsedResponse.summary
      };
    } catch (parseError) {
      console.warn('⚠️ No se pudo parsear como JSON, devolviendo texto plano');
      console.error('Error de parsing:', parseError);
      return {
        title: `${formData.resourceType}: ${formData.topic}`,
        content: text,
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