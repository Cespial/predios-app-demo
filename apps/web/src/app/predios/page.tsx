'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Trophy,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  X,
} from 'lucide-react';
import type { Predio, PrediosResponse } from '@/types';

const fmt = new Intl.NumberFormat('es-CO');
const TABS = ['Todas', 'Medellin', 'Cali', 'Bogota', 'Barranquilla'];
const PAGE_SIZE = 20;

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

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreBg(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${scoreColor(value)}`}>
        {value}
      </span>
    </div>
  );
}

function RestrictionBadge({
  bic,
  etnica,
  forestal,
}: {
  bic: boolean;
  etnica: boolean;
  forestal: boolean;
}) {
  const restrictions: { label: string; cls: string }[] = [];
  if (bic)
    restrictions.push({
      label: 'BIC',
      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    });
  if (etnica)
    restrictions.push({
      label: 'Etnica',
      cls: 'bg-red-500/10 text-red-400 border-red-500/20',
    });
  if (forestal)
    restrictions.push({
      label: 'Forestal',
      cls: 'bg-green-500/10 text-green-400 border-green-500/20',
    });
  if (restrictions.length === 0) {
    restrictions.push({
      label: 'Ninguna',
      cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    });
  }
  return (
    <div className="flex flex-wrap gap-1">
      {restrictions.map((r) => (
        <span
          key={r.label}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${r.cls}`}
        >
          {r.label}
        </span>
      ))}
    </div>
  );
}

/* ── Skeleton Row ── */
function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-800/50">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 bg-zinc-800 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

