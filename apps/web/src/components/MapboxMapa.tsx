"use client";

import { useRef, useEffect, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxMapaProps {
  lat: number;
  lng: number;
  zoom?: number;
  onPredioClick?: (predioId: string) => void;
  prediosGeoJSON?: GeoJSON.FeatureCollection | null;
  generadoresGeoJSON?: GeoJSON.FeatureCollection | null;
  parqueaderosGeoJSON?: GeoJSON.FeatureCollection | null;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export function MapboxMapa({
  lat,
  lng,
  zoom = 13,
  onPredioClick,
  prediosGeoJSON,
  generadoresGeoJSON,
  parqueaderosGeoJSON,
}: MapboxMapaProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);

  const onPredioClickRef = useRef(onPredioClick);
  onPredioClickRef.current = onPredioClick;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new center when lat/lng change
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({ center: [lng, lat], zoom: 13, duration: 1500 });
  }, [lat, lng]);

  // Helper to set or update a source
  const setSourceData = useCallback(
    (sourceId: string, data: GeoJSON.FeatureCollection) => {
      const m = map.current;
      if (!m) return;

      const source = m.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(data);
      }
    },
    []
  );

  // Add layers on map load
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const handleLoad = () => {
      // --- Predios layer ---
      m.addSource("predios", {
        type: "geojson",
        data: prediosGeoJSON ?? { type: "FeatureCollection", features: [] },
      });

      m.addLayer({
        id: "predios-fill",
        type: "fill",
        source: "predios",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "score_total"], 0],
            0,
            "#ef4444",
            50,
            "#eab308",
            100,
            "#10b981",
          ],
          "fill-opacity": 0.6,
        },
      });

      m.addLayer({
        id: "predios-outline",
        type: "line",
        source: "predios",
        paint: {
          "line-color": "#a1a1aa",
          "line-width": 1,
        },
      });

      // --- Generadores layer ---
      m.addSource("generadores", {
        type: "geojson",
        data: generadoresGeoJSON ?? { type: "FeatureCollection", features: [] },
      });

      m.addLayer({
        id: "generadores-circle",
        type: "circle",
        source: "generadores",
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "match",
            ["get", "tipo"],
            "estadio",
            "#fbbf24",
            "hospital",
            "#f87171",
            "clinica",
            "#fda4af",
            "universidad",
            "#60a5fa",
            "metro",
            "#22d3ee",
            "centro_comercial",
            "#c084fc",
            "coliseo",
            "#fb923c",
            "#a1a1aa",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#18181b",
        },
      });

      // --- Parqueaderos layer ---
      m.addSource("parqueaderos", {
        type: "geojson",
        data: parqueaderosGeoJSON ?? { type: "FeatureCollection", features: [] },
      });

      m.addLayer({
        id: "parqueaderos-circle",
        type: "circle",
        source: "parqueaderos",
        paint: {
          "circle-radius": 4,
          "circle-color": "#71717a",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#27272a",
        },
      });

      // --- Hover on predios ---
      m.on("mouseenter", "predios-fill", (e) => {
        m.getCanvas().style.cursor = "pointer";
        if (e.features && e.features.length > 0 && popup.current) {
          const feature = e.features[0];
          const props = feature.properties ?? {};
          const coords = e.lngLat;

          popup.current
            .setLngLat(coords)
            .setHTML(
              `<div style="color:#fafafa;font-size:13px;font-weight:600;">${props.nombre ?? "Predio"}</div>` +
                `<div style="color:#a1a1aa;font-size:11px;">Score: ${props.score_total ?? "-"}</div>`
            )
            .addTo(m);
        }
      });

      m.on("mouseleave", "predios-fill", () => {
        m.getCanvas().style.cursor = "";
        popup.current?.remove();
      });

      // --- Click on predios ---
      m.on("click", "predios-fill", (e) => {
        if (e.features && e.features.length > 0) {
          const predioId = e.features[0].properties?.id;
          if (predioId && onPredioClickRef.current) {
            onPredioClickRef.current(predioId);
          }
        }
      });
    };

    if (m.loaded()) {
      handleLoad();
    } else {
      m.on("load", handleLoad);
    }

    return () => {
      m.off("load", handleLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update source data when GeoJSON props change
  useEffect(() => {
    if (prediosGeoJSON) setSourceData("predios", prediosGeoJSON);
  }, [prediosGeoJSON, setSourceData]);

  useEffect(() => {
    if (generadoresGeoJSON) setSourceData("generadores", generadoresGeoJSON);
  }, [generadoresGeoJSON, setSourceData]);

  useEffect(() => {
    if (parqueaderosGeoJSON) setSourceData("parqueaderos", parqueaderosGeoJSON);
  }, [parqueaderosGeoJSON, setSourceData]);

  return (
    <div ref={mapContainer} className="w-full h-full min-h-[400px] rounded-lg" />
  );
}
