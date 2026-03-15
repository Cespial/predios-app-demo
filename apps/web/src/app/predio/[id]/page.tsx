'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScoreBar } from '@/components/ScoreBar';
import { GeneradorIcon } from '@/components/GeneradorIcon';
import { DeficitIndicador } from '@/components/DeficitIndicador';
import { ChecklistNormativo } from '@/components/ChecklistNormativo';
import { IngresoSimulador } from '@/components/IngresoSimulador';
import { FichaTecnicaAI } from '@/components/FichaTecnicaAI';
import { MapboxMapa } from '@/components/MapboxMapa';
import {
  ArrowLeft, Download, RefreshCw, Share2, Ruler, Navigation, TrendingUp, Shield,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PredioDetalle, GeneradorTipo } from '@/types';

const fmt = new Intl.NumberFormat('es-CO');

export default function PredioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [predio, setPredio] = useState<PredioDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPredio() {
      try {
        const res = await fetch(`/api/predios/${id}`);
        const data = await res.json();
        setPredio(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPredio();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
        <div className="h-96 bg-zinc-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!predio) {
    return (
      <div className="p-6 text-center text-zinc-500">
        <p>Predio no encontrado</p>
        <button onClick={() => router.back()} className="mt-4 text-emerald-400">
          Volver
        </button>
      </div>
    );
  }

  const scoreColor =
    predio.score_total > 70 ? 'text-emerald-400' : predio.score_total > 40 ? 'text-yellow-400' : 'text-red-400';

  const radarData = [
    { subject: 'Área', value: predio.score_area },
    { subject: 'Accesibilidad', value: predio.score_accesibilidad },
    { subject: 'Demanda', value: predio.score_demanda },
    { subject: 'Restricciones', value: predio.score_restricciones },
  ];

  const deficitDemanda = Math.round(predio.deficit.aforo_total * 0.15);
  const barData = [
    { name: 'Capacidad Existente', value: predio.deficit.capacidad_parqueaderos },
    { name: 'Demanda Estimada', value: deficitDemanda },
    { name: 'Cajones Propuestos', value: predio.cajones_estimados || 0 },
  ];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 mb-2"
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <h1 className="text-2xl font-bold">{predio.nombre}</h1>
          <p className="text-zinc-400">{predio.direccion}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">
              {predio.propietario}
            </span>
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded">{predio.ciudad_nombre}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-5xl font-bold ${scoreColor}`}>
            {Math.round(predio.score_total)}
          </div>
          <div className="flex flex-col gap-1">
            <button className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs">
              <Download size={12} /> PDF
            </button>
            <button className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-xs">
              <RefreshCw size={12} /> Regenerar IA
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-xs"
            >
              <Share2 size={12} /> Compartir
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="mb-8 rounded-xl overflow-hidden border border-zinc-800">
        <div className="h-96">
          <MapboxMapa
            lat={predio.centroide_lat}
            lng={predio.centroide_lng}
            zoom={15}
            prediosGeoJSON={predio.geom ? {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: predio.geom,
                properties: { id: predio.id, nombre: predio.nombre, score: predio.score_total },
              }],
            } : null}
            generadoresGeoJSON={{
              type: 'FeatureCollection',
              features: (predio.generadores_cercanos || []).map((g) => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [g.lng, g.lat] },
                properties: { id: g.id, nombre: g.nombre, tipo: g.tipo, aforo: g.aforo },
              })),
            }}
            parqueaderosGeoJSON={{
              type: 'FeatureCollection',
              features: (predio.parqueaderos_cercanos || []).map((p) => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
                properties: { id: p.id, nombre: p.nombre, capacidad: p.capacidad },
              })),
            }}
            onPredioClick={() => {}}
          />
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Ruler, label: 'Área', value: predio.score_area, desc: `${fmt.format(predio.area_m2)} m²` },
            { icon: Navigation, label: 'Accesibilidad', value: predio.score_accesibilidad, desc: 'Vías y transporte' },
            { icon: TrendingUp, label: 'Demanda', value: predio.score_demanda, desc: `${predio.deficit.total_generadores} generadores` },
            { icon: Shield, label: 'Restricciones', value: predio.score_restricciones, desc: 'Normativa y BIC' },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                <s.icon size={14} /> {s.label}
              </div>
              <ScoreBar value={s.value} size="md" />
              <div className="text-xs text-zinc-500 mt-2">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Perfil de Viabilidad</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Demand Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Generadores de Demanda Cercanos</h3>
          <div className="space-y-2">
            {(predio.generadores_cercanos || []).map((g) => (
              <div key={g.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-3">
                <GeneradorIcon tipo={g.tipo as GeneradorTipo} size={20} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{g.nombre}</div>
                  <div className="text-xs text-zinc-500">
                    {g.tipo} · Aforo: {fmt.format(g.aforo)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{Math.round(g.distancia_metros || 0)}m</div>
                  <div className="text-xs text-zinc-500">
                    {Math.round(g.tiempo_caminando_min || 0)} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Oferta vs Demanda</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }}
                  labelStyle={{ color: '#e4e4e7' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DeficitIndicador
            oferta={predio.deficit.capacidad_parqueaderos}
            demanda={deficitDemanda}
          />
        </div>
      </div>

      {/* Income Simulator */}
      <div className="mb-8">
        <IngresoSimulador
          cajones={predio.cajones_estimados || Math.round(predio.area_m2 / 25)}
          tarifaHora={predio.ficha?.contenido_ia?.modelo_tarifario?.tarifa_hora || 4000}
        />
      </div>

      {/* AI Analysis */}
      <div className="mb-8">
        <FichaTecnicaAI predioId={id} />
      </div>

      {/* Normativa Checklist */}
      {predio.normativa && predio.normativa.length > 0 && (
        <div className="mb-8">
          <ChecklistNormativo items={predio.normativa} />
        </div>
      )}
    </div>
  );
}
