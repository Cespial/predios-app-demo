"""
05 - Calculate composite feasibility scores for each predio.

Four sub-scores weighted to a final score_general (0-100):

  SCORE_AREA          (20%)  - Larger parcels are more feasible
  SCORE_ACCESIBILIDAD (25%)  - More nearby roads = better access
  SCORE_DEMANDA       (40%)  - Higher parking deficit = more opportunity
  SCORE_RESTRICCIONES (15%)  - Fewer legal restrictions = easier permitting

Also populates the predios_generadores junction table linking each predio
to its nearby demand generators.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

_PKG_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

from packages.etl.utils.supabase_client import supabase

# Weights
W_AREA = 0.20
W_ACCESIBILIDAD = 0.25
W_DEMANDA = 0.40
W_RESTRICCIONES = 0.15

# Radius for proximity calculations (meters)
PROXIMITY_RADIUS_M = 300  # for roads
DEMAND_RADIUS_M = 1000  # for generators and parking


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in meters between two lat/lng points."""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ------------------------------------------------------------------
# Sub-score functions
# ------------------------------------------------------------------

def score_area(area_m2: float) -> float:
    """Score based on parcel area."""
    if area_m2 < 2000:
        return 20.0
    elif area_m2 < 4000:
        return 50.0
    elif area_m2 < 6000:
        return 75.0
    else:
        return 100.0


def score_accesibilidad(
    predio_lat: float,
    predio_lng: float,
    vias: List[Dict[str, Any]],
) -> float:
    """Score based on count of roads within PROXIMITY_RADIUS_M."""
    count = sum(
        1
        for v in vias
        if _haversine(predio_lat, predio_lng, v["lat"], v["lng"]) <= PROXIMITY_RADIUS_M
    )
    if count == 0:
        return 20.0
    elif count == 1:
        return 50.0
    else:
        return 80.0


def _deficit_parqueaderos(
    predio_lat: float,
    predio_lng: float,
    generadores: List[Dict[str, Any]],
    parqueaderos: List[Dict[str, Any]],
) -> float:
    """
    Estimate the parking deficit around a predio.

    deficit = sum(aforo_estimado * factor) for nearby generators
              - sum(capacidad) for nearby existing parking

    A positive deficit means there's unmet demand.
    """
    DEMAND_FACTOR = 0.15  # ~15% of generator capacity needs parking

    nearby_gen = [
        g
        for g in generadores
        if _haversine(predio_lat, predio_lng, g["lat"], g["lng"]) <= DEMAND_RADIUS_M
    ]
    demand = sum(
        (g.get("aforo_estimado") or 0) * DEMAND_FACTOR for g in nearby_gen
    )

    nearby_park = [
        p
        for p in parqueaderos
        if _haversine(predio_lat, predio_lng, p["lat"], p["lng"]) <= DEMAND_RADIUS_M
    ]
    supply = sum(p.get("capacidad") or 50 for p in nearby_park)  # default 50 if unknown

    return max(demand - supply, 0)


def score_demanda(
    predio_lat: float,
    predio_lng: float,
    generadores: List[Dict[str, Any]],
    parqueaderos: List[Dict[str, Any]],
) -> float:
    """Score based on parking deficit in the vicinity."""
    deficit = _deficit_parqueaderos(
        predio_lat, predio_lng, generadores, parqueaderos
    )
    # Map deficit to 0-100 score
    if deficit <= 0:
        return 10.0
    elif deficit < 100:
        return 30.0
    elif deficit < 300:
        return 50.0
    elif deficit < 600:
        return 70.0
    elif deficit < 1000:
        return 85.0
    else:
        return 100.0


