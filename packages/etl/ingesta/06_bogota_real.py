"""
06 - Ingest REAL public land parcels from Bogotá (datos.gov.co sbzv-2tci)

This replaces the demo data with actual government property inventory.
Dataset: Inventario de parques urbanos — 67,592 records
We filter to ~10,500 candidates (recreational zones + communal equipment + terrenos)
"""

import sys
import os
import time
import math
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
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Google Geocoding API
GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

DATASET_ID = "sbzv-2tci"
BASE_URL = f"https://www.datos.gov.co/resource/{DATASET_ID}.json"

# Filter: only recreational, equipment, terrain zones (not roads or rivers)
VALID_USOS = [
    "ZONAS RECREATIVAS",
    "ZONAS DE EQUIPAMENTO COMUNAL",
    "TERRENOS",
    "OTROS",
]

def fetch_predios_bogota(limit=1000, offset=0):
    """Fetch a batch of predios from datos.gov.co"""
    usos = ",".join(f"'{u}'" for u in VALID_USOS)
    params = {
        "$where": f"uso_nivel_1 IN({usos})",
        "$select": "rupi,uso_nivel_1,uso_nivel_2,uso_especifico,nomenclatura_ubicacion,localidades,barrios,area_certificada,destinacion,estado",
        "$limit": limit,
        "$offset": offset,
        "$order": "rupi",
    }
    resp = requests.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def geocode_address(address, city="Bogotá, Colombia"):
    """Geocode a Colombian address using Google Geocoding API"""
    if not GOOGLE_API_KEY:
        return None, None

    full_address = f"{address}, {city}"
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": full_address,
        "key": GOOGLE_API_KEY,
        "components": "country:CO",
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
        if data.get("status") == "OK" and data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return loc["lat"], loc["lng"]
    except Exception:
        pass
    return None, None


def estimate_polygon_wkt(lat, lng, area_m2):
    """Create a simple square polygon from a center point and area"""
    side = math.sqrt(area_m2) / 2  # half-side in meters
    # Approximate degrees from meters
    dlat = side / 110540  # ~110,540 meters per degree latitude
    dlng = side / (111320 * math.cos(math.radians(lat)))  # adjusted for latitude

    return (
        f"POLYGON(("
        f"{lng - dlng} {lat - dlat}, "
        f"{lng + dlng} {lat - dlat}, "
        f"{lng + dlng} {lat + dlat}, "
        f"{lng - dlng} {lat + dlat}, "
        f"{lng - dlng} {lat - dlat}"
        f"))"
    )


