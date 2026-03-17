'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  Target,
  ShieldCheck,
  Ruler,
  Navigation,
  Zap,
  Eye,
} from 'lucide-react';

interface CiudadData {
  id: string;
  nombre: string;
  departamento: string;
  total_predios: number;
  total_generadores: number;
  deficit_total_cajones: number;
}

interface PredioData {
  id: string;
  nombre: string;
  area_m2: number;
  score_total: number;
  cajones_estimados: number;
  ciudad_nombre: string;
}

const fmt = new Intl.NumberFormat('es-CO');

function scoreColor(s: number) {
  if (s >= 80) return '#34d399';
  if (s >= 60) return '#fbbf24';
  if (s >= 40) return '#fb923c';
  return '#f87171';
}

/* ── Skeleton ── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[#1a1e25] rounded-lg animate-pulse ${className}`} />;
}

/* ── Score Ring ── */
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const color = scoreColor(score);
  return (
    <div
      className="score-ring"
      style={{
        '--score-color': color,
        '--score-pct': score,
        width: size,
        height: size,
      } as React.CSSProperties}
    >
      <div className="score-ring-inner">
        <span className="metric-value text-sm" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [ciudades, setCiudades] = useState<CiudadData[]>([]);
  const [predios, setPredios] = useState<PredioData[]>([]);
  const [totalPredios, setTotalPredios] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/ciudades').then(r => r.json()),
      fetch('/api/predios?limit=5').then(r => r.json()),
    ]).then(([c, p]) => {
      setCiudades(c || []);
      setPredios(p.predios || []);
      setTotalPredios(p.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const topCount = predios.filter(p => p.score_total >= 80).length;
  const deficit = ciudades.reduce((s, c) => s + (c.deficit_total_cajones ?? 0), 0);
  const maxDeficit = Math.max(...ciudades.map(c => c.deficit_total_cajones ?? 0), 1);

  return (
    <div className="min-h-screen grid-pattern relative">
      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-16 space-y-16">

        {/* ═══ HERO ═══ */}
        <header className="animate-fade-in-up space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-xs font-mono text-emerald-400/70 uppercase tracking-[0.2em]">
              Sistema Activo
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="text-tensor glow-text">tensor</span>
            <span className="text-zinc-500 font-light">.lat</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed font-light">
            Encuentre los mejores lotes públicos para construir parqueaderos
            rentables en las principales ciudades de Colombia.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/mapa"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all"
            >
              <Eye size={16} /> Ver mapa
            </Link>
            <Link
              href="/predios"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1e25] border border-[#2a3040] rounded-lg text-zinc-300 text-sm font-medium hover:border-zinc-600 transition-all"
            >
              <Zap size={16} /> Ver oportunidades
            </Link>
          </div>
        </header>

        {/* ═══ KPIs ═══ */}
        <section className="animate-fade-in-up delay-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {loading ? (
              [1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)
            ) : [
              { icon: BarChart3, label: 'Lotes analizados', value: fmt.format(totalPredios), color: '#34d399' },
              { icon: TrendingUp, label: 'Oportunidades top', value: fmt.format(topCount), color: '#60a5fa' },
              { icon: AlertTriangle, label: 'Estacionamientos faltantes', value: fmt.format(deficit), color: '#fbbf24' },
              { icon: MapPin, label: 'Ciudades', value: String(ciudades.length), color: '#c084fc' },
            ].map((kpi) => (
              <div key={kpi.label} className="card-observatory p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <kpi.icon size={14} style={{ color: kpi.color }} className="opacity-70" />
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                    {kpi.label}
                  </span>
                </div>
                <p className="metric-value text-2xl sm:text-3xl" style={{ color: kpi.color }}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="separator-glow" />

        {/* ═══ CIUDADES ═══ */}
        <section className="animate-fade-in-up delay-2 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Ciudades analizadas</h2>
              <p className="text-sm text-zinc-500 mt-1">Estacionamientos faltantes por capital</p>
            </div>
            <Link href="/ciudades" className="text-xs text-emerald-400/70 hover:text-emerald-400 flex items-center gap-1 transition-colors">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ciudades.slice(0, 4).map((c, i) => (
                <Link
                  key={c.id}
                  href="/mapa"
                  className={`card-observatory p-5 group animate-fade-in-up delay-${i + 1}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-tensor transition-colors">
                        {c.nombre}
                      </h3>
                      <span className="text-xs text-zinc-600">{c.departamento}</span>
                    </div>
                    <ArrowUpRight size={16} className="text-zinc-700 group-hover:text-emerald-400 transition-colors" />
                  </div>

                  <div className="flex gap-6 text-xs text-zinc-500 mb-4 font-mono">
                    <span>{fmt.format(c.total_predios)} lotes</span>
                    <span>{fmt.format(c.total_generadores)} atractores</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-600">Faltantes</span>
                      <span className="metric-value text-amber-400/80">
                        {fmt.format(c.deficit_total_cajones)} cajones
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-[#1a1e25] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-orange-500/40 transition-all duration-700"
                        style={{ width: `${Math.round(((c.deficit_total_cajones ?? 0) / maxDeficit) * 100)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ═══ TOP OPORTUNIDADES ═══ */}
        <section className="animate-fade-in-up delay-3 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Mejores oportunidades</h2>
              <p className="text-sm text-zinc-500 mt-1">Lotes con mayor potencial de inversión</p>
            </div>
            <Link href="/predios" className="text-xs text-emerald-400/70 hover:text-emerald-400 flex items-center gap-1 transition-colors">
              Ver {fmt.format(totalPredios)} lotes <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <Skeleton className="h-80" />
          ) : (
            <div className="card-observatory overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1e2229]">
                      {['#', 'Lote', 'Ciudad', 'Área', 'Viabilidad', 'Cajones'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predios.map((p, i) => (
                      <tr
                        key={p.id}
                        className="border-b border-[#1e2229]/50 last:border-0 hover:bg-[#1a1e25]/50 transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-zinc-600">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/predio/${p.id}`}
                            className="text-zinc-200 text-sm font-medium group-hover:text-tensor transition-colors"
                          >
                            {p.nombre.length > 50 ? p.nombre.slice(0, 50) + '...' : p.nombre}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-500">
                          {p.ciudad_nombre}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-zinc-400">
                            {fmt.format(p.area_m2)} m²
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <ScoreRing score={p.score_total} size={40} />
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-zinc-400">
                            {fmt.format(p.cajones_estimados ?? 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <div className="separator-glow" />

        {/* ═══ METODOLOGÍA ═══ */}
        <section className="animate-fade-in-up delay-4 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">Metodología de evaluación</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Cada lote se evalúa en 4 dimensiones ponderadas basadas en normativa colombiana
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Target, title: 'Demanda', weight: 40, color: '#34d399',
                desc: 'Cajones faltantes basados en atractores de demanda cercanos y factores normativos (Decreto 1077/2015)' },
              { icon: Navigation, title: 'Accesibilidad', weight: 25, color: '#60a5fa',
                desc: 'Proximidad a vías principales, transporte público y red de movilidad urbana' },
              { icon: Ruler, title: 'Área', weight: 20, color: '#c084fc',
                desc: 'Tamaño óptimo del lote para operación eficiente (2,500–8,000 m² ideal)' },
              { icon: ShieldCheck, title: 'Viabilidad Legal', weight: 15, color: '#fbbf24',
                desc: 'Compatibilidad con POT, BIC, restricciones ambientales y étnicas' },
            ].map((d, i) => (
              <div key={d.title} className={`card-observatory p-5 animate-fade-in-up delay-${i + 1}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${d.color}10` }}>
                    <d.icon size={18} style={{ color: d.color }} />
                  </div>
                  <span className="font-mono text-xs font-semibold" style={{ color: d.color }}>
                    {d.weight}%
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">{d.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="pt-8 pb-4 border-t border-[#1e2229]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
              <span className="font-semibold text-tensor/50">tensor.lat</span>
              <span className="text-zinc-700">— Plataforma de Inversión en Parqueaderos</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span>IGAC</span>
              <span className="text-zinc-800">·</span>
              <span>datos.gov.co</span>
              <span className="text-zinc-800">·</span>
              <span>Google Places</span>
              <span className="text-zinc-800">·</span>
              <span>OpenStreetMap</span>
              <span className="text-zinc-800">·</span>
              <span>Claude AI</span>
            </div>
            <span className="font-mono">&copy; {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
