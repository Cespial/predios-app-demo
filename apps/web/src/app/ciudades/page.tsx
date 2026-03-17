'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Trophy,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Ciudad, Predio } from '@/types';

const fmt = new Intl.NumberFormat('es-CO');
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

interface CiudadExtended extends Ciudad {
  top_predio_nombre?: string;
  top_predio_score?: number;
}

/* ── Skeleton Card ── */
function CardSkeleton() {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden animate-pulse">
      <div className="h-[200px] bg-zinc-800" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-zinc-800 rounded w-2/3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-12 bg-zinc-800 rounded" />
          <div className="h-12 bg-zinc-800 rounded" />
          <div className="h-12 bg-zinc-800 rounded" />
        </div>
        <div className="h-4 bg-zinc-800 rounded w-1/2" />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                              */
/* ════════════════════════════════════════════════════════ */
export default function CiudadesPage() {
  const [ciudades, setCiudades] = useState<CiudadExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCiudades = () => {
    setLoading(true);
    setError(null);

    fetch('/api/ciudades')
      .then((r) => {
        if (!r.ok) throw new Error('Error al cargar ciudades');
        return r.json();
      })
      .then(async (data: Ciudad[]) => {
        // For each city, fetch top predio
        const extended: CiudadExtended[] = await Promise.all(
          data.map(async (ciudad) => {
            try {
              const res = await fetch(
                `/api/predios?ciudad=${encodeURIComponent(ciudad.nombre)}&limit=1`
              );
              const prediosData = await res.json();
              const topPredio: Predio | undefined = prediosData.predios?.[0];
              return {
                ...ciudad,
                top_predio_nombre: topPredio?.nombre || '\u2014',
                top_predio_score: topPredio?.score_total || 0,
              };
            } catch {
              return {
                ...ciudad,
                top_predio_nombre: '\u2014',
                top_predio_score: 0,
              };
            }
          })
        );
        setCiudades(extended);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCiudades();
  }, []);

  const chartData = useMemo(
    () =>
      ciudades.map((c) => ({
        name: c.nombre,
        deficit: c.deficit_total_cajones || 0,
        predios: c.total_predios || 0,
        generadores: c.total_generadores || 0,
      })),
    [ciudades]
  );

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="h-[350px] bg-zinc-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={48} className="text-zinc-600" />
        <p className="text-zinc-400">{error}</p>
        <button
          onClick={fetchCiudades}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          Comparativa de Ciudades
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Análisis comparativo de estacionamientos faltantes y oportunidades de inversión por ciudad
        </p>
      </div>

      {/* City Cards - 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ciudades.map((ciudad) => (
          <div
            key={ciudad.id}
            className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
          >
            {/* Static Map Image */}
            {ciudad.lat && ciudad.lng && GOOGLE_MAPS_KEY ? (
              <div className="h-[200px] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${ciudad.lat},${ciudad.lng}&zoom=11&size=600x400&scale=2&maptype=roadmap&style=element:geometry%7Ccolor:0x242f3e&style=element:labels.text.fill%7Ccolor:0x746855&style=element:labels.text.stroke%7Ccolor:0x242f3e&style=feature:water%7Celement:geometry%7Ccolor:0x17263c&style=feature:road%7Celement:geometry%7Ccolor:0x38414e&key=${GOOGLE_MAPS_KEY}`}
                  alt={`Mapa de ${ciudad.nombre}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <h2 className="text-xl font-bold text-zinc-100">
                    {ciudad.nombre}
                  </h2>
                  <span className="text-xs text-zinc-400">
                    {ciudad.departamento}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-[200px] bg-zinc-800 flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={32} className="mx-auto text-zinc-600 mb-2" />
                  <h2 className="text-xl font-bold text-zinc-100">
                    {ciudad.nombre}
                  </h2>
                  <span className="text-xs text-zinc-400">
                    {ciudad.departamento}
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center text-zinc-500 mb-1">
                    <Building2 size={14} />
                  </div>
                  <div className="text-lg font-bold text-zinc-100">
                    {ciudad.total_predios || 0}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Lotes
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-zinc-500 mb-1">
                    <Users size={14} />
                  </div>
                  <div className="text-lg font-bold text-zinc-100">
                    {ciudad.total_generadores || 0}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Atractores
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-zinc-500 mb-1">
                    <AlertTriangle size={14} />
                  </div>
                  <div className="text-lg font-bold text-amber-400">
                    {fmt.format(ciudad.deficit_total_cajones || 0)}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Cajones Faltantes
                  </div>
                </div>
              </div>

              {/* Top predio */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                <Trophy size={14} className="text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500">Mejor lote</p>
                  <p className="text-sm text-zinc-200 truncate">
                    {ciudad.top_predio_nombre}
                  </p>
                </div>
                {ciudad.top_predio_score ? (
                  <span
                    className={`text-sm font-bold ${
                      ciudad.top_predio_score >= 80
                        ? 'text-emerald-400'
                        : ciudad.top_predio_score >= 60
                        ? 'text-yellow-400'
                        : ciudad.top_predio_score >= 40
                        ? 'text-orange-400'
                        : 'text-red-400'
                    }`}
                  >
                    {ciudad.top_predio_score}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart - Deficit comparison */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-amber-400" />
          Cajones Faltantes por Ciudad
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#e4e4e7' }}
                formatter={(value) => [fmt.format(Number(value)), '']}
              />
              <Bar
                dataKey="deficit"
                fill="#f59e0b"
                name="Cajones Faltantes"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-8">
            No hay datos disponibles
          </p>
        )}
      </div>

      {/* Summary Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Ciudad
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Poblacion
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Lotes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Atractores
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Cajones Faltantes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Mayor Viabilidad
                </th>
              </tr>
            </thead>
            <tbody>
              {ciudades.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    {c.nombre}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {c.departamento}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                    {c.poblacion ? fmt.format(c.poblacion) : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                    {c.total_predios || 0}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                    {c.total_generadores || 0}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-400 font-semibold tabular-nums">
                    {fmt.format(c.deficit_total_cajones || 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.top_predio_score ? (
                      <span
                        className={`font-semibold ${
                          c.top_predio_score >= 80
                            ? 'text-emerald-400'
                            : c.top_predio_score >= 60
                            ? 'text-yellow-400'
                            : c.top_predio_score >= 40
                            ? 'text-orange-400'
                            : 'text-red-400'
                        }`}
                      >
                        {c.top_predio_score}
                      </span>
                    ) : (
                      <span className="text-zinc-500">\u2014</span>
                    )}
                  </td>
                </tr>
              ))}
              {ciudades.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    No hay ciudades registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
