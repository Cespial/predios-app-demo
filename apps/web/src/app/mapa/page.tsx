'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { APIProvider, Map as GoogleMap, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  MapPin,
  Building2,
  Car,
  AlertTriangle,
  Navigation,
  FileText,
  Loader2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Predio, Ciudad, MapaGeoJSON, PrediosResponse } from '@/types';

const fmt = new Intl.NumberFormat('es-CO');

const PROPIETARIOS = ['Alcaldía', 'Gobernación', 'Metro', 'INDER', 'Hospital'];

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

/* ── ScoreBar ── */
function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className={scoreColor(value)}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-700">
        <div
          className={`h-full rounded-full ${scoreBg(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/* ── PredioCard ── */
function PredioCard({
  predio,
  isSelected,
  onClick,
}: {
  predio: Predio;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-zinc-100 truncate">
            {predio.nombre}
          </h4>
          <p className="text-xs text-zinc-500 truncate mt-0.5">
            {predio.direccion}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {fmt.format(predio.area_m2)} m&sup2; &middot; {predio.propietario}
          </p>
        </div>
        <div
          className={`shrink-0 text-lg font-bold ${scoreColor(predio.score_total)}`}
        >
          {predio.score_total}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {[
          { l: 'Area', v: predio.score_area },
          { l: 'Acc.', v: predio.score_accesibilidad },
          { l: 'Dem.', v: predio.score_demanda },
          { l: 'Legal', v: predio.score_restricciones },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <div className="h-1 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className={`h-full ${scoreBg(s.v)}`}
                style={{ width: `${s.v}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500">{s.l}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

/* ── CiudadSelector ── */
function CiudadSelector({
  ciudades,
  ciudadActiva,
  onChange,
}: {
  ciudades: Ciudad[];
  ciudadActiva: Ciudad | null;
  onChange: (c: Ciudad) => void;
}) {
  return (
    <div className="p-3 border-b border-zinc-800">
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        Ciudad
      </label>
      <select
        value={ciudadActiva?.id || ''}
        onChange={(e) => {
          const c = ciudades.find((ci) => ci.id === e.target.value);
          if (c) onChange(c);
        }}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <option value="">Seleccionar ciudad...</option>
        {ciudades.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Skeleton Loader ── */
function CardSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-800/50 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-zinc-700 rounded w-3/4" />
          <div className="h-3 bg-zinc-700 rounded w-1/2" />
          <div className="h-3 bg-zinc-700 rounded w-2/3" />
        </div>
        <div className="h-8 w-8 bg-zinc-700 rounded" />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 bg-zinc-700 rounded" />
        ))}
      </div>
    </div>
  );
}

/* ── GeneradorIcon ── */
function GeneradorIcon({ tipo }: { tipo: string }) {
  const icons: Record<string, string> = {
    estadio: '\u{1F3DF}\u{FE0F}',
    hospital: '\u{1F3E5}',
    clinica: '\u{1F3E5}',
    universidad: '\u{1F393}',
    metro: '\u{1F687}',
    centro_comercial: '\u{1F3EC}',
    coliseo: '\u{1F3DB}\u{FE0F}',
  };
  return <span className="text-base">{icons[tipo] || '\u{1F4CD}'}</span>;
}