def run():
    print("=" * 60)
    print("06 - Ingesting REAL Bogotá predios from datos.gov.co")
    print(f"     Dataset: {DATASET_ID}")
    print("=" * 60)

    # Get Bogotá city ID
    result = supabase.table("ciudades").select("id").ilike("nombre", "%Bogot%").execute()
    if not result.data:
        print("ERROR: Ciudad Bogotá not found. Run 01_ciudades_seed.py first.")
        return
    bogota_id = result.data[0]["id"]
    print(f"  Bogotá ID: {bogota_id}")

    # Fetch all candidate predios in batches
    all_predios = []
    offset = 0
    batch_size = 1000

    while True:
        print(f"  Fetching batch at offset {offset}...")
        batch = fetch_predios_bogota(limit=batch_size, offset=offset)
        if not batch:
            break
        all_predios.extend(batch)
        offset += batch_size
        if len(batch) < batch_size:
            break
        time.sleep(0.5)  # Rate limit

    print(f"  Total raw records: {len(all_predios)}")

    # Filter: must have area > 500m² and valid address
    candidates = []
    for p in all_predios:
        area_str = p.get("area_certificada", "")
        if not area_str or area_str in ("n/d", "n/a", ""):
            continue
        try:
            area = float(area_str)
        except (ValueError, TypeError):
            continue
        if area < 500:
            continue

        address = p.get("nomenclatura_ubicacion", "")
        if not address or len(address) < 5:
            continue

        candidates.append({
            "rupi": p.get("rupi", ""),
            "uso_nivel_1": p.get("uso_nivel_1", ""),
            "uso_nivel_2": p.get("uso_nivel_2", ""),
            "uso_especifico": p.get("uso_especifico", ""),
            "direccion": address,
            "localidad": p.get("localidades", ""),
            "barrio": p.get("barrios", ""),
            "area_m2": area,
            "destinacion": p.get("destinacion", ""),
        })

    print(f"  Candidates after filtering (area >= 500m²): {len(candidates)}")

    # Geocode and insert (limit to first 200 for API cost control)
    MAX_GEOCODE = 200
    inserted = 0
    skipped = 0
    errors = 0

    for i, c in enumerate(candidates[:MAX_GEOCODE]):
        # Generate a descriptive name
        uso = c["uso_especifico"] or c["uso_nivel_2"] or c["uso_nivel_1"]
        nombre = f"{uso} — {c['barrio'] or c['localidad']} ({c['rupi']})"
        nombre = nombre[:200]

        # Check if already exists
        existing = (
            supabase.table("predios")
            .select("id")
            .eq("ciudad_id", bogota_id)
            .ilike("nombre", f"%{c['rupi']}%")
            .execute()
        )
        if existing.data:
            skipped += 1
            continue

        # Geocode
        lat, lng = geocode_address(c["direccion"])
        if not lat or not lng:
            # Skip if can't geocode — don't waste API calls on bad addresses
            skipped += 1
            continue

        # Determine propietario based on uso
        propietario = "Alcaldía de Bogotá"
        if "EDUCATIVO" in (c["uso_especifico"] or "").upper():
            propietario = "Secretaría de Educación"
        elif "SALUD" in (c["uso_especifico"] or "").upper():
            propietario = "Secretaría de Salud"
        elif "HOSPITAL" in (c["uso_especifico"] or "").upper():
            propietario = "Red hospitalaria"

        # Determine restrictions
        tiene_bic = c["uso_nivel_1"] == "BIENES HISTORICOS Y CULTURALES"
        tiene_forestal = "RONDA" in (c["uso_nivel_1"] or "").upper()

        # Build WKT polygon
        geom_wkt = estimate_polygon_wkt(lat, lng, c["area_m2"])

        try:
            row = {
                "ciudad_id": bogota_id,
                "nombre": nombre,
                "direccion": f"{c['direccion']}, {c['localidad']}, Bogotá",
                "area_m2": c["area_m2"],
                "propietario": propietario,
                "tipo_propietario": "publico",
                "uso_actual": c["uso_especifico"] or c["uso_nivel_2"] or c["uso_nivel_1"],
                "tiene_restriccion_bic": tiene_bic,
                "tiene_restriccion_forestal": tiene_forestal,
                "fuente": f"datos.gov.co/{DATASET_ID}",
                "es_demo": False,
                "metadata": {
                    "rupi": c["rupi"],
                    "uso_nivel_1": c["uso_nivel_1"],
                    "localidad": c["localidad"],
                    "barrio": c["barrio"],
                    "destinacion": c["destinacion"],
                },
            }

            # Insert via SQL RPC for PostGIS geometry
            supabase.rpc("insert_predio_with_geom", {
                "p_data": row,
                "p_geom_wkt": geom_wkt,
                "p_lat": lat,
                "p_lng": lng,
            }).execute()
            inserted += 1

        except Exception as e:
            # Fallback: insert without geometry
            try:
                supabase.table("predios").insert(row).execute()
                inserted += 1
            except Exception as e2:
                errors += 1
                if errors <= 3:
                    print(f"  ERROR inserting {nombre[:50]}: {e2}")

        if (i + 1) % 20 == 0:
            print(f"  Progress: {i+1}/{min(len(candidates), MAX_GEOCODE)} (inserted: {inserted}, skipped: {skipped})")

        time.sleep(0.15)  # Google Geocoding rate limit

    print(f"\n  RESULTS:")
    print(f"    Inserted: {inserted}")
    print(f"    Skipped: {skipped}")
    print(f"    Errors: {errors}")
    print(f"    Total candidates available: {len(candidates)}")
    print(f"    (Geocoded first {MAX_GEOCODE} — increase MAX_GEOCODE for more)\n")


if __name__ == "__main__":
    run()
