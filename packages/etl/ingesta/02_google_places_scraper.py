"""
02 - Scrape Google Places API for demand generators and existing parking lots
     in a 5 km radius around each seeded city center.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Any, Dict, List

_PKG_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

import googlemaps
from tqdm import tqdm

from packages.etl.config import GOOGLE_PLACES_API_KEY
from packages.etl.utils.supabase_client import supabase

# ---------- Configuration ----------

SEARCH_RADIUS_M = 5000
RATE_LIMIT_S = 0.1

# Demand generator types mapped to default estimated capacity (aforo)
GENERATOR_TYPES: Dict[str, int] = {
    "estadio": 30_000,
    "hospital": 500,
    "clinica": 200,
    "universidad": 5_000,
    "metro": 3_000,
    "centro_comercial": 8_000,
    "coliseo": 15_000,
}

# Search queries for existing parking lots
PARKING_QUERIES = ["parqueadero", "parking"]


def _get_gmaps_client() -> googlemaps.Client:
    if not GOOGLE_PLACES_API_KEY:
        raise EnvironmentError("GOOGLE_PLACES_API_KEY is not set.")
    return googlemaps.Client(key=GOOGLE_PLACES_API_KEY)


def _places_nearby(
    client: googlemaps.Client,
    lat: float,
    lng: float,
    keyword: str,
    radius: int = SEARCH_RADIUS_M,
) -> List[Dict[str, Any]]:
    """Run a nearby-search and paginate through all results."""
    results: List[Dict[str, Any]] = []
    response = client.places_nearby(
        location=(lat, lng),
        radius=radius,
        keyword=keyword,
    )
    results.extend(response.get("results", []))

    # Follow next_page_token (max 2 extra pages)
    for _ in range(2):
        token = response.get("next_page_token")
        if not token:
            break
        time.sleep(2)  # Google requires ~2s before token is valid
        response = client.places_nearby(
            location=(lat, lng),
            radius=radius,
            keyword=keyword,
            page_token=token,
        )
        results.extend(response.get("results", []))

    return results


def _scrape_generators(
    client: googlemaps.Client,
    ciudades: List[Dict[str, Any]],
) -> int:
    """Scrape demand generators for all cities. Returns row count inserted."""
    total = 0
    gen_iter = [
        (c, tipo, aforo)
        for c in ciudades
        for tipo, aforo in GENERATOR_TYPES.items()
    ]

    for ciudad, tipo, aforo_default in tqdm(gen_iter, desc="Generators"):
        lat, lng = ciudad["lat"], ciudad["lng"]
        places = _places_nearby(client, lat, lng, keyword=tipo)

        rows = []
        for p in places:
            loc = p["geometry"]["location"]
            rows.append(
                {
                    "nombre": p.get("name", tipo),
                    "tipo": tipo,
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "aforo_estimado": aforo_default,
                    "ciudad_nombre": ciudad["nombre"],
                    "google_place_id": p.get("place_id"),
                    "direccion": p.get("vicinity", ""),
                }
            )

        if rows:
            supabase.table("generadores_demanda").upsert(
                rows, on_conflict="google_place_id"
            ).execute()
            total += len(rows)

        time.sleep(RATE_LIMIT_S)

    return total


def _scrape_parking(
    client: googlemaps.Client,
    ciudades: List[Dict[str, Any]],
) -> int:
    """Scrape existing parking lots for all cities. Returns row count."""
    total = 0
    park_iter = [
        (c, q) for c in ciudades for q in PARKING_QUERIES
    ]

    for ciudad, query in tqdm(park_iter, desc="Parking lots"):
        lat, lng = ciudad["lat"], ciudad["lng"]
        places = _places_nearby(client, lat, lng, keyword=query)

        rows = []
        for p in places:
            loc = p["geometry"]["location"]
            rows.append(
                {
                    "nombre": p.get("name", query),
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "capacidad": None,  # Google rarely provides this
                    "ciudad_nombre": ciudad["nombre"],
                    "fuente": "google_places",
                    "google_place_id": p.get("place_id"),
                    "direccion": p.get("vicinity", ""),
                }
            )

        if rows:
            supabase.table("parqueaderos_existentes").upsert(
                rows, on_conflict="google_place_id"
            ).execute()
            total += len(rows)

        time.sleep(RATE_LIMIT_S)

    return total


def run():
    """Main entry point."""
    print("=" * 60)
    print("02 - Google Places scraper")
    print("=" * 60)

    # Fetch seeded cities
    ciudades_resp = supabase.table("ciudades").select("*").execute()
    ciudades = ciudades_resp.data
    if not ciudades:
        print("  [WARN] No cities found. Run 01_ciudades_seed first.")
        return

    client = _get_gmaps_client()

    gen_count = _scrape_generators(client, ciudades)
    print(f"  Generators inserted/updated: {gen_count}")

    park_count = _scrape_parking(client, ciudades)
    print(f"  Parking lots inserted/updated: {park_count}\n")


if __name__ == "__main__":
    run()
