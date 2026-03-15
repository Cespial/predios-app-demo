"""
08 - Lean Google Places scraper (budget: <$10 USD total)

Uses only Nearby Search (no Place Details) to stay under budget.
Aforos estimated by type, not from Google ratings.
~64 API calls × $0.032 = ~$2.05
"""

import sys
import os
import time
import requests
from pathlib import Path

_PKG_ROOT = str(Path(__file__).resolve().parent.parent)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
os.chdir(_PKG_ROOT)

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

GOOGLE_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

# Cities with coordinates and radius
CIUDADES = {
    "Medellín": {"lat": 6.2442, "lng": -75.5812},
    "Cali": {"lat": 3.4516, "lng": -76.5319},
    "Bogotá": {"lat": 4.7110, "lng": -74.0721},
    "Barranquilla": {"lat": 10.9685, "lng": -74.7813},
}

# Generator types to search + default aforo estimates
TIPOS_BUSQUEDA = [
    {"query": "hospital", "tipo": "hospital", "aforo_default": 500},
    {"query": "clinica", "tipo": "clinica", "aforo_default": 250},
    {"query": "universidad", "tipo": "universidad", "aforo_default": 8000},
    {"query": "estadio", "tipo": "estadio", "aforo_default": 25000},
    {"query": "centro comercial", "tipo": "centro_comercial", "aforo_default": 10000},
    {"query": "estacion metro transmilenio MIO", "tipo": "metro", "aforo_default": 5000},
    {"query": "coliseo arena eventos", "tipo": "coliseo", "aforo_default": 5000},
]

PARKING_QUERIES = [
    {"query": "parqueadero", "tipo": "parking"},
    {"query": "estacionamiento parking", "tipo": "parking"},
]

RADIUS = 5000  # 5km from city center
api_calls = 0


def nearby_search(lat, lng, query, page_token=None):
    """Google Places Nearby Search (Text Search variant) — $0.032/call"""
    global api_calls
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": query,
        "location": f"{lat},{lng}",
        "radius": RADIUS,
        "key": GOOGLE_KEY,
        "language": "es",
    }
    if page_token:
        params = {"pagetoken": page_token, "key": GOOGLE_KEY}

    resp = requests.get(url, params=params, timeout=15)
    api_calls += 1
    data = resp.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        print(f"    API warning: {data.get('status')} — {data.get('error_message', '')[:80]}")

    results = data.get("results", [])
    next_token = data.get("next_page_token")
    return results, next_token


