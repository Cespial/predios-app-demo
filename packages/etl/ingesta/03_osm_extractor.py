"""
03 - Extract parking, road, and institutional land-use data from OpenStreetMap
     via the Overpass API (overpy library) for each seeded city.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Any, Dict, List

_PKG_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

import overpy
from tqdm import tqdm

from packages.etl.utils.supabase_client import supabase

RADIUS_M = 5000
OVERPASS_RATE_LIMIT_S = 1.0  # Be polite to the Overpass API


def _build_parking_query(lat: float, lng: float, radius: int = RADIUS_M) -> str:
    """Overpass QL for amenity=parking nodes and ways."""
    return f"""
    [out:json][timeout:60];
    (
      node["amenity"="parking"](around:{radius},{lat},{lng});
      way["amenity"="parking"](around:{radius},{lat},{lng});
    );
    out center tags;
    """


def _build_roads_query(lat: float, lng: float, radius: int = RADIUS_M) -> str:
    """Overpass QL for primary/secondary/tertiary roads."""
    return f"""
    [out:json][timeout:60];
    (
      way["highway"~"^(primary|secondary|tertiary)$"](around:{radius},{lat},{lng});
    );
    out center tags;
    """


def _build_institutional_query(lat: float, lng: float, radius: int = RADIUS_M) -> str:
    """Overpass QL for institutional land use."""
    return f"""
    [out:json][timeout:60];
    (
      way["landuse"="institutional"](around:{radius},{lat},{lng});
      relation["landuse"="institutional"](around:{radius},{lat},{lng});
    );
    out center tags;
    """


def _extract_parking(
    api: overpy.Overpass,
    ciudades: List[Dict[str, Any]],
) -> int:
    """
    Query OSM parking nodes/ways and upsert to parqueaderos_existentes,
    avoiding duplicates with Google Places entries.
    """
    total = 0

    for ciudad in tqdm(ciudades, desc="OSM parking"):
        lat, lng = ciudad["lat"], ciudad["lng"]
        query = _build_parking_query(lat, lng)

        try:
            result = api.query(query)
        except overpy.exception.OverpassTooManyRequests:
            print(f"  [WARN] Overpass rate limit hit for {ciudad['nombre']}, waiting 30s")
            time.sleep(30)
            result = api.query(query)

        rows: List[Dict[str, Any]] = []

        # Nodes
        for node in result.nodes:
            name = node.tags.get("name", "Parqueadero OSM")
            capacity_str = node.tags.get("capacity")
            capacity = int(capacity_str) if capacity_str and capacity_str.isdigit() else None
            rows.append(
                {
                    "nombre": name,
                    "lat": float(node.lat),
                    "lng": float(node.lon),
                    "capacidad": capacity,
                    "ciudad_nombre": ciudad["nombre"],
                    "fuente": "osm",
                    "osm_id": str(node.id),
                    "direccion": node.tags.get("addr:street", ""),
                }
            )

        # Ways (use center_lat/center_lon)
        for way in result.ways:
            name = way.tags.get("name", "Parqueadero OSM")
            capacity_str = way.tags.get("capacity")
            capacity = int(capacity_str) if capacity_str and capacity_str.isdigit() else None
            # overpy populates center_lat/center_lon when using "out center"
            c_lat = getattr(way, "center_lat", None)
            c_lon = getattr(way, "center_lon", None)
            if c_lat is None or c_lon is None:
                continue
            rows.append(
                {
                    "nombre": name,
                    "lat": float(c_lat),
                    "lng": float(c_lon),
                    "capacidad": capacity,
                    "ciudad_nombre": ciudad["nombre"],
                    "fuente": "osm",
                    "osm_id": str(way.id),
                    "direccion": way.tags.get("addr:street", ""),
                }
            )

        if rows:
            # Upsert on osm_id to avoid duplicates within OSM;
            # google_place_id will be NULL so no collision with Google rows.
            supabase.table("parqueaderos_existentes").upsert(
                rows, on_conflict="osm_id"
            ).execute()
            total += len(rows)

        time.sleep(OVERPASS_RATE_LIMIT_S)

    return total


def _extract_roads(
    api: overpy.Overpass,
    ciudades: List[Dict[str, Any]],
) -> int:
    """
    Extract primary/secondary/tertiary roads and store in vias_acceso table.
    """
    total = 0

    for ciudad in tqdm(ciudades, desc="OSM roads"):
        lat, lng = ciudad["lat"], ciudad["lng"]
        query = _build_roads_query(lat, lng)

        try:
            result = api.query(query)
        except overpy.exception.OverpassTooManyRequests:
            print(f"  [WARN] Overpass rate limit for {ciudad['nombre']}, waiting 30s")
            time.sleep(30)
            result = api.query(query)

        rows: List[Dict[str, Any]] = []
        for way in result.ways:
            c_lat = getattr(way, "center_lat", None)
            c_lon = getattr(way, "center_lon", None)
            if c_lat is None or c_lon is None:
                continue
            rows.append(
                {
                    "nombre": way.tags.get("name", "Via sin nombre"),
                    "tipo": way.tags.get("highway", "unknown"),
                    "lat": float(c_lat),
                    "lng": float(c_lon),
                    "ciudad_nombre": ciudad["nombre"],
                    "osm_id": str(way.id),
                }
            )

        if rows:
            supabase.table("vias_acceso").upsert(
                rows, on_conflict="osm_id"
            ).execute()
            total += len(rows)

        time.sleep(OVERPASS_RATE_LIMIT_S)

    return total


def _extract_institutional(
    api: overpy.Overpass,
    ciudades: List[Dict[str, Any]],
) -> int:
    """Extract institutional land-use polygons."""
    total = 0

    for ciudad in tqdm(ciudades, desc="OSM institutional"):
        lat, lng = ciudad["lat"], ciudad["lng"]
        query = _build_institutional_query(lat, lng)

        try:
            result = api.query(query)
        except overpy.exception.OverpassTooManyRequests:
            time.sleep(30)
            result = api.query(query)

        rows: List[Dict[str, Any]] = []
        for way in result.ways:
            c_lat = getattr(way, "center_lat", None)
            c_lon = getattr(way, "center_lon", None)
            if c_lat is None or c_lon is None:
                continue
            rows.append(
                {
                    "nombre": way.tags.get("name", "Uso institucional"),
                    "lat": float(c_lat),
                    "lng": float(c_lon),
                    "ciudad_nombre": ciudad["nombre"],
                    "osm_id": str(way.id),
                }
            )

        if rows:
            supabase.table("usos_institucionales").upsert(
                rows, on_conflict="osm_id"
            ).execute()
            total += len(rows)

        time.sleep(OVERPASS_RATE_LIMIT_S)

    return total


def run():
    """Main entry point."""
    print("=" * 60)
    print("03 - OpenStreetMap extractor")
    print("=" * 60)

    ciudades_resp = supabase.table("ciudades").select("*").execute()
    ciudades = ciudades_resp.data
    if not ciudades:
        print("  [WARN] No cities found. Run 01_ciudades_seed first.")
        return

    api = overpy.Overpass()

    park_count = _extract_parking(api, ciudades)
    print(f"  OSM parking lots: {park_count}")

    road_count = _extract_roads(api, ciudades)
    print(f"  OSM roads: {road_count}")

    inst_count = _extract_institutional(api, ciudades)
    print(f"  OSM institutional: {inst_count}\n")


if __name__ == "__main__":
    run()
