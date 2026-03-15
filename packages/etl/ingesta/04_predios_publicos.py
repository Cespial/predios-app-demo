"""
04 - Insert demo public land parcels (predios) with realistic data.

Each predio has a 4-vertex Polygon geometry in WKT format.

TODO (production):
  - Replace demo data with IGAC Cadastral REST API integration
    (https://serviciosgeovisor.igac.gov.co)
  - Integrate datos.gov.co dataset for public land inventory
    (e.g. https://www.datos.gov.co/resource/XXXX.json)
  - Use SNR (Superintendencia de Notariado y Registro) data
    for ownership verification
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

_PKG_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

from packages.etl.utils.supabase_client import supabase


def _wkt_polygon(vertices: List[List[float]]) -> str:
    """
    Build a WKT POLYGON string from a list of [lng, lat] pairs.
    Automatically closes the ring.
    """
    if vertices[0] != vertices[-1]:
        vertices = vertices + [vertices[0]]
    coords = ", ".join(f"{v[0]} {v[1]}" for v in vertices)
    return f"POLYGON(({coords}))"


# ---------- Demo predios ----------

PREDIOS: List[Dict[str, Any]] = [
    # ========== MEDELLIN (4) ==========
    {
        "nombre": "Lote Estadio Atanasio Norte",
        "ciudad_nombre": "Medellín",
        "propietario": "INDER Medellín",
        "area_m2": 8500,
        "uso_actual": "lote_baldio",
        "restricciones": [],
        "lat": 6.2567,
        "lng": -75.5908,
        "geometria_wkt": _wkt_polygon([
            [-75.5915, 6.2572],
            [-75.5901, 6.2572],
            [-75.5901, 6.2562],
            [-75.5915, 6.2562],
        ]),
    },
    {
        "nombre": "Predio Hospital General",
        "ciudad_nombre": "Medellín",
        "propietario": "Alcaldía de Medellín",
        "area_m2": 4200,
        "uso_actual": "lote_baldio",
        "restricciones": [],
        "lat": 6.2512,
        "lng": -75.5747,
        "geometria_wkt": _wkt_polygon([
            [-75.5753, 6.2517],
            [-75.5741, 6.2517],
            [-75.5741, 6.2507],
            [-75.5753, 6.2507],
        ]),
    },
    {
        "nombre": "Lote Estación Universidad Metro",
        "ciudad_nombre": "Medellín",
        "propietario": "Metro de Medellín",
        "area_m2": 3800,
        "uso_actual": "lote_baldio",
        "restricciones": [],
        "lat": 6.2681,
        "lng": -75.5656,
        "geometria_wkt": _wkt_polygon([
            [-75.5662, 6.2686],
            [-75.5650, 6.2686],
            [-75.5650, 6.2676],
            [-75.5662, 6.2676],
        ]),
    },
    {
        "nombre": "Predio Parque Norte Aledaño",
        "ciudad_nombre": "Medellín",
        "propietario": "Alcaldía de Medellín",
        "area_m2": 6100,
        "uso_actual": "zona_verde",
        "restricciones": [],
        "lat": 6.2725,
        "lng": -75.5641,
        "geometria_wkt": _wkt_polygon([
            [-75.5649, 6.2731],
            [-75.5633, 6.2731],
            [-75.5633, 6.2719],
            [-75.5649, 6.2719],
        ]),
    },
    # ========== CALI (3) ==========
    {
        "nombre": "Lote Hospital Universitario Valle",
        "ciudad_nombre": "Cali",
        "propietario": "Gobernación del Valle",
        "area_m2": 5200,
        "uso_actual": "lote_baldio",
        "restricciones": [],
        "lat": 3.4399,
        "lng": -76.5253,
        "geometria_wkt": _wkt_polygon([
            [-76.5260, 3.4405],
            [-76.5246, 3.4405],
            [-76.5246, 3.4393],
            [-76.5260, 3.4393],
        ]),
    },
    {
        "nombre": "Predio Estadio Pascual Flanco Sur",
        "ciudad_nombre": "Cali",
        "propietario": "Alcaldía de Cali",
        "area_m2": 7800,
        "uso_actual": "lote_baldio",
        "restricciones": [],
        "lat": 3.4260,
        "lng": -76.5350,
        "geometria_wkt": _wkt_polygon([
            [-76.5359, 3.4267],
            [-76.5341, 3.4267],
            [-76.5341, 3.4253],
            [-76.5359, 3.4253],
        ]),
    },
    {
        "nombre": "Lote Universidades Médicas",
        "ciudad_nombre": "Cali",
        "propietario": "Alcaldía de Cali",
        "area_m2": 4500,
        "uso_actual": "lote_baldio",
        "restricciones": [],
        "lat": 3.4440,
        "lng": -76.5205,
        "geometria_wkt": _wkt_polygon([
            [-76.5212, 3.4446],
            [-76.5198, 3.4446],
            [-76.5198, 3.4434],
            [-76.5212, 3.4434],
        ]),
    },
    # ========== BOGOTA (2) ==========
    {
        "nombre": "Lote Zona Hospitalaria Centro",
        "ciudad_nombre": "Bogotá",
        "propietario": "Secretaría de Hacienda",
        "area_m2": 5600,
        "uso_actual": "lote_baldio",
        "restricciones": ["BIC"],
        "lat": 4.6145,
        "lng": -74.0684,
        "geometria_wkt": _wkt_polygon([
            [-74.0691, 4.6151],
            [-74.0677, 4.6151],
            [-74.0677, 4.6139],
            [-74.0691, 4.6139],
        ]),
    },
    {
        "nombre": "Predio Universidad Nacional Costado Sur",
        "ciudad_nombre": "Bogotá",
        "propietario": "Universidad Nacional de Colombia",
        "area_m2": 9200,
        "uso_actual": "zona_verde",
        "restricciones": [],
        "lat": 4.6359,
        "lng": -74.0837,
        "geometria_wkt": _wkt_polygon([
            [-74.0846, 4.6366],
            [-74.0828, 4.6366],
            [-74.0828, 4.6352],
            [-74.0846, 4.6352],
        ]),
    },
    # ========== BARRANQUILLA (2) ==========
    {
        "nombre": "Lote Estadio Metropolitano Sur",
        "ciudad_nombre": "Barranquilla",
        "propietario": "Alcaldía de Barranquilla",
        "area_m2": 10500,
        "uso_actual": "lote_baldio",
        "restricciones": [],
        "lat": 10.9263,
        "lng": -74.8122,
        "geometria_wkt": _wkt_polygon([
            [-74.8132, 10.9270],
            [-74.8112, 10.9270],
            [-74.8112, 10.9256],
            [-74.8132, 10.9256],
        ]),
    },
    {
        "nombre": "Predio Centro de Convenciones Puerta de Oro",
        "ciudad_nombre": "Barranquilla",
        "propietario": "Gobernación del Atlántico",
        "area_m2": 6700,
        "uso_actual": "lote_baldio",
        "restricciones": [],
        "lat": 10.9985,
        "lng": -74.7890,
        "geometria_wkt": _wkt_polygon([
            [-74.7898, 10.9991],
            [-74.7882, 10.9991],
            [-74.7882, 10.9979],
            [-74.7898, 10.9979],
        ]),
    },
]


def run():
    """Upsert demo predios into the `predios` table."""
    print("=" * 60)
    print("04 - Inserting demo predios publicos")
    print("=" * 60)

    for predio in PREDIOS:
        result = (
            supabase.table("predios")
            .upsert(predio, on_conflict="nombre")
            .execute()
        )
        status = "upserted" if result.data else "error"
        print(f"  [{status}] {predio['nombre']} ({predio['ciudad_nombre']}, {predio['area_m2']}m2)")

    print(f"  Total: {len(PREDIOS)} predios inserted.\n")
    return PREDIOS


if __name__ == "__main__":
    run()