/* ── DeficitIndicador ── */
function DeficitIndicador({ deficit }: { deficit: number }) {
  const isDeficit = deficit > 0;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isDeficit
          ? 'bg-red-500/10 text-red-400'
          : 'bg-emerald-500/10 text-emerald-400'
      }`}
    >
      <AlertTriangle size={14} />
      <span className="text-sm font-medium">
        {isDeficit
          ? `Faltan ${fmt.format(deficit)} cajones`
          : 'Sin faltantes de cajones'}
      </span>
    </div>
  );
}

/* ── Google Maps dark theme styles ── */
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
];

function scoreMarkerColor(score: number): string {
  if (score >= 80) return '10b981';
  if (score >= 60) return 'eab308';
  if (score >= 40) return 'f97316';
  return 'ef4444';
}

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
  score?: number;
  area_m2?: number;
  cajones?: number;
  propietario?: string;
  tipo?: string;
  aforo?: number;
  capacidad?: number;
}

/* ── GoogleMapView ── */
function GoogleMapView({
  ciudad,
  capasVisibles,
  onPredioClick,
}: {
  ciudad: Ciudad | null;
  capasVisibles: {
    predios: boolean;
    generadores: boolean;
    parqueaderos: boolean;
    deficit: boolean;
  };
  onPredioClick: (predio: Predio) => void;
}) {
  const [prediosMarkers, setPrediosMarkers] = useState<MarkerData[]>([]);
  const [generadoresMarkers, setGeneradoresMarkers] = useState<MarkerData[]>([]);
  const [parqueaderosMarkers, setParqueaderosMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  useEffect(() => {
    if (!ciudad) return;
    fetch(`/api/mapa?ciudad=${encodeURIComponent(ciudad.nombre)}`)
      .then((r) => r.json())
      .then((data: MapaGeoJSON) => {
        const extractCoords = (f: GeoJSON.Feature): [number, number] | null => {
          const g = f.geometry;
          if (!g) return null;
          if (g.type === 'Point') return [g.coordinates[1], g.coordinates[0]];
          if (g.type === 'Polygon') {
            const coords = g.coordinates[0];
            const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
            const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
            return [lat, lng];
          }
          return null;
        };

        setPrediosMarkers(
          (data.predios?.features || [])
            .map((f) => {
              const c = extractCoords(f);
              if (!c) return null;
              const p = f.properties || {};
              return { id: p.id, lat: c[0], lng: c[1], nombre: p.nombre, score: p.score, area_m2: p.area_m2, cajones: p.cajones, propietario: p.propietario };
            })
            .filter(Boolean) as MarkerData[]
        );

        setGeneradoresMarkers(
          (data.generadores?.features || [])
            .map((f) => {
              const c = extractCoords(f);
              if (!c) return null;
              const p = f.properties || {};
              return { id: p.id, lat: c[0], lng: c[1], nombre: p.nombre, tipo: p.tipo, aforo: p.aforo };
            })
            .filter(Boolean) as MarkerData[]
        );

        setParqueaderosMarkers(
          (data.parqueaderos?.features || [])
            .map((f) => {
              const c = extractCoords(f);
              if (!c) return null;
              const p = f.properties || {};
              return { id: p.id, lat: c[0], lng: c[1], nombre: p.nombre, capacidad: p.capacidad };
            })
            .filter(Boolean) as MarkerData[]
        );
      })
      .catch(() => {});
  }, [ciudad]);

  const center = useMemo(
    () =>
      ciudad
        ? { lat: ciudad.lat, lng: ciudad.lng }
        : { lat: 6.25, lng: -75.56 },
    [ciudad]
  );

  if (!ciudad) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3">
          <MapPin size={48} className="mx-auto text-zinc-600" />
          <p className="text-zinc-500 text-sm">
            Selecciona una ciudad para ver el mapa
          </p>
        </div>
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 text-sm">Google Maps API key no configurada</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <GoogleMap
        defaultCenter={center}
        center={center}
        defaultZoom={13}
        zoom={13}
        styles={DARK_MAP_STYLES}
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={true}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        className="w-full h-full min-h-[500px]"
      >
        {/* Predios markers */}
        {capasVisibles.predios &&
          prediosMarkers.map((m) => (
            <Marker
              key={`p-${m.id}`}
              position={{ lat: m.lat, lng: m.lng }}
              title={`${m.nombre} (Score: ${m.score})`}
              icon={`https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|${scoreMarkerColor(m.score ?? 0)}`}
              onClick={() => {
                setSelectedMarker(m);
                onPredioClick({
                  id: m.id,
                  nombre: m.nombre,
                  score_total: m.score ?? 0,
                  area_m2: m.area_m2 ?? 0,
                  cajones_estimados: m.cajones ?? 0,
                  propietario: m.propietario ?? '',
                } as Predio);
              }}
            />
          ))}

        {/* Generadores markers */}
        {capasVisibles.generadores &&
          generadoresMarkers.map((m) => (
            <Marker
              key={`g-${m.id}`}
              position={{ lat: m.lat, lng: m.lng }}
              title={`${m.nombre} (${m.tipo})`}
              icon="https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|a78bfa"
            />
          ))}

        {/* Parqueaderos markers */}
        {capasVisibles.parqueaderos &&
          parqueaderosMarkers.map((m) => (
            <Marker
              key={`pk-${m.id}`}
              position={{ lat: m.lat, lng: m.lng }}
              title={`${m.nombre} (${m.capacidad} cajones)`}
              icon="https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=P|38bdf8|000000"
            />
          ))}

        {/* InfoWindow for selected marker */}
        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1">
              <h3 className="font-semibold text-sm text-gray-900">
                {selectedMarker.nombre}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Score: <strong>{selectedMarker.score ?? 'N/A'}</strong>
              </p>
              {selectedMarker.area_m2 != null && (
                <p className="text-xs text-gray-600">
                  Area: {fmt.format(selectedMarker.area_m2)} m2
                </p>
              )}
              {selectedMarker.propietario && (
                <p className="text-xs text-gray-600">
                  {selectedMarker.propietario}
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </APIProvider>
  );
}

/* ── PDFButton ── */
function PDFButton({ predioId }: { predioId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ficha-pdf/${predioId}`);
      if (!res.ok) throw new Error('Error al generar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-${predioId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <FileText size={14} />
      )}
      Descargar PDF
    </button>
  );
}

