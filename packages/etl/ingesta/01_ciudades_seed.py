"""
01 - Seed the `ciudades` table with the 4 initial Colombian cities.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the packages root is on sys.path for both module and script usage
_PKG_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

from packages.etl.utils.supabase_client import supabase

CIUDADES = [
    {
        "nombre": "Medellín",
        "departamento": "Antioquia",
        "lat": 6.2442,
        "lng": -75.5812,
        "poblacion": 2_569_007,
    },
    {
        "nombre": "Cali",
        "departamento": "Valle del Cauca",
        "lat": 3.4516,
        "lng": -76.5319,
        "poblacion": 2_252_616,
    },
    {
        "nombre": "Bogotá",
        "departamento": "Cundinamarca",
        "lat": 4.7110,
        "lng": -74.0721,
        "poblacion": 7_901_653,
    },
    {
        "nombre": "Barranquilla",
        "departamento": "Atlántico",
        "lat": 10.9685,
        "lng": -74.7813,
        "poblacion": 1_274_250,
    },
]


def run():
    """Upsert the seed cities into the `ciudades` table."""
    print("=" * 60)
    print("01 - Seeding ciudades")
    print("=" * 60)

    for ciudad in CIUDADES:
        result = (
            supabase.table("ciudades")
            .upsert(ciudad, on_conflict="nombre")
            .execute()
        )
        status = "upserted" if result.data else "error"
        print(f"  [{status}] {ciudad['nombre']}")

    print(f"  Total: {len(CIUDADES)} cities seeded.\n")
    return CIUDADES


if __name__ == "__main__":
    run()
