"use client";

import { useState, useEffect, useCallback } from "react";
import type { FichaTecnica } from "@/types";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

interface FichaTecnicaAIProps {
  predioId: string;
}

type FichaState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; ficha: FichaTecnica };

const sectionLabels: Record<string, string> = {
  resumen_ejecutivo: "Resumen Ejecutivo",
  modelo_tarifario: "Modelo Tarifario",
  servicios_complementarios: "Servicios Complementarios",
  riesgos_principales: "Riesgos Principales",
  vinculacion_plan_desarrollo: "Vinculacion Plan de Desarrollo",
};

export function FichaTecnicaAI({ predioId }: FichaTecnicaAIProps) {
  const [state, setState] = useState<FichaState>({ status: "loading" });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["resumen_ejecutivo"])
  );
  const [regenerating, setRegenerating] = useState(false);

  const fetchFicha = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/predios/${predioId}/ficha`);
      if (!res.ok) throw new Error("Error al cargar la ficha tecnica");
      const ficha: FichaTecnica = await res.json();
      setState({ status: "success", ficha });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }, [predioId]);

  useEffect(() => {
    fetchFicha();
  }, [fetchFicha]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/predios/${predioId}/ficha`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Error al regenerar la ficha");
      const ficha: FichaTecnica = await res.json();
      setState({ status: "success", ficha });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Error al regenerar",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // Loading state
  if (state.status === "loading") {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4">
          <Sparkles size={16} className="animate-pulse" />
          <span className="animate-pulse">Analizando con IA...</span>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/3" />
            <div className="h-3 bg-zinc-800 rounded animate-pulse w-full" />
            <div className="h-3 bg-zinc-800 rounded animate-pulse w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-300">{state.message}</p>
          </div>
          <button
            onClick={fetchFicha}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Success state
  const { ficha } = state;
  const contenido = ficha.contenido_ia;
  const formatCOP = (n: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(n);

  const sections = [
    {
      key: "resumen_ejecutivo",
      content: (
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {contenido.resumen_ejecutivo}
        </p>
      ),
    },
    {
      key: "modelo_tarifario",
      content: (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <span className="text-zinc-500 text-xs">Fraccion 30 min</span>
            <p className="text-zinc-200 font-medium">
              {formatCOP(contenido.modelo_tarifario.tarifa_fraccion_30min)}
            </p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <span className="text-zinc-500 text-xs">Hora</span>
            <p className="text-zinc-200 font-medium">
              {formatCOP(contenido.modelo_tarifario.tarifa_hora)}
            </p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <span className="text-zinc-500 text-xs">Dia</span>
            <p className="text-zinc-200 font-medium">
              {formatCOP(contenido.modelo_tarifario.tarifa_dia)}
            </p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <span className="text-zinc-500 text-xs">Mes</span>
            <p className="text-zinc-200 font-medium">
              {formatCOP(contenido.modelo_tarifario.tarifa_mes)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "servicios_complementarios",
      content: (
        <ul className="space-y-1.5">
          {contenido.servicios_complementarios.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "riesgos_principales",
      content: (
        <ul className="space-y-1.5">
          {contenido.riesgos_principales.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "vinculacion_plan_desarrollo",
      content: (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-zinc-500 text-xs">Municipal</span>
            <p className="text-zinc-300">
              {contenido.vinculacion_plan_desarrollo.municipal}
            </p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Departamental</span>
            <p className="text-zinc-300">
              {contenido.vinculacion_plan_desarrollo.departamental}
            </p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Nacional</span>
            <p className="text-zinc-300">
              {contenido.vinculacion_plan_desarrollo.nacional}
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      {/* Header with regenerate button */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-200">
            Ficha Tecnica IA
          </span>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={12}
            className={regenerating ? "animate-spin" : ""}
          />
          {regenerating ? "Generando..." : "Regenerar"}
        </button>
      </div>

      {/* Cajones & Ingreso header */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <span className="text-emerald-400 text-xs">Cajones recomendados</span>
          <p className="text-emerald-300 text-lg font-bold">
            {contenido.cajones_recomendados}
          </p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <span className="text-emerald-400 text-xs">Ingresos estimados/mes</span>
          <p className="text-emerald-300 text-lg font-bold">
            {formatCOP(contenido.ingresos_estimados_mes)}
          </p>
        </div>
      </div>

      {/* Accordion sections */}
      {sections.map(({ key, content }) => {
        const isExpanded = expandedSections.has(key);
        return (
          <div
            key={key}
            className="border border-zinc-800 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left"
            >
              <span className="text-sm font-medium text-zinc-200">
                {sectionLabels[key] ?? key}
              </span>
              {isExpanded ? (
                <ChevronDown size={16} className="text-zinc-500" />
              ) : (
                <ChevronRight size={16} className="text-zinc-500" />
              )}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 pt-1">{content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