/* ── Stat Card ── */
function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  iconColor: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-xl font-bold text-zinc-100">{value}</p>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[180px]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Preview Modal ── */
function PreviewModal({
  predio,
  onClose,
  onNavigate,
}: {
  predio: Predio;
  onClose: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100">
            {predio.nombre}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500">Direccion</p>
              <p className="text-sm text-zinc-200">{predio.direccion}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ciudad</p>
              <p className="text-sm text-zinc-200">
                {predio.ciudad_nombre || '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Propietario</p>
              <p className="text-sm text-zinc-200">{predio.propietario}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Area</p>
              <p className="text-sm text-zinc-200">
                {fmt.format(predio.area_m2)} m&sup2;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${
                predio.score_total >= 80
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : predio.score_total >= 60
                  ? 'bg-yellow-500/15 text-yellow-400'
                  : predio.score_total >= 40
                  ? 'bg-orange-500/15 text-orange-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              {predio.score_total}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Área</span>
                <span className={scoreColor(predio.score_area)}>
                  {predio.score_area}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Accesibilidad</span>
                <span className={scoreColor(predio.score_accesibilidad)}>
                  {predio.score_accesibilidad}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Demanda</span>
                <span className={scoreColor(predio.score_demanda)}>
                  {predio.score_demanda}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Viab. Legal</span>
                <span className={scoreColor(predio.score_restricciones)}>
                  {predio.score_restricciones}
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-1">Restricciones</p>
            <RestrictionBadge
              bic={predio.tiene_restriccion_bic}
              etnica={predio.tiene_restriccion_etnica}
              forestal={predio.tiene_restriccion_forestal}
            />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={onNavigate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <ExternalLink size={14} />
            Ver ficha
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                              */
/* ════════════════════════════════════════════════════════ */
export default function PrediosPage() {
  const router = useRouter();
  const [predios, setPredios] = useState<Predio[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [activeTab, setActiveTab] = useState('Todas');
  const [sortField, setSortField] = useState<string>('score_total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPredio, setPreviewPredio] = useState<Predio | null>(null);

  const fetchPredios = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (activeTab !== 'Todas') params.set('ciudad', activeTab);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    fetch(`/api/predios?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Error al cargar predios');
        return r.json();
      })
      .then((data: PrediosResponse) => {
        setPredios(data.predios || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  useEffect(() => {
    fetchPredios();
  }, [fetchPredios]);

  const sortedPredios = useMemo(() => {
    const sorted = [...predios];
    sorted.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortField];
      const bVal = (b as unknown as Record<string, unknown>)[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortDir === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return sorted;
  }, [predios, sortField, sortDir]);

  const stats = useMemo(() => {
    if (predios.length === 0) {
      return { total: 0, topName: '\u2014', topScore: 0, deficitTotal: 0 };
    }
    const top = predios.reduce((best, p) =>
      p.score_total > best.score_total ? p : best
    );
    const deficit = predios.reduce(
      (sum, p) => sum + (p.cajones_estimados ?? 0),
      0
    );
    return {
      total,
      topName: top.nombre,
      topScore: top.score_total,
      deficitTotal: deficit,
    };
  }, [predios, total]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field)
      return <ArrowUpDown size={12} className="text-zinc-600" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-emerald-400" />
    ) : (
      <ArrowDown size={12} className="text-emerald-400" />
    );
  };

  const handleExportCSV = () => {
    const headers = [
      'Nombre',
      'Ciudad',
      'Propietario',
      'Area (m2)',
      'Score Total',
      'Score Demanda',
      'Cajones Est.',
      'BIC',
      'Etnica',
      'Forestal',
    ];
    const rows = sortedPredios.map((p) => [
      `"${p.nombre}"`,
      p.ciudad_nombre || '',
      `"${p.propietario}"`,
      p.area_m2,
      p.score_total,
      p.score_demanda,
      p.cajones_estimados,
      p.tiene_restriccion_bic ? 'Si' : 'No',
      p.tiene_restriccion_etnica ? 'Si' : 'No',
      p.tiene_restriccion_forestal ? 'Si' : 'No',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predios-${activeTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Oportunidades de Inversión
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Lotes públicos ordenados por viabilidad para inversión en parqueaderos</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={predios.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Building2}
          label="Total Lotes"
          value={fmt.format(stats.total)}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          icon={Trophy}
          label="Mayor Viabilidad"
          value={String(stats.topScore)}
          subtitle={stats.topName}
          iconColor="bg-yellow-500/10 text-yellow-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Total Cajones Faltantes"
          value={fmt.format(stats.deficitTotal)}
          iconColor="bg-red-500/10 text-red-400"
        />
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchPredios}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                {[
                  { key: 'nombre', label: 'Lote' },
                  { key: 'ciudad_nombre', label: 'Ciudad' },
                  { key: 'propietario', label: 'Propietario' },
                  { key: 'area_m2', label: 'Area (m2)' },
                  { key: 'score_total', label: 'Viabilidad' },
                  { key: 'score_demanda', label: 'Demanda' },
                  { key: 'cajones_estimados', label: 'Cajones Est.' },
                  { key: 'restricciones', label: 'Viab. Legal' },
                  { key: 'acciones', label: 'Acciones' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider ${
                      col.key !== 'restricciones' && col.key !== 'acciones'
                        ? 'cursor-pointer hover:text-zinc-200 select-none'
                        : ''
                    }`}
                    onClick={() => {
                      if (
                        col.key !== 'restricciones' &&
                        col.key !== 'acciones'
                      ) {
                        handleSort(col.key);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.key !== 'restricciones' &&
                        col.key !== 'acciones' && (
                          <SortIcon field={col.key} />
                        )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))
              ) : sortedPredios.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <Building2
                      size={32}
                      className="mx-auto text-zinc-600 mb-2"
                    />
                    <p className="text-zinc-500 text-sm">
                      No se encontraron lotes
                    </p>
                  </td>
                </tr>
              ) : (
                sortedPredios.map((predio) => (
                  <tr
                    key={predio.id}
                    onClick={() => setPreviewPredio(predio)}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div>
                        <p className="font-medium text-zinc-200 truncate max-w-[200px]">
                          {predio.nombre}
                        </p>
                        <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                          {predio.direccion}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-300">
                      {predio.ciudad_nombre || '\u2014'}
                    </td>
                    <td className="px-3 py-3 text-zinc-300">
                      {predio.propietario}
                    </td>
                    <td className="px-3 py-3 text-zinc-300 tabular-nums">
                      {fmt.format(predio.area_m2)}
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar value={predio.score_total} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar value={predio.score_demanda} />
                    </td>
                    <td className="px-3 py-3 text-zinc-300 tabular-nums">
                      {fmt.format(predio.cajones_estimados)}
                    </td>
                    <td className="px-3 py-3">
                      <RestrictionBadge
                        bic={predio.tiene_restriccion_bic}
                        etnica={predio.tiene_restriccion_etnica}
                        forestal={predio.tiene_restriccion_forestal}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/predio/${predio.id}`);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 text-xs font-medium hover:bg-emerald-600/20 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              Mostrando {(page - 1) * PAGE_SIZE + 1}&ndash;
              {Math.min(page * PAGE_SIZE, total)} de {fmt.format(total)}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                let p: number;
                if (pages <= 5) {
                  p = i + 1;
                } else if (page <= 3) {
                  p = i + 1;
                } else if (page >= pages - 2) {
                  p = pages - 4 + i;
                } else {
                  p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      page === p
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewPredio && (
        <PreviewModal
          predio={previewPredio}
          onClose={() => setPreviewPredio(null)}
          onNavigate={() => router.push(`/predio/${previewPredio.id}`)}
        />
      )}
    </div>
  );
}
