"""
demo_seed.py - Orchestrator for the full ETL pipeline.

Runs all ingestion scripts in order:
  01. Seed cities
  02. Google Places scraper (generators + parking)
  03. OpenStreetMap extractor (parking + roads + institutional)
  04. Insert demo predios
  05. Score all predios

Then generates AI fichas tecnicas for predios with score_general > 60.
"""

from __future__ import annotations

import importlib
import sys
import time
from pathlib import Path

_PKG_ROOT = str(Path(__file__).resolve().parent.parent)
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

from packages.etl.config import validate
from packages.etl.utils.claude_enricher import ClaudeEnricher
from packages.etl.utils.supabase_client import supabase

# Module names with leading digits require importlib
_mod_01 = importlib.import_module("packages.etl.ingesta.01_ciudades_seed")
_mod_02 = importlib.import_module("packages.etl.ingesta.02_google_places_scraper")
_mod_03 = importlib.import_module("packages.etl.ingesta.03_osm_extractor")
_mod_04 = importlib.import_module("packages.etl.ingesta.04_predios_publicos")
_mod_05 = importlib.import_module("packages.etl.ingesta.05_scorer")

seed_ciudades = _mod_01.run
scrape_places = _mod_02.run
extract_osm = _mod_03.run
insert_predios = _mod_04.run
score_predios = _mod_05.run


def generate_fichas(min_score: float = 60.0):
    """Generate AI fichas tecnicas for high-scoring predios."""
    print("=" * 60)
    print(f"Generating fichas tecnicas (score_general > {min_score})")
    print("=" * 60)

    predios = (
        supabase.table("predios")
        .select("*")
        .gte("score_general", min_score)
        .order("score_general", desc=True)
        .execute()
        .data
        or []
    )

    if not predios:
        print("  No predios with score above threshold.\n")
        return

    enricher = ClaudeEnricher()

    for predio in predios:
        pid = predio["id"]
        ciudad = predio.get("ciudad_nombre", "")
        nombre = predio.get("nombre", "?")

        print(f"\n  Processing: {nombre} (score={predio.get('score_general')})")

        # Get linked generators
        gen_links = (
            supabase.table("predios_generadores")
            .select("generador_id, distancia_m")
            .eq("predio_id", pid)
            .execute()
            .data
            or []
        )
        gen_ids = [g["generador_id"] for g in gen_links if g.get("generador_id")]

        generadores_cercanos = []
        if gen_ids:
            gen_data = (
                supabase.table("generadores_demanda")
                .select("*")
                .in_("id", gen_ids)
                .execute()
                .data
                or []
            )
            # Merge distance info
            dist_map = {g["generador_id"]: g["distancia_m"] for g in gen_links}
            for g in gen_data:
                g["distancia_m"] = dist_map.get(g["id"], 0)
            generadores_cercanos = gen_data

        # Get nearby parking
        parqueaderos_cercanos = (
            supabase.table("parqueaderos_existentes")
            .select("*")
            .eq("ciudad_nombre", ciudad)
            .execute()
            .data
            or []
        )

        # Generate ficha
        ficha = enricher.generar_ficha_tecnica(
            predio_dict=predio,
            generadores_cercanos=generadores_cercanos,
            parqueaderos_cercanos=parqueaderos_cercanos,
            ciudad=ciudad,
        )

        if ficha:
            print(f"    Ficha generated: {ficha.get('cajones_recomendados', '?')} cajones, "
                  f"ingreso estimado: ${ficha.get('ingresos_estimados_mes', '?'):,} COP/mes")
        else:
            print(f"    [ERROR] Could not generate ficha for {nombre}")

        # Also generate normative checklist
        checklist = enricher.generar_checklist_normativo(
            tipo_predio=predio.get("uso_actual", "lote_baldio"),
            ciudad=ciudad,
            restricciones=predio.get("restricciones"),
        )
        if checklist:
            print(f"    Checklist: {len(checklist.get('normas', []))} norms, "
                  f"risk={checklist.get('riesgo_legal', '?')}")

    print(f"\n  Fichas generated for {len(predios)} predios.\n")


def run():
    """Execute the full ETL pipeline."""
    start = time.time()

    print("\n" + "=" * 60)
    print("  PREDIOS APP - FULL ETL PIPELINE")
    print("=" * 60 + "\n")

    # Validate environment
    validate()

    # Step 1: Seed cities
    seed_ciudades()

    # Step 2: Google Places
    scrape_places()

    # Step 3: OSM data
    extract_osm()

    # Step 4: Demo predios
    insert_predios()

    # Step 5: Score predios
    score_predios()

    # Step 6: Generate AI fichas for top predios
    generate_fichas(min_score=60.0)

    elapsed = time.time() - start
    print("=" * 60)
    print(f"  Pipeline complete in {elapsed:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    run()
