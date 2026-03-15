import type { Predio } from "@/types";
import { ScoreBar } from "./ScoreBar";
import { Building2, ParkingSquare } from "lucide-react";

interface PredioCardProps {
  predio: Predio;
  onClick?: () => void;
  selected?: boolean;
}

export function PredioCard({ predio, onClick, selected = false }: PredioCardProps) {
  const areaFormatted = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(predio.area_m2);

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        selected
          ? "bg-zinc-800 border-emerald-500 ring-2 ring-emerald-500"
          : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-zinc-100 leading-tight line-clamp-1">
          {predio.nombre}
        </h3>
        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
          {predio.tipo_propietario}
        </span>
      </div>

      {/* Area */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
        <Building2 size={12} />
        <span>{areaFormatted} m2</span>
      </div>

      {/* Score */}
      <div className="mb-2">
        <ScoreBar value={predio.score_total} label="Score" size="sm" />
      </div>

      {/* Cajones */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <ParkingSquare size={12} />
        <span>{predio.cajones_estimados} cajones estimados</span>
      </div>
    </div>
  );
}
