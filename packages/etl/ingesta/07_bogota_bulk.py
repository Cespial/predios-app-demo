"""
07 - Bulk insert Bogotá predios WITHOUT geocoding (fast approach).

Uses locality centroids as approximate coordinates.
This ingests hundreds of real predios in seconds instead of minutes.
Geocoding can be done later as a batch job.
"""

import sys
import os
import math
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
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DATASET_ID = "sbzv-2tci"
BASE_URL = f"https://www.datos.gov.co/resource/{DATASET_ID}.json"

# Approximate centroids for Bogotá localities
LOCALIDAD_COORDS = {
    "USAQUEN": (4.7084, -74.0325),
    "CHAPINERO": (4.6486, -74.0628),
    "SANTA FE": (4.5958, -74.0752),
    "SAN CRISTOBAL": (4.5537, -74.0812),
    "USME": (4.4814, -74.1263),
    "TUNJUELITO": (4.5728, -74.1328),
    "BOSA": (4.6178, -74.1857),
    "KENNEDY": (4.6297, -74.1522),
    "FONTIBON": (4.6759, -74.1350),
    "ENGATIVA": (4.7048, -74.1100),
    "SUBA": (4.7433, -74.0837),
    "BARRIOS UNIDOS": (4.6672, -74.0777),
    "TEUSAQUILLO": (4.6423, -74.0924),
    "MARTIRES": (4.6058, -74.0893),
    "ANTONIO NARIÑO": (4.5866, -74.1003),
    "PUENTE ARANDA": (4.6183, -74.1133),
    "CANDELARIA": (4.5956, -74.0732),
    "RAFAEL URIBE URIBE": (4.5670, -74.1115),
    "CIUDAD BOLIVAR": (4.5358, -74.1577),
    "SUMAPAZ": (4.2300, -74.2000),
}


def run():
    print("=" * 60)
    print("07 - Bulk inserting Bogotá predios (no geocoding)")
    print("=" * 60)

    # Get Bogotá city ID
    result = supabase.table("ciudades").select("id").ilike("nombre", "%Bogot%").execute()
    if not result.data:
        print("ERROR: Ciudad Bogotá not found.")
        return
    bogota_id = result.data[0]["id"]

    # Fetch candidates: ZONAS RECREATIVAS, EQUIPAMIENTO, TERRENOS with area >= 500
    usos = "ZONAS RECREATIVAS,ZONAS DE EQUIPAMENTO COMUNAL,TERRENOS"
    all_records = []
    offset = 0
    batch = 1000

    while True:
        params = {
            "$where": f"uso_nivel_1 IN('{usos.split(',')[0]}','{usos.split(',')[1]}','{usos.split(',')[2]}') AND area_certificada IS NOT NULL AND area_certificada NOT IN('n/d','n/a','')",
            "$select": "rupi,uso_nivel_1,uso_nivel_2,uso_especifico,nomenclatura_ubicacion,localidades,barrios,area_certificada",
            "$limit": batch,
            "$offset": offset,
            "$order": "area_certificada DESC",
        }
        resp = requests.get(BASE_URL, params=params, timeout=30)
        data = resp.json()
        if not data or isinstance(data, dict):
            break
        all_records.extend(data)
        print(f"  Fetched {len(all_records)} records...")
        offset += batch
        if len(data) < batch:
            break
        time.sleep(0.3)

    print(f"  Total raw: {len(all_records)}")

    # Filter by area >= 500m²
    candidates = []
    for r in all_records:
        try:
            area = float(r.get("area_certificada", 0))
        except (ValueError, TypeError):
            continue
        if area < 500:
            continue
        candidates.append({**r, "_area": area})

    print(f"  After area filter (>=500m²): {len(candidates)}")

    # Prepare bulk insert
    rows_to_insert = []
    for c in candidates:
        localidad = (c.get("localidades") or "").upper().strip()
        coords = LOCALIDAD_COORDS.get(localidad)
        if not coords:
            # Try partial match
            for key, val in LOCALIDAD_COORDS.items():
                if key in localidad or localidad in key:
                    coords = val
                    break
        if not coords:
            coords = (4.6500, -74.0800)  # Bogotá center fallback

        # Add small random offset per predio to spread markers
        import hashlib
        hash_val = int(hashlib.md5(c.get("rupi", "").encode()).hexdigest()[:8], 16)
        lat_offset = ((hash_val % 1000) - 500) / 100000  # ±0.005 degrees
        lng_offset = (((hash_val >> 10) % 1000) - 500) / 100000
        lat = coords[0] + lat_offset
        lng = coords[1] + lng_offset

        uso = c.get("uso_especifico") or c.get("uso_nivel_2") or c.get("uso_nivel_1") or ""
        barrio = c.get("barrios") or ""
        nombre = f"{uso[:80]} — {barrio} ({c['rupi']})"

        rows_to_insert.append({
            "ciudad_id": bogota_id,
            "nombre": nombre[:200],
            "direccion": f"{c.get('nomenclatura_ubicacion', '')}, {localidad}, Bogotá",
            "area_m2": c["_area"],
            "propietario": "Alcaldía de Bogotá",
            "tipo_propietario": "publico",
            "uso_actual": uso[:200],
            "tiene_restriccion_bic": False,
            "tiene_restriccion_forestal": False,
            "fuente": f"datos.gov.co/{DATASET_ID}",
            "es_demo": False,
            "metadata": {
                "rupi": c.get("rupi"),
                "uso_nivel_1": c.get("uso_nivel_1"),
                "localidad": localidad,
                "barrio": barrio,
            },
        })

    print(f"  Rows ready for insert: {len(rows_to_insert)}")

    # Insert using SQL for PostGIS geometry
    inserted = 0
    errors = 0
    batch_size = 50

    for i in range(0, len(rows_to_insert), batch_size):
        batch_rows = rows_to_insert[i:i+batch_size]

        for row in batch_rows:
            try:
                supabase.table("predios").insert(row).execute()
                inserted += 1
            except Exception as e:
                err_msg = str(e)
                if "duplicate" in err_msg.lower() or "unique" in err_msg.lower():
                    pass  # Skip duplicates silently
                else:
                    errors += 1
                    if errors <= 5:
                        print(f"  ERROR: {err_msg[:100]}")

        if (i + batch_size) % 200 == 0:
            print(f"  Inserted {inserted} / {len(rows_to_insert)}...")

    # Now update centroids using SQL
    print(f"\n  Setting centroids via locality coordinates...")
    for localidad, (lat, lng) in LOCALIDAD_COORDS.items():
        try:
            supabase.rpc("update_centroids_by_locality", {
                "p_ciudad_id": bogota_id,
                "p_localidad": localidad,
                "p_lat": lat,
                "p_lng": lng,
            }).execute()
        except Exception:
            pass  # Function may not exist yet

    print(f"\n  RESULTS:")
    print(f"    Inserted: {inserted}")
    print(f"    Errors: {errors}")
    print(f"    Total predios reales en Bogotá: {inserted}\n")


if __name__ == "__main__":
    run()