/* ════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                              */
/* ════════════════════════════════════════════════════════ */
export default function MapaPage() {
  const router = useRouter();
  const {
    ciudadActiva,
    ciudades,
    predioSeleccionado,
    filtros,
    panelDetalleAbierto,
    capasVisibles,
    setCiudadActiva,
    setCiudades,
    setPredioSeleccionado,
    setFiltros,
    setPanelDetalleAbierto,
    toggleCapa,
  } = useStore();

  const [predios, setPredios] = useState<Predio[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailData, setDetailData] = useState<{
    generadores: {
      nombre: string;
      tipo: string;
      distancia_metros: number;
    }[];
    parqueaderos_count: number;
    parqueaderos_capacidad: number;
    deficit: number;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* Fetch ciudades on mount */
  useEffect(() => {
    fetch('/api/ciudades')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCiudades(data);
          if (data.length > 0 && !ciudadActiva) {
            setCiudadActiva(data[0]);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fetch predios when ciudad or filters change */
  useEffect(() => {
    if (!ciudadActiva) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.set('ciudad', ciudadActiva.nombre);
    params.set('score_min', String(filtros.scoreMin));
    params.set('area_min', String(filtros.areaMin));
    if (filtros.sinRestricciones) params.set('sin_restricciones', 'true');
    if (filtros.propietarios.length > 0) {
      params.set('propietario', filtros.propietarios[0]);
    }
    params.set('limit', '50');

    fetch(`/api/predios?${params}`)
      .then((r) => r.json())
      .then((data: PrediosResponse) => {
        setPredios(data.predios || []);
      })
      .catch(() => setPredios([]))
      .finally(() => setLoading(false));
  }, [ciudadActiva, filtros]);

  /* Fetch detail when predio selected */
  useEffect(() => {
    if (!predioSeleccionado) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/predios/${predioSeleccionado.id}`)
      .then((r) => r.json())
      .then((data) => {
        setDetailData({
          generadores: (data.generadores_cercanos || []).slice(0, 3),
          parqueaderos_count: (data.parqueaderos_cercanos || []).length,
          parqueaderos_capacidad: (
            data.parqueaderos_cercanos || []
          ).reduce(
            (sum: number, p: { capacidad: number }) =>
              sum + (p.capacidad ?? 0),
            0
          ),
          deficit: data.deficit?.cajones_deficit || 0,
        });
      })
      .catch(() => setDetailData(null))
      .finally(() => setDetailLoading(false));
  }, [predioSeleccionado]);

  const handlePredioClick = useCallback(
    (predio: Predio) => {
      const full = predios.find((p) => p.id === predio.id) || predio;
      setPredioSeleccionado(full);
    },
    [predios, setPredioSeleccionado]
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT PANEL ── */}
      <div className="w-80 shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800 overflow-hidden">
        <div className="p-3 border-b border-zinc-800">
          <h1 className="text-sm font-semibold text-zinc-200">Mapa de Lotes</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Selecciona una ciudad y filtra lotes</p>
        </div>
        <CiudadSelector
          ciudades={ciudades}
          ciudadActiva={ciudadActiva}
          onChange={setCiudadActiva}
        />

        {/* Filters toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center justify-between px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-zinc-500" />
            <span>Filtros</span>
          </div>
          {filtersOpen ? (
            <ChevronUp size={14} className="text-zinc-500" />
          ) : (
            <ChevronDown size={14} className="text-zinc-500" />
          )}
        </button>

        {/* Collapsible filters */}
        {filtersOpen && (
          <div className="p-3 border-b border-zinc-800 space-y-4">
            {/* Score slider */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Viabilidad mínima: {filtros.scoreMin}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={filtros.scoreMin}
                onChange={(e) =>
                  setFiltros({ scoreMin: Number(e.target.value) })
                }
                className="w-full accent-emerald-500 h-1.5"
              />
            </div>

            {/* Area input */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Area minima (m&sup2;)
              </label>
              <input
                type="number"
                value={filtros.areaMin || ''}
                onChange={(e) =>
                  setFiltros({ areaMin: Number(e.target.value) || 0 })
                }
                placeholder="0"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Propietario checkboxes */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Propietario
              </label>
              <div className="space-y-1.5">
                {PROPIETARIOS.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filtros.propietarios.includes(p)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...filtros.propietarios, p]
                          : filtros.propietarios.filter((x) => x !== p);
                        setFiltros({ propietarios: next });
                      }}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/50"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            {/* Sin restricciones toggle */}
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.sinRestricciones}
                onChange={(e) =>
                  setFiltros({ sinRestricciones: e.target.checked })
                }
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/50"
              />
              Solo sin restricciones legales
            </label>
          </div>
        )}

        {/* Predios list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          ) : predios.length === 0 ? (
            <div className="text-center py-8">
              <Search size={32} className="mx-auto text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-500">
                {ciudadActiva
                  ? 'No se encontraron predios con estos filtros'
                  : 'Selecciona una ciudad'}
              </p>
            </div>
          ) : (
            predios.map((predio) => (
              <PredioCard
                key={predio.id}
                predio={predio}
                isSelected={predioSeleccionado?.id === predio.id}
                onClick={() => setPredioSeleccionado(predio)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── CENTER MAP ── */}
      <div className="flex-1 relative">
        <GoogleMapView
          ciudad={ciudadActiva}
          capasVisibles={capasVisibles}
          onPredioClick={handlePredioClick}
        />

        {/* Layer toggle buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
          {[
            {
              key: 'predios' as const,
              icon: MapPin,
              label: 'Predios',
              color: 'text-emerald-400',
            },
            {
              key: 'generadores' as const,
              icon: Building2,
              label: 'Atractores',
              color: 'text-violet-400',
            },
            {
              key: 'parqueaderos' as const,
              icon: Car,
              label: 'Parqueaderos',
              color: 'text-sky-400',
            },
            {
              key: 'deficit' as const,
              icon: AlertTriangle,
              label: 'Zonas Faltantes',
              color: 'text-red-400',
            },
          ].map((layer) => (
            <button
              key={layer.key}
              onClick={() => toggleCapa(layer.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                capasVisibles[layer.key]
                  ? 'bg-zinc-800/90 border border-zinc-600 text-zinc-100'
                  : 'bg-zinc-900/70 border border-zinc-800 text-zinc-500'
              }`}
            >
              <layer.icon
                size={14}
                className={
                  capasVisibles[layer.key] ? layer.color : 'text-zinc-600'
                }
              />
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL (slides in) ── */}
      <div
        className={`shrink-0 bg-zinc-900 border-l border-zinc-800 overflow-y-auto transition-all duration-300 ${
          panelDetalleAbierto && predioSeleccionado
            ? 'w-96'
            : 'w-0 border-0 overflow-hidden'
        }`}
      >
        {predioSeleccionado && (
          <div className="w-96 p-4 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-zinc-100 truncate">
                  {predioSeleccionado.nombre}
                </h2>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {predioSeleccionado.direccion}
                </p>
              </div>
              <button
                onClick={() => setPanelDetalleAbierto(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Score total */}
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${
                  predioSeleccionado.score_total >= 80
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : predioSeleccionado.score_total >= 60
                    ? 'bg-yellow-500/15 text-yellow-400'
                    : predioSeleccionado.score_total >= 40
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                {predioSeleccionado.score_total}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">
                  Viabilidad
                </p>
                <p className="text-xs text-zinc-500">
                  {predioSeleccionado.score_total >= 80
                    ? 'Excelente potencial'
                    : predioSeleccionado.score_total >= 60
                    ? 'Buen potencial'
                    : predioSeleccionado.score_total >= 40
                    ? 'Potencial moderado'
                    : 'Bajo potencial'}
                </p>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="space-y-2.5">
              <ScoreBar label="Area" value={predioSeleccionado.score_area} />
              <ScoreBar
                label="Accesibilidad"
                value={predioSeleccionado.score_accesibilidad}
              />
              <ScoreBar
                label="Demanda"
                value={predioSeleccionado.score_demanda}
              />
              <ScoreBar
                label="Restricciones"
                value={predioSeleccionado.score_restricciones}
              />
            </div>

            {detailLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-20 bg-zinc-800 rounded-lg" />
                <div className="h-12 bg-zinc-800 rounded-lg" />
                <div className="h-12 bg-zinc-800 rounded-lg" />
              </div>
            ) : detailData ? (
              <>
                {/* Top 3 generadores */}
                <div>
                  <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                    Atractores de demanda cercanos
                  </h3>
                  <div className="space-y-2">
                    {detailData.generadores.map((g, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-800/50"
                      >
                        <GeneradorIcon tipo={g.tipo} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 truncate">
                            {g.nombre}
                          </p>
                          <p className="text-xs text-zinc-500">{g.tipo}</p>
                        </div>
                        <span className="text-xs text-zinc-400 shrink-0">
                          {fmt.format(Math.round(g.distancia_metros))}m
                        </span>
                      </div>
                    ))}
                    {detailData.generadores.length === 0 && (
                      <p className="text-sm text-zinc-500">
                        No se encontraron atractores cercanos
                      </p>
                    )}
                  </div>
                </div>

                {/* Parqueaderos nearby */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <Car size={18} className="text-sky-400 shrink-0" />
                  <div>
                    <p className="text-sm text-zinc-200">
                      {detailData.parqueaderos_count} parqueaderos cercanos
                    </p>
                    <p className="text-xs text-zinc-500">
                      Capacidad total:{' '}
                      {fmt.format(detailData.parqueaderos_capacidad)} cajones
                    </p>
                  </div>
                </div>

                {/* Deficit */}
                <DeficitIndicador deficit={detailData.deficit} />
              </>
            ) : null}

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() =>
                  router.push(`/predio/${predioSeleccionado.id}`)
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                <Navigation size={14} />
                Ver ficha completa
              </button>
              <PDFButton predioId={predioSeleccionado.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
