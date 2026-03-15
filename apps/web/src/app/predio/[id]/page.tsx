'use client';

import { useState, useEffect, useRef } from 'react';
import { APIProvider, Map as GoogleMap, Marker, useMap } from '@vis.gl/react-google-maps';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Share2,
  Ruler,
  Navigation,
  TrendingUp,
  Shield,
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type {
  PredioDetalle,
  FichaContenido,
  NormativaItem,
} from '@/types';

const fmt = new Intl.NumberFormat('es-CO');

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

function scoreBgLight(score: number) {
  if (score >= 80) return 'bg-emerald-500/15';
  if (score >= 60) return 'bg-yellow-500/15';
  if (score >= 40) return 'bg-orange-500/15';
  return 'bg-red-500/15';
}

/* ── ScoreBar ── */
function ScoreBar({ label, value, explanation }: { label: string; value: number; explanation?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className={`font-semibold ${scoreColor(value)}`}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-700">
        <div
          className={`h-full rounded-full transition-all ${scoreBg(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      {explanation && (
        <p className="text-xs text-zinc-500">{explanation}</p>
      )}
    </div>
  );
}

/* ── Generador Icon ── */
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
  return <span className="text-lg">{icons[tipo] || '\u{1F4CD}'}</span>;
}

/* ── IngresoSimulador ── */
function IngresoSimulador({
  cajones,
  tarifaHora,
}: {
  cajones: number;
  tarifaHora: number;
}) {
  const [cajonesInput, setCajonesInput] = useState(cajones);
  const [tarifa, setTarifa] = useState(tarifaHora);
  const [ocupacion, setOcupacion] = useState(65);

  const horasOperacion = 14;
  const diasMes = 30;
  const ingresoMes = Math.round(
    cajonesInput * tarifa * (ocupacion / 100) * horasOperacion * diasMes
  );

  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">
        Simulador de Ingresos
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Cajones</label>
          <input
            type="number"
            value={cajonesInput}
            onChange={(e) => setCajonesInput(Number(e.target.value) || 0)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Tarifa/hora (COP)
          </label>
          <input
            type="number"
            value={tarifa}
            onChange={(e) => setTarifa(Number(e.target.value) || 0)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Ocupacion: {ocupacion}%
          </label>
          <input
            type="range"
            min={10}
            max={100}
            value={ocupacion}
            onChange={(e) => setOcupacion(Number(e.target.value))}
            className="w-full accent-emerald-500 mt-2"
          />
        </div>
      </div>
      <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <span className="text-sm text-emerald-300">
          Ingreso mensual estimado
        </span>
        <span className="text-xl font-bold text-emerald-400">
          ${fmt.format(ingresoMes)}
        </span>
      </div>
      <p className="text-xs text-zinc-500 mt-2">
        Basado en {horasOperacion}h de operacion diaria, {diasMes} dias/mes
      </p>
    </div>
  );
}

/* ── FichaTecnicaAI ── */
function FichaTecnicaAI({ predioId }: { predioId: string }) {
  const [ficha, setFicha] = useState<FichaContenido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFicha = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/predios/${predioId}/ficha`)
      .then((r) => {
        if (!r.ok) throw new Error('Error al cargar ficha');
        return r.json();
      })
      .then((data) => {
        setFicha(data.contenido_ia || data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFicha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predioId]);

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Generando analisis con IA...</span>
        </div>
        <div className="mt-4 space-y-3 animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800 rounded w-5/6" />
          <div className="h-4 bg-zinc-800 rounded w-4/6" />
          <div className="h-4 bg-zinc-800 rounded w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchFicha}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!ficha) return null;

  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 space-y-5">
      <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
        <FileText size={16} className="text-emerald-400" />
        Ficha Tecnica IA
      </h3>

      {/* Resumen ejecutivo */}
      <div>
        <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
          Resumen Ejecutivo
        </h4>
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
          {ficha.resumen_ejecutivo}
        </p>
      </div>

      {/* Modelo tarifario */}
      {ficha.modelo_tarifario && (
        <div>
          <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Modelo Tarifario
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '30 min', value: ficha.modelo_tarifario.tarifa_fraccion_30min },
              { label: 'Hora', value: ficha.modelo_tarifario.tarifa_hora },
              { label: 'Dia', value: ficha.modelo_tarifario.tarifa_dia },
              { label: 'Mes', value: ficha.modelo_tarifario.tarifa_mes },
            ].map((t) => (
              <div key={t.label} className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-zinc-500">{t.label}</p>
                <p className="text-sm font-semibold text-zinc-200">
                  ${fmt.format(t.value || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cajones recomendados e ingresos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-400/70">Cajones Recomendados</p>
          <p className="text-2xl font-bold text-emerald-400">
            {ficha.cajones_recomendados || 0}
          </p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-400/70">Ingresos Est./Mes</p>
          <p className="text-2xl font-bold text-emerald-400">
            ${fmt.format(ficha.ingresos_estimados_mes || 0)}
          </p>
        </div>
      </div>

      {/* Servicios complementarios */}
      {ficha.servicios_complementarios && ficha.servicios_complementarios.length > 0 && (
        <div>
          <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Servicios Complementarios
          </h4>
          <div className="flex flex-wrap gap-2">
            {ficha.servicios_complementarios.map((s, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs border border-zinc-700"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Riesgos */}
      {ficha.riesgos_principales && ficha.riesgos_principales.length > 0 && (
        <div>
          <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Riesgos Principales
          </h4>
          <ul className="space-y-1.5">
            {ficha.riesgos_principales.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-zinc-300"
              >
                <AlertTriangle
                  size={14}
                  className="text-amber-400 shrink-0 mt-0.5"
                />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vinculacion plan de desarrollo */}
      {ficha.vinculacion_plan_desarrollo && (
        <div>
          <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Vinculacion Plan de Desarrollo
          </h4>
          <div className="space-y-2">
            {[
              { label: 'Municipal', text: ficha.vinculacion_plan_desarrollo.municipal },
              { label: 'Departamental', text: ficha.vinculacion_plan_desarrollo.departamental },
              { label: 'Nacional', text: ficha.vinculacion_plan_desarrollo.nacional },
            ].map((v) => (
              <div key={v.label} className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-1">{v.label}</p>
                <p className="text-sm text-zinc-300">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ChecklistNormativo ── */
function ChecklistNormativo({ items }: { items: NormativaItem[] }) {
  const verified = items.filter((i) => i.aplica !== false).length;
  const totalItems = items.length;

  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">
          Checklist Normativo
        </h3>
        <span className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
          {verified} de {totalItems} verificados
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-700 mb-4">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{
            width: `${totalItems > 0 ? (verified / totalItems) * 100 : 0}%`,
          }}
        />
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50"
          >
            {item.aplica !== false ? (
              <CheckCircle2
                size={16}
                className="text-emerald-400 shrink-0 mt-0.5"
              />
            ) : (
              <Circle
                size={16}
                className="text-zinc-600 shrink-0 mt-0.5"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200">
                  {item.componente}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                  {item.norma}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {item.descripcion}
              </p>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-4">
            No hay items normativos registrados
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Dark map style for Google Maps ── */
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

/* ── Concentric circles drawn via useMap + google.maps.Circle ── */
function DetailMapCircles({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clean up previous circles
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    const colors = ['#34d399', '#fbbf24', '#f87171'];
    [300, 500, 1000].forEach((radius, i) => {
      const circle = new google.maps.Circle({
        map,
        center: { lat, lng },
        radius,
        strokeColor: colors[i],
        strokeWeight: 1.5,
        strokeOpacity: 0.5,
        fillOpacity: 0,
      });
      circlesRef.current.push(circle);
    });

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
    };
  }, [map, lat, lng]);

  return null;
}

/* ── Google Maps detail map ── */
function DetailMap({ predio }: { predio: PredioDetalle }) {
  if (!predio.centroide_lat || !predio.centroide_lng) {
    return (
      <div className="h-96 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center">
        <p className="text-sm text-zinc-500">
          Sin coordenadas disponibles para este predio
        </p>
      </div>
    );
  }

  const center = { lat: predio.centroide_lat, lng: predio.centroide_lng };

  return (
    <div className="h-96 rounded-xl overflow-hidden border border-zinc-800">
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}>
        <GoogleMap
          defaultCenter={center}
          defaultZoom={15}
          styles={DARK_MAP_STYLES}
          disableDefaultUI={false}
          gestureHandling="greedy"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Concentric radius circles */}
          <DetailMapCircles lat={center.lat} lng={center.lng} />

          {/* Predio marker (green) */}
          <Marker
            position={center}
            title={predio.nombre}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#10b981',
              fillOpacity: 0.8,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
          />

          {/* Generadores markers (purple) */}
          {predio.generadores_cercanos
            ?.filter((g) => g.lat && g.lng)
            .map((g) => (
              <Marker
                key={g.id}
                position={{ lat: g.lat, lng: g.lng }}
                title={`${g.nombre} (${g.tipo})`}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: '#a78bfa',
                  fillOpacity: 0.7,
                  strokeColor: '#18181b',
                  strokeWeight: 1,
                }}
              />
            ))}

          {/* Parqueaderos markers (blue) */}
          {predio.parqueaderos_cercanos
            ?.filter((p) => p.lat && p.lng)
            .map((p) => (
              <Marker
                key={p.id || `park-${p.lat}-${p.lng}`}
                position={{ lat: p.lat, lng: p.lng }}
                title={p.nombre}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: '#38bdf8',
                  fillOpacity: 0.7,
                  strokeColor: '#18181b',
                  strokeWeight: 1,
                }}
              />
            ))}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                              */
/* ════════════════════════════════════════════════════════ */
export default function PredioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [predio, setPredio] = useState<PredioDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [shared, setShared] = useState(false);

  const fetchPredio = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/predios/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Predio no encontrado');
        return r.json();
      })
      .then((data) => setPredio(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPredio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await fetch(`/api/predios/${id}/ficha`, { method: 'POST' });
      fetchPredio();
    } catch {
      // handle silently
    } finally {
      setRegenerating(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/ficha-pdf/${id}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handle silently
    }
  };

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-8 bg-zinc-800 rounded" />
          <div className="space-y-2">
            <div className="h-6 bg-zinc-800 rounded w-64" />
            <div className="h-4 bg-zinc-800 rounded w-48" />
          </div>
        </div>
        <div className="h-96 bg-zinc-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-64 bg-zinc-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  /* Error state */
  if (error || !predio) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={48} className="text-zinc-600" />
        <p className="text-zinc-400">{error || 'Predio no encontrado'}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={fetchPredio}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const radarData = [
    { subject: 'Area', value: predio.score_area },
    { subject: 'Accesibilidad', value: predio.score_accesibilidad },
    { subject: 'Demanda', value: predio.score_demanda },
    { subject: 'Restricciones', value: predio.score_restricciones },
  ];

  const deficitDemanda = Math.round(predio.deficit.aforo_total * 0.15);
  const barData = [
    {
      name: 'Cap. Existente',
      value: predio.deficit.capacidad_parqueaderos,
      fill: '#38bdf8',
    },
    { name: 'Demanda Est.', value: deficitDemanda, fill: '#f97316' },
    {
      name: 'Cajones Prop.',
      value: predio.cajones_estimados || 0,
      fill: '#10b981',
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* ── SECTION 1: HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-3"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <h1 className="text-2xl font-bold text-zinc-100">{predio.nombre}</h1>
          <p className="text-zinc-400 mt-1">{predio.direccion}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {predio.propietario}
            </span>
            {predio.ciudad_nombre && (
              <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700">
                {predio.ciudad_nombre}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold ${scoreBgLight(predio.score_total)} ${scoreColor(predio.score_total)}`}
          >
            {predio.score_total}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              <Download size={12} /> Descargar PDF
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors disabled:opacity-50"
            >
              {regenerating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Regenerar analisis IA
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
            >
              <Share2 size={12} />
              {shared ? 'URL copiada' : 'Compartir'}
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: MAP ── */}
      <DetailMap predio={predio} />

      {/* ── SECTION 3: SCORES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: Ruler,
              label: 'Area',
              value: predio.score_area,
              desc: `${fmt.format(predio.area_m2)} m\u00B2 disponibles`,
            },
            {
              icon: Navigation,
              label: 'Accesibilidad',
              value: predio.score_accesibilidad,
              desc: 'Vias de acceso y transporte publico',
            },
            {
              icon: TrendingUp,
              label: 'Demanda',
              value: predio.score_demanda,
              desc: `${predio.deficit.total_generadores} generadores cercanos`,
            },
            {
              icon: Shield,
              label: 'Restricciones',
              value: predio.score_restricciones,
              desc: 'Normativa, BIC y restricciones',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
            >
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-3">
                <s.icon size={16} />
                {s.label}
              </div>
              <ScoreBar label="" value={s.value} />
              <p className="text-xs text-zinc-500 mt-2">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">
            Perfil de Viabilidad
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── SECTION 4: DEMAND ANALYSIS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generadores table */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">
            Generadores de Demanda Cercanos
          </h3>
          {predio.generadores_cercanos && predio.generadores_cercanos.length > 0 ? (
            <div className="space-y-2">
              {predio.generadores_cercanos.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50"
                >
                  <GeneradorIcon tipo={g.tipo} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {g.nombre}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {g.tipo} &middot; Aforo: {fmt.format(g.aforo)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-zinc-300">
                      {fmt.format(Math.round(g.distancia_metros || 0))}m
                    </p>
                    {g.tiempo_caminando_min && (
                      <p className="text-xs text-zinc-500">
                        {Math.round(g.tiempo_caminando_min)} min
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-6">
              No se encontraron generadores cercanos
            </p>
          )}
        </div>

        {/* Bar chart + simulator */}
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">
              Capacidad vs Demanda vs Propuesta
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#e4e4e7' }}
                  formatter={(value) => [fmt.format(Number(value)), 'Cajones']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <IngresoSimulador
            cajones={
              predio.cajones_estimados || Math.round(predio.area_m2 / 25)
            }
            tarifaHora={
              predio.ficha?.contenido_ia?.modelo_tarifario?.tarifa_hora || 4000
            }
          />
        </div>
      </div>

      {/* ── SECTION 5: FICHA TECNICA IA ── */}
      <FichaTecnicaAI predioId={id} />

      {/* ── SECTION 6: CHECKLIST NORMATIVO ── */}
      <ChecklistNormativo items={predio.normativa || []} />
    </div>
  );
}