def run():
    global api_calls

    print("=" * 60)
    print("08 - Lean Google Places Scraper (<$10 budget)")
    print("=" * 60)

    if not GOOGLE_KEY:
        print("ERROR: GOOGLE_PLACES_API_KEY not set")
        return

    # Get city IDs
    ciudad_ids = {}
    for nombre in CIUDADES:
        result = sb.table("ciudades").select("id").ilike("nombre", f"%{nombre[:4]}%").execute()
        if result.data:
            ciudad_ids[nombre] = result.data[0]["id"]
            print(f"  {nombre}: {ciudad_ids[nombre]}")
        else:
            print(f"  WARNING: {nombre} not found in DB")

    total_gen = 0
    total_park = 0

    # === GENERATORS ===
    print(f"\n--- Scraping generators ---")
    for ciudad, coords in CIUDADES.items():
        if ciudad not in ciudad_ids:
            continue
        cid = ciudad_ids[ciudad]

        for tipo_info in TIPOS_BUSQUEDA:
            query = f"{tipo_info['query']} {ciudad} Colombia"
            print(f"  [{ciudad}] {tipo_info['tipo']}...", end=" ")

            results, next_token = nearby_search(coords["lat"], coords["lng"], query)

            # Get page 2 if available
            if next_token:
                time.sleep(2)  # Google requires delay before using page token
                results2, _ = nearby_search(0, 0, "", page_token=next_token)
                results.extend(results2)

            inserted = 0
            for r in results:
                place_id = r.get("place_id", "")
                name = r.get("name", "")
                loc = r.get("geometry", {}).get("location", {})
                lat = loc.get("lat")
                lng = loc.get("lng")

                if not lat or not lng or not name:
                    continue

                # Estimate aforo from user_ratings_total (rough proxy)
                ratings = r.get("user_ratings_total", 0)
                aforo = max(
                    tipo_info["aforo_default"],
                    ratings * 5  # Each rating ≈ 5 visitors
                )

                try:
                    sb.table("generadores_demanda").upsert({
                        "ciudad_id": cid,
                        "nombre": name[:200],
                        "tipo": tipo_info["tipo"],
                        "aforo": aforo,
                        "google_place_id": place_id,
                        "metadata": {
                            "address": r.get("formatted_address", ""),
                            "rating": r.get("rating"),
                            "user_ratings_total": ratings,
                            "source": "google_places_lean",
                        },
                    }, on_conflict="google_place_id").execute()
                    inserted += 1
                except Exception as e:
                    # If no unique constraint on google_place_id, insert normally
                    try:
                        # Check if already exists
                        existing = sb.table("generadores_demanda").select("id").eq("google_place_id", place_id).execute()
                        if not existing.data:
                            sb.table("generadores_demanda").insert({
                                "ciudad_id": cid,
                                "nombre": name[:200],
                                "tipo": tipo_info["tipo"],
                                "aforo": aforo,
                                "google_place_id": place_id,
                                "metadata": {
                                    "address": r.get("formatted_address", ""),
                                    "rating": r.get("rating"),
                                    "user_ratings_total": ratings,
                                    "source": "google_places_lean",
                                },
                            }).execute()
                            inserted += 1
                    except Exception:
                        pass

            total_gen += inserted
            print(f"{inserted} inserted ({len(results)} found)")
            time.sleep(0.2)

    # === PARKING ===
    print(f"\n--- Scraping parking ---")
    for ciudad, coords in CIUDADES.items():
        if ciudad not in ciudad_ids:
            continue
        cid = ciudad_ids[ciudad]

        for pq in PARKING_QUERIES:
            query = f"{pq['query']} {ciudad} Colombia"
            print(f"  [{ciudad}] {pq['query']}...", end=" ")

            results, _ = nearby_search(coords["lat"], coords["lng"], query)

            inserted = 0
            for r in results:
                place_id = r.get("place_id", "")
                name = r.get("name", "")
                loc = r.get("geometry", {}).get("location", {})
                lat = loc.get("lat")
                lng = loc.get("lng")

                if not lat or not lng or not name:
                    continue

                # Estimate capacity from ratings
                ratings = r.get("user_ratings_total", 0)
                capacity = max(50, ratings // 2)  # Rough estimate

                try:
                    existing = sb.table("parqueaderos_existentes").select("id").eq("google_place_id", place_id).execute()
                    if not existing.data:
                        sb.table("parqueaderos_existentes").insert({
                            "ciudad_id": cid,
                            "nombre": name[:200],
                            "capacidad": capacity,
                            "google_place_id": place_id,
                            "metadata": {
                                "address": r.get("formatted_address", ""),
                                "rating": r.get("rating"),
                                "source": "google_places_lean",
                            },
                        }).execute()
                        inserted += 1
                except Exception:
                    pass

            total_park += inserted
            print(f"{inserted} inserted ({len(results)} found)")
            time.sleep(0.2)

    # === LINK predios to new generators ===
    print(f"\n--- Linking predios to generators ---")
    from packages.etl.utils.supabase_client import supabase as sb2
    # Use raw SQL via Supabase RPC would be ideal, but let's just report
    print(f"  (Run SQL: INSERT INTO predios_generadores ... ST_DWithin)")

    cost = api_calls * 0.032
    print(f"\n{'='*60}")
    print(f"  RESULTS:")
    print(f"    API calls: {api_calls}")
    print(f"    Estimated cost: ${cost:.2f} USD")
    print(f"    Generators inserted: {total_gen}")
    print(f"    Parking inserted: {total_park}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    run()
