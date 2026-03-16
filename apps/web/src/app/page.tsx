'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  MapPin,
  ArrowRight,
  Building2,
  Users,
  Target,
  ShieldCheck,
  Ruler,
  Navigation,
} from 'lucide-react';

/* ── Types ── */
interface CiudadData {
  id: string;
  nombre: string;
  departamento: string;
  poblacion: number;
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

interface PrediosResponse {
  predios: PredioData[];
  total: number;
}

/* ── Formatters ── */
const fmt = new Intl.NumberFormat('es-CO');

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500/15 border-emerald-500/25';
  if (score >= 60) return 'bg-yellow-500/15 border-yellow-500/25';
  if (score >= 40) return 'bg-orange-500/15 border-orange-500/25';
  return 'bg-red-500/15 border-red-500/25';
}

/* ── Skeleton Components ── */
function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 animate-pulse"
        >
          <div className="h-4 w-20 bg-zinc-800 rounded mb-3" />
          <div className="h-8 w-24 bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-16 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

function CitySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 animate-pulse"
        >
          <div className="h-6 w-32 bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-24 bg-zinc-800 rounded mb-4" />
          <div className="h-3 w-full bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-3/4 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="h-5 w-56 bg-zinc-800 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-8 bg-zinc-800 rounded" />
              <div className="h-4 w-48 bg-zinc-800 rounded" />
              <div className="h-4 w-24 bg-zinc-800 rounded" />
              <div className="h-4 w-20 bg-zinc-800 rounded" />
              <div className="h-4 w-16 bg-zinc-800 rounded" />
              <div className="h-4 w-16 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MAIN DASHBOARD PAGE                                      */