def score_restricciones(restricciones: Optional[List[str]]) -> float:
    """
    Score based on legal/environmental restrictions.
    Starts at 100 and subtracts penalties.
    """
    if not restricciones:
        return 100.0

    penalties = {
        "BIC": 30,       # Bien de Interes Cultural
        "etnico": 50,    # Territorio etnico
        "forestal": 40,  # Reserva forestal
    }

    score = 100.0
    for r in restricciones:
        r_lower = r.lower().strip()
        for key, penalty in penalties.items():
            if key in r_lower:
                score -= penalty

    return max(score, 0.0)


# ------------------------------------------------------------------
# Generador linkage
# ------------------------------------------------------------------

def _link_generadores(
    predio_id: str,
    predio_lat: float,
    predio_lng: float,
    generadores: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Find generators within DEMAND_RADIUS_M and insert into
    predios_generadores junction table.
    Returns the list of nearby generators with distance.
    """
    nearby = []
    for g in generadores:
        dist = _haversine(predio_lat, predio_lng, g["lat"], g["lng"])
        if dist <= DEMAND_RADIUS_M:
            nearby.append({**g, "distancia_m": round(dist)})

    if nearby:
        rows = [
            {
                "predio_id": predio_id,
                "generador_id": g.get("id"),
                "distancia_m": g["distancia_m"],
            }
            for g in nearby
            if g.get("id")
        ]
        if rows:
            supabase.table("predios_generadores").upsert(
                rows, on_conflict="predio_id,generador_id"
            ).execute()

    return nearby


# ------------------------------------------------------------------
# Main scorer
# ------------------------------------------------------------------

def run():
    """Calculate and persist scores for all predios."""
    print("=" * 60)
    print("05 - Scoring predios")
    print("=" * 60)

    # Load all needed data
    predios = supabase.table("predios").select("*").execute().data or []
    generadores = supabase.table("generadores_demanda").select("*").execute().data or []
    parqueaderos = supabase.table("parqueaderos_existentes").select("*").execute().data or []
    vias = supabase.table("vias_acceso").select("*").execute().data or []

    if not predios:
        print("  [WARN] No predios found. Run 04_predios_publicos first.")
        return

    print(f"  Loaded: {len(predios)} predios, {len(generadores)} generators, "
          f"{len(parqueaderos)} parking lots, {len(vias)} roads")

    for predio in predios:
        pid = predio.get("id")
        nombre = predio.get("nombre", "?")
        lat = predio.get("lat", 0)
        lng = predio.get("lng", 0)
        area = predio.get("area_m2", 0)
        restricciones = predio.get("restricciones") or []

        # Filter data to same city for efficiency
        ciudad = predio.get("ciudad_nombre", "")
        city_gen = [g for g in generadores if g.get("ciudad_nombre") == ciudad]
        city_park = [p for p in parqueaderos if p.get("ciudad_nombre") == ciudad]
        city_vias = [v for v in vias if v.get("ciudad_nombre") == ciudad]

        # Compute sub-scores
        s_area = score_area(area)
        s_acc = score_accesibilidad(lat, lng, city_vias)
        s_dem = score_demanda(lat, lng, city_gen, city_park)
        s_rest = score_restricciones(restricciones)

        # Weighted general score
        s_general = round(
            s_area * W_AREA
            + s_acc * W_ACCESIBILIDAD
            + s_dem * W_DEMANDA
            + s_rest * W_RESTRICCIONES,
            1,
        )

        # Update predio
        supabase.table("predios").update(
            {
                "score_area": round(s_area, 1),
                "score_accesibilidad": round(s_acc, 1),
                "score_demanda": round(s_dem, 1),
                "score_restricciones": round(s_rest, 1),
                "score_general": s_general,
            }
        ).eq("id", pid).execute()

        # Link generators
        nearby_gen = _link_generadores(pid, lat, lng, city_gen)

        print(
            f"  [{nombre}] area={s_area} acc={s_acc} dem={s_dem} "
            f"rest={s_rest} => GENERAL={s_general}  "
            f"(generators nearby: {len(nearby_gen)})"
        )

    print(f"  Scoring complete for {len(predios)} predios.\n")


if __name__ == "__main__":
    run()
