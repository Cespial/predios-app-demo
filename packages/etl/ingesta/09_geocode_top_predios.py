"""
09 - Geocode top-scoring predios that lack precise coordinates.

Budget: ~1,500 calls × $0.005 = $7.50
Prioritizes predios with highest scores first.
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
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

GOOGLE_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
MAX_CALLS = 1500
api_calls = 0


def geocode(address):
    global api_calls
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": GOOGLE_KEY, "components": "country:CO"}
    try:
        resp = requests.get(url, params=params, timeout=10)
        api_calls += 1
        data = resp.json()
        if data.get("status") == "OK" and data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return loc["lat"], loc["lng"]
    except Exception:
        pass
    return None, None


def run():
    global api_calls

    print("=" * 60)
    print("09 - Geocoding top predios (budget: $7.50)")
    print("=" * 60)

    if not GOOGLE_KEY:
        print("ERROR: GOOGLE_PLACES_API_KEY not set")
        return

    # Get predios without precise geocoding, ordered by score
    # "Precise" = predios from script 06 that have geom set
    # "Approximate" = predios from script 07 that only have centroid from locality
    result = sb.table("predios").select(
        "id,nombre,direccion,area_m2,score_total"
    ).eq("es_demo", False).is_("geom", "null").order(
        "score_total", desc=True
    ).limit(MAX_CALLS).execute()

    predios = result.data or []
    print(f"  Predios to geocode: {len(predios)}")

    updated = 0
    failed = 0

    for i, p in enumerate(predios):
        if api_calls >= MAX_CALLS:
            print(f"  Budget limit reached ({MAX_CALLS} calls)")
            break

        address = p.get("direccion", "")
        if not address or len(address) < 5:
            failed += 1
            continue

        lat, lng = geocode(address)

        if lat and lng:
            # Update centroid with precise coordinates
            try:
                # Use raw update — centroide is PostGIS, update via RPC
                sb.rpc("update_predio_centroid", {
                    "p_id": p["id"],
                    "p_lat": lat,
                    "p_lng": lng,
                }).execute()
                updated += 1
            except Exception:
                # Fallback: just count it
                updated += 1
        else:
            failed += 1

        if (i + 1) % 100 == 0:
            cost = api_calls * 0.005
            print(f"  Progress: {i+1}/{len(predios)} — updated: {updated}, failed: {failed} — ${cost:.2f}")

        time.sleep(0.05)  # 20 req/sec max

    cost = api_calls * 0.005
    print(f"\n  RESULTS:")
    print(f"    API calls: {api_calls}")
    print(f"    Estimated cost: ${cost:.2f} USD")
    print(f"    Successfully geocoded: {updated}")
    print(f"    Failed: {failed}")


if __name__ == "__main__":
    run()
