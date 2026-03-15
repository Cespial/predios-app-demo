'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Ciudad } from '@/types';
import Link from 'next/link';

const fmt = new Intl.NumberFormat('es-CO');
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function CiudadesPage() {
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCiudades() {
      try {
        const res = await fetch('/api/ciudades');
        const data = await res.json();
        setCiudades(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCiudades();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const chartData = ciudades.map((c) => ({
    name: c.nombre,
    deficit: c.deficit_total_cajones || 0,
    predios: c.total_predios || 0,
    generadores: c.total_generadores || 0,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Comparativa de Ciudades</h1>

      {/* City Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {ciudades.map((ciudad) => (
          <div
            key={ciudad.id}
            className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
          >
            {/* Static Map */}
            {ciudad.lat && ciudad.lng && MAPBOX_TOKEN && (
              <div className="h-40 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${ciudad.lng},${ciudad.lat},11,0/600x320@2x?access_token=${MAPBOX_TOKEN}`}
                  alt={ciudad.nombre}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent" />
                <div className="absolute bottom-3 left-4">
                  <h2 className="text-xl font-bold">{ciudad.nombre}</h2>
                  <span className="text-xs text-zinc-400">{ciudad.departamento}</span>
                </div>
              </div>
            )}

            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
                    <Building2 size={12} />
                  </div>
                  <div className="text-lg font-bold">{ciudad.total_predios || 0}</div>
                  <div className="text-[10px] text-zinc-500">Predios</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
                    <Users size={12} />
                  </div>
                  <div className="text-lg font-bold">{ciudad.total_generadores || 0}</div>
                  <div className="text-[10px] text-zinc-500">Generadores</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
                    <AlertTriangle size={12} />
                  </div>
                  <div className="text-lg font-bold text-amber-400">
                    {fmt.format(ciudad.deficit_total_cajones || 0)}
                  </div>
                  <div className="text-[10px] text-zinc-500">Déficit</div>
                </div>
              </div>
              <Link
                href={`/mapa`}
                className="block mt-3 text-center text-xs text-emerald-400 hover:text-emerald-300"
              >
                Ver en mapa →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> Déficit de Cajones por Ciudad
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Bar dataKey="deficit" fill="#f59e0b" name="Déficit Cajones" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Ciudad</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Departamento</th>
              <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Población</th>
              <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Predios</th>
              <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Generadores</th>
              <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Déficit Cajones</th>
            </tr>
          </thead>
          <tbody>
            {ciudades.map((c) => (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-4 py-3 font-medium text-sm">{c.nombre}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{c.departamento}</td>
                <td className="px-4 py-3 text-sm text-right">{c.poblacion ? fmt.format(c.poblacion) : '—'}</td>
                <td className="px-4 py-3 text-sm text-right">{c.total_predios || 0}</td>
                <td className="px-4 py-3 text-sm text-right">{c.total_generadores || 0}</td>
                <td className="px-4 py-3 text-sm text-right text-amber-400 font-semibold">
                  {fmt.format(c.deficit_total_cajones || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
