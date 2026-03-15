"""
ClaudeEnricher -- uses the Anthropic API (claude-sonnet-4-20250514) to generate
fichas tecnicas and normative checklists for public land parcels.
"""

import json
import time
from typing import Any, Dict, List, Optional

import anthropic
from ..config import ANTHROPIC_API_KEY
from .supabase_client import supabase

MODEL = "claude-sonnet-4-20250514"
MAX_RETRIES = 3
RETRY_DELAY_S = 2.0


class ClaudeEnricher:
    """AI enrichment layer for predio analysis."""

    def __init__(self):
        if not ANTHROPIC_API_KEY:
            raise EnvironmentError("ANTHROPIC_API_KEY is not set.")
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # ------------------------------------------------------------------
    # Ficha tecnica
    # ------------------------------------------------------------------
    def generar_ficha_tecnica(
        self,
        predio_dict: Dict[str, Any],
        generadores_cercanos: List[Dict[str, Any]],
        parqueaderos_cercanos: List[Dict[str, Any]],
        ciudad: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a technical feasibility report for converting a public
        parcel into parking infrastructure.

        The result is a JSON dict with:
          resumen_ejecutivo, cajones_recomendados, modelo_tarifario
          (tarifa_fraccion_30min, tarifa_hora, tarifa_dia, tarifa_mes -- all COP),
          ingresos_estimados_mes, servicios_complementarios,
          riesgos_principales, vinculacion_plan_desarrollo
          (municipal, departamental, nacional), normativa_aplicable.

        The generated ficha is cached in the fichas_tecnicas Supabase table.
        """
        predio_id = predio_dict.get("id")

        # --- Check cache ---
        cached = (
            supabase.table("fichas_tecnicas")
            .select("contenido")
            .eq("predio_id", predio_id)
            .execute()
        )
        if cached.data:
            print(f"  [cache hit] ficha tecnica for predio {predio_id}")
            return cached.data[0]["contenido"]

        # --- Build prompt ---
        prompt = self._build_ficha_prompt(
            predio_dict, generadores_cercanos, parqueaderos_cercanos, ciudad
        )

        # --- Call with retries ---
        ficha = self._call_with_retry(prompt)
        if ficha is None:
            return None

        # --- Persist to Supabase ---
        supabase.table("fichas_tecnicas").upsert(
            {
                "predio_id": predio_id,
                "contenido": ficha,
                "modelo": MODEL,
            },
            on_conflict="predio_id",
        ).execute()

        return ficha

    # ------------------------------------------------------------------
    # Checklist normativo
    # ------------------------------------------------------------------
    def generar_checklist_normativo(
        self,
        tipo_predio: str,
        ciudad: str,
        restricciones: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a normative compliance checklist applicable to a parcel.

        Includes references to:
          - POT (Plan de Ordenamiento Territorial) of the given city
          - NSR-10 (Colombian seismic-resistant construction standard)
          - Decreto 1077 de 2015 (national urban development decree)
          - Any city-specific parking norms

        Returns a dict with keys: normas (list of dicts with nombre, aplica,
        observacion), resumen, riesgo_legal.
        """
        restricciones = restricciones or []

        # --- Cache key ---
        cache_key = f"{tipo_predio}|{ciudad}|{','.join(sorted(restricciones))}"
        cached = (
            supabase.table("fichas_tecnicas")
            .select("contenido")
            .eq("predio_id", cache_key)
            .execute()
        )
        if cached.data:
            print(f"  [cache hit] checklist normativo for {cache_key}")
            return cached.data[0]["contenido"]

        prompt = self._build_checklist_prompt(tipo_predio, ciudad, restricciones)
        checklist = self._call_with_retry(prompt)
        if checklist is None:
            return None

        supabase.table("fichas_tecnicas").upsert(
            {
                "predio_id": cache_key,
                "contenido": checklist,
                "modelo": MODEL,
            },
            on_conflict="predio_id",
        ).execute()

        return checklist

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _build_ficha_prompt(
        self,
        predio: Dict[str, Any],
        generadores: List[Dict[str, Any]],
        parqueaderos: List[Dict[str, Any]],
        ciudad: str,
    ) -> str:
        gen_summary = "\n".join(
            f"  - {g.get('nombre','?')} (tipo={g.get('tipo','?')}, "
            f"aforo={g.get('aforo_estimado','?')}, "
            f"dist={g.get('distancia_m','?')}m)"
            for g in generadores
        )
        park_summary = "\n".join(
            f"  - {p.get('nombre','?')} (capacidad={p.get('capacidad','?')}, "
            f"dist={p.get('distancia_m','?')}m)"
            for p in parqueaderos
        )

        return f"""Eres un consultor colombiano experto en movilidad urbana, estacionamientos y normativa urbanistica.

Analiza el siguiente predio publico y genera una ficha tecnica de factibilidad para convertirlo en infraestructura de parqueaderos.

## Datos del predio
- Nombre: {predio.get('nombre', '?')}
- Ciudad: {ciudad}
- Propietario: {predio.get('propietario', '?')}
- Area m2: {predio.get('area_m2', '?')}
- Uso actual: {predio.get('uso_actual', '?')}
- Restricciones: {predio.get('restricciones', [])}
- Score general: {predio.get('score_general', '?')}

## Generadores de demanda cercanos
{gen_summary or '  Ninguno encontrado'}

## Parqueaderos existentes cercanos
{park_summary or '  Ninguno encontrado'}

Responde UNICAMENTE con un JSON valido (sin markdown, sin texto adicional) con esta estructura exacta:
{{
  "resumen_ejecutivo": "string (max 300 palabras)",
  "cajones_recomendados": integer,
  "modelo_tarifario": {{
    "tarifa_fraccion_30min": integer (COP),
    "tarifa_hora": integer (COP),
    "tarifa_dia": integer (COP),
    "tarifa_mes": integer (COP)
  }},
  "ingresos_estimados_mes": integer (COP),
  "servicios_complementarios": ["string"],
  "riesgos_principales": ["string"],
  "vinculacion_plan_desarrollo": {{
    "municipal": "string",
    "departamental": "string",
    "nacional": "string"
  }},
  "normativa_aplicable": ["string"]
}}"""

    def _build_checklist_prompt(
        self,
        tipo_predio: str,
        ciudad: str,
        restricciones: List[str],
    ) -> str:
        return f"""Eres un abogado urbanista colombiano experto en normativa de construccion y uso del suelo.

Genera un checklist normativo aplicable a un predio de tipo "{tipo_predio}" en {ciudad}, Colombia,
que tiene las siguientes restricciones: {restricciones or 'ninguna'}.

Incluye obligatoriamente referencias a:
- POT (Plan de Ordenamiento Territorial) de {ciudad}
- NSR-10 (Norma Sismo Resistente)
- Decreto 1077 de 2015 (Decreto Unico Reglamentario del sector vivienda)
- Normas locales de estacionamientos de {ciudad}
- Cualquier restriccion patrimonial, ambiental o etnica aplicable

Responde UNICAMENTE con un JSON valido (sin markdown, sin texto adicional) con esta estructura:
{{
  "normas": [
    {{
      "nombre": "string",
      "aplica": true/false,
      "observacion": "string"
    }}
  ],
  "resumen": "string (max 200 palabras)",
  "riesgo_legal": "bajo|medio|alto"
}}"""

    def _call_with_retry(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Call Claude API with retry logic, return parsed JSON or None."""
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self.client.messages.create(
                    model=MODEL,
                    max_tokens=2048,
                    messages=[{"role": "user", "content": prompt}],
                )
                text = response.content[0].text.strip()
                # Strip markdown fences if model wraps output
                if text.startswith("```"):
                    text = text.split("\n", 1)[1]
                    if text.endswith("```"):
                        text = text[: text.rfind("```")]
                    text = text.strip()
                return json.loads(text)
            except json.JSONDecodeError as e:
                print(
                    f"  [attempt {attempt}/{MAX_RETRIES}] JSON parse error: {e}"
                )
            except anthropic.APIError as e:
                print(
                    f"  [attempt {attempt}/{MAX_RETRIES}] Anthropic API error: {e}"
                )
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_S * attempt)
        print("  [ERROR] All retries exhausted.")
        return None