/* ══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [ciudades, setCiudades] = useState<CiudadData[]>([]);
  const [predios, setPredios] = useState<PredioData[]>([]);
  const [totalPredios, setTotalPredios] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ciudadesRes, prediosRes] = await Promise.all([
          fetch('/api/ciudades'),
          fetch('/api/predios?limit=5'),
        ]);

        if (ciudadesRes.ok) {
          const ciudadesData: CiudadData[] = await ciudadesRes.json();
          setCiudades(ciudadesData);
        }

        if (prediosRes.ok) {
          const prediosData: PrediosResponse = await prediosRes.json();
          setPredios(prediosData.predios || []);
          setTotalPredios(prediosData.total || 0);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  /* ── Computed KPIs ── */
  const totalAnalyzed = totalPredios;
  const topOpportunities = predios.filter((p) => p.score_total >= 80).length;
  const nationalDeficit = ciudades.reduce(
    (sum, c) => sum + (c.deficit_total_cajones || 0),
    0
  );
  const citiesCovered = ciudades.length;

  /* ── Max deficit for relative bar widths ── */
  const maxDeficit = Math.max(
    ...ciudades.map((c) => c.deficit_total_cajones || 0),
    1
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* ═══════════════════════════════════════════ */}
        {/*  HEADER SECTION                             */}
        {/* ═══════════════════════════════════════════ */}
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-emerald-500 tracking-tight">
              tensor.lat
            </h1>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-zinc-200">
            Plataforma de Inteligencia Territorial para Parqueaderos
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-3xl leading-relaxed">
            Identificamos predios publicos optimos para desarrollo de
            infraestructura de estacionamiento en capitales colombianas.
          </p>
        </header>

        {/* ═══════════════════════════════════════════ */}
        {/*  KPI CARDS                                  */}
        {/* ═══════════════════════════════════════════ */}
        {loading ? (
          <KPISkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: BarChart3,
                label: 'Predios Analizados',
                value: fmt.format(totalAnalyzed),
                sub: 'Total en base de datos',
                accent: 'text-emerald-400',
                iconBg: 'bg-emerald-500/10',
              },
              {
                icon: TrendingUp,
                label: 'Oportunidades Top',
                value: fmt.format(topOpportunities),
                sub: 'Score >= 80',
                accent: 'text-sky-400',
                iconBg: 'bg-sky-500/10',
              },
              {
                icon: AlertTriangle,
                label: 'Deficit Nacional',
                value: fmt.format(nationalDeficit),
                sub: 'Cajones faltantes',
                accent: 'text-amber-400',
                iconBg: 'bg-amber-500/10',
              },
              {
                icon: MapPin,
                label: 'Ciudades Cubiertas',
                value: citiesCovered.toString(),
                sub: 'Capitales analizadas',
                accent: 'text-violet-400',
                iconBg: 'bg-violet-500/10',
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    {kpi.label}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-lg ${kpi.iconBg} flex items-center justify-center`}
                  >
                    <kpi.icon size={16} className={kpi.accent} />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${kpi.accent}`}>
                  {kpi.value}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/*  CITY COMPARISON GRID                       */}
        {/* ═══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-zinc-200">
              Ciudades Analizadas
            </h3>
            <Link
              href="/ciudades"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <CitySkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ciudades.slice(0, 4).map((ciudad) => (
                <Link
                  key={ciudad.id}
                  href={`/mapa?ciudad=${encodeURIComponent(ciudad.nombre)}`}
                  className="group bg-zinc-900 rounded-xl p-5 border border-zinc-800 hover:border-emerald-500/30 transition-all hover:bg-zinc-900/80"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                        {ciudad.nombre}
                      </h4>
                      <p className="text-sm text-zinc-500">
                        {ciudad.departamento}
                      </p>
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-zinc-600 group-hover:text-emerald-400 transition-colors mt-1"
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-zinc-500" />
                      {fmt.format(ciudad.total_predios)} predios
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={12} className="text-zinc-500" />
                      {fmt.format(ciudad.total_generadores)} generadores
                    </span>
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-amber-500" />
                      {fmt.format(ciudad.deficit_total_cajones)} deficit
                    </span>
                  </div>

                  {/* Deficit bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Deficit relativo</span>
                      <span className="text-amber-400 font-medium">
                        {fmt.format(ciudad.deficit_total_cajones)} cajones
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                        style={{
                          width: `${Math.round(
                            ((ciudad.deficit_total_cajones || 0) / maxDeficit) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/*  TOP 5 OPPORTUNITIES TABLE                  */}
        {/* ═══════════════════════════════════════════ */}
        <section>
          <h3 className="text-lg font-semibold text-zinc-200 mb-6">
            Top Oportunidades de Inversion
          </h3>
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-5 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="text-left px-5 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Predio
                      </th>
                      <th className="text-left px-5 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Ciudad
                      </th>
                      <th className="text-right px-5 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Area m2
                      </th>
                      <th className="text-center px-5 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="text-right px-5 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Cajones Est.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {predios.map((predio, idx) => (
                      <tr
                        key={predio.id}
                        className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/predio/${predio.id}`}
                            className="block"
                          >
                            <span className="text-zinc-500 font-mono text-xs">
                              #{idx + 1}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/predio/${predio.id}`}
                            className="text-zinc-200 font-medium hover:text-emerald-400 transition-colors"
                          >
                            {predio.nombre}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/predio/${predio.id}`}
                            className="block"
                          >
                            <span className="text-zinc-400">
                              {predio.ciudad_nombre}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/predio/${predio.id}`}
                            className="block"
                          >
                            <span className="text-zinc-300 font-mono text-xs">
                              {fmt.format(predio.area_m2)}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Link
                            href={`/predio/${predio.id}`}
                            className="block"
                          >
                            <span
                              className={`inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg text-xs font-bold border ${scoreBg(predio.score_total)} ${scoreColor(predio.score_total)}`}
                            >
                              {predio.score_total}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/predio/${predio.id}`}
                            className="block"
                          >
                            <span className="text-zinc-300 font-mono text-xs">
                              {fmt.format(predio.cajones_estimados || 0)}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {predios.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-8 text-center text-zinc-500"
                        >
                          No se encontraron predios
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPredios > 5 && (
                <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50">
                  <Link
                    href="/predios"
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    Ver los {fmt.format(totalPredios)} predios{' '}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/*  METHODOLOGY SECTION                        */}
        {/* ═══════════════════════════════════════════ */}
        <section>
          <h3 className="text-lg font-semibold text-zinc-200 mb-2">
            Metodologia de Scoring
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            Cada predio se evalua en 4 dimensiones ponderadas para generar un
            score de viabilidad compuesto.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Target,
                title: 'Demanda',
                weight: '40%',
                description:
                  'Analisis de deficit basado en generadores de demanda cercanos y factores normativos por tipo',
                accent: 'text-emerald-400',
                iconBg: 'bg-emerald-500/10',
                borderAccent: 'border-emerald-500/20',
              },
              {
                icon: Navigation,
                title: 'Accesibilidad',
                weight: '25%',
                description:
                  'Proximidad a vias principales, transporte publico y red de movilidad',
                accent: 'text-sky-400',
                iconBg: 'bg-sky-500/10',
                borderAccent: 'border-sky-500/20',
              },
              {
                icon: Ruler,
                title: 'Area',
                weight: '20%',
                description:
                  'Optimizacion del tamano del predio para operacion eficiente de parqueadero',
                accent: 'text-violet-400',
                iconBg: 'bg-violet-500/10',
                borderAccent: 'border-violet-500/20',
              },
              {
                icon: ShieldCheck,
                title: 'Restricciones',
                weight: '15%',
                description:
                  'Evaluacion de compatibilidad normativa, POT, BIC y restricciones ambientales',
                accent: 'text-amber-400',
                iconBg: 'bg-amber-500/10',
                borderAccent: 'border-amber-500/20',
              },
            ].map((dim) => (
              <div
                key={dim.title}
                className={`bg-zinc-900 rounded-xl p-5 border border-zinc-800 hover:${dim.borderAccent} transition-colors`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${dim.iconBg} flex items-center justify-center`}
                  >
                    <dim.icon size={20} className={dim.accent} />
                  </div>
                  <span
                    className={`text-xs font-bold ${dim.accent} px-2 py-0.5 rounded-md ${dim.iconBg}`}
                  >
                    {dim.weight}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-zinc-200 mb-2">
                  {dim.title}
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {dim.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/*  FOOTER                                     */}
        {/* ═══════════════════════════════════════════ */}
        <footer className="border-t border-zinc-800 pt-8 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-500/70">
                tensor.lat
              </span>
              <span>&mdash;</span>
              <span>Inteligencia Territorial</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center">
              <span>
                Datos: datos.gov.co | Google Places | OpenStreetMap
              </span>
              <span className="hidden sm:inline">&middot;</span>
              <span>Analisis: Claude AI (Anthropic)</span>
            </div>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
