import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}

interface PredioData {
  nombre: string;
  direccion: string;
  area_m2: number;
  propietario: string;
  uso_actual: string;
  score_total: number;
  tiene_restriccion_bic: boolean;
  tiene_restriccion_etnica: boolean;
  tiene_restriccion_forestal: boolean;
}

interface GeneradorCercano {
  nombre: string;
  tipo: string;
  aforo: number;
  distancia_metros: number;
}

interface ParqueaderoCercano {
  nombre: string;
  capacidad: number;
  distancia_metros: number;
}

export async function generarFichaTecnica(
  predio: PredioData,
  generadores: GeneradorCercano[],
  parqueaderos: ParqueaderoCercano[],
  ciudad: string
) {
  const anthropic = getClient();

  const restricciones = [
    predio.tiene_restriccion_bic && 'Bien de Interés Cultural (BIC)',
    predio.tiene_restriccion_etnica && 'Restricción étnica',
    predio.tiene_restriccion_forestal && 'Restricción forestal',
  ].filter(Boolean);

  const prompt = `Eres un experto en desarrollo urbano, parqueaderos y normativa colombiana.

Analiza el siguiente predio para determinar su viabilidad como parqueadero público en ${ciudad}, Colombia.

## Datos del Predio
- Nombre: ${predio.nombre}
- Dirección: ${predio.direccion}
- Área: ${predio.area_m2} m²
- Propietario: ${predio.propietario}
- Uso actual: ${predio.uso_actual || 'Sin uso definido'}
- Score de viabilidad: ${predio.score_total}/100
- Restricciones: ${restricciones.length > 0 ? restricciones.join(', ') : 'Ninguna'}

## Generadores de Demanda Cercanos
${generadores.map((g) => `- ${g.nombre} (${g.tipo}, aforo: ${g.aforo}, distancia: ${Math.round(g.distancia_metros)}m)`).join('\n')}

## Parqueaderos Existentes Cercanos
${parqueaderos.map((p) => `- ${p.nombre} (capacidad: ${p.capacidad}, distancia: ${Math.round(p.distancia_metros)}m)`).join('\n')}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:
{
  "resumen_ejecutivo": "2-3 párrafos sobre el potencial del predio como parqueadero",
  "cajones_recomendados": <número entero>,
  "modelo_tarifario": {
    "tarifa_fraccion_30min": <número en COP>,
    "tarifa_hora": <número en COP>,
    "tarifa_dia": <número en COP>,
    "tarifa_mes": <número en COP>
  },
  "ingresos_estimados_mes": <número en COP>,
  "servicios_complementarios": ["servicio1", "servicio2", ...],
  "riesgos_principales": ["riesgo1", "riesgo2", ...],
  "vinculacion_plan_desarrollo": {
    "municipal": "texto sobre cómo se vincula con el Plan de Desarrollo Municipal",
    "departamental": "texto sobre vinculación departamental",
    "nacional": "texto sobre vinculación con políticas nacionales"
  },
  "normativa_aplicable": [
    {"componente": "arquitectonico", "norma": "NSR-10", "descripcion": "..."},
    {"componente": "estructural", "norma": "...", "descripcion": "..."},
    {"componente": "ambiental", "norma": "...", "descripcion": "..."},
    {"componente": "social", "norma": "...", "descripcion": "..."},
    {"componente": "trafico", "norma": "...", "descripcion": "..."}
  ]
}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        message.content[0].type === 'text' ? message.content[0].text : '';
      return JSON.parse(text);
    } catch (error) {
      lastError = error as Error;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }

  throw lastError;
}
