"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

interface ROICalculatorProps {
  cajones: number;
  tarifaHora: number;
}

const TIPO_CONSTRUCCION = [
  { label: 'Superficie', costoMCajon: 15, key: 'superficie' },
  { label: 'Estructura', costoMCajon: 35, key: 'estructura' },
  { label: 'Subterráneo', costoMCajon: 55, key: 'subterraneo' },
] as const;

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

function paybackColor(years: number) {
  if (years < 5) return { text: 'text-emerald-400', label: 'Atractivo' };
  if (years <= 8) return { text: 'text-yellow-400', label: 'Moderado' };
  return { text: 'text-red-400', label: 'Alto riesgo' };
}

export function IngresoSimulador({
  cajones,
  tarifaHora,
}: ROICalculatorProps) {
  const [ocupacion, setOcupacion] = useState(60);
  const [horasOp, setHorasOp] = useState(14);
  const [tipoIdx, setTipoIdx] = useState(0);

  const tipo = TIPO_CONSTRUCCION[tipoIdx];
  const opexRate = 0.35;

  const ingresoBruto = cajones * (ocupacion / 100) * horasOp * tarifaHora * 30;
  const ingresoNeto = Math.round(ingresoBruto * (1 - opexRate));
  const inversionTotal = cajones * tipo.costoMCajon * 1_000_000;
  const paybackYears = ingresoNeto > 0 ? inversionTotal / (ingresoNeto * 12) : Infinity;
  const roiAnual = inversionTotal > 0 ? ((ingresoNeto * 12) / inversionTotal) * 100 : 0;
  const pb = paybackColor(paybackYears);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator size={16} className="text-emerald-400" />
        <span className="text-sm font-semibold text-zinc-200">
          Modelo Financiero
        </span>
      </div>

      {/* Input info */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <span className="text-zinc-500">Cajones</span>
          <p className="text-zinc-200 font-medium text-lg">{cajones}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <span className="text-zinc-500">Tarifa / hora</span>
          <p className="text-zinc-200 font-medium text-lg">
            {formatCOP(tarifaHora)}
          </p>
        </div>
      </div>

      {/* Tipo de construcción */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Tipo de construcción</label>
        <div className="grid grid-cols-3 gap-2">
          {TIPO_CONSTRUCCION.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTipoIdx(i)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                tipoIdx === i
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-zinc-400">Ocupación promedio</label>
            <span className="text-xs font-semibold text-emerald-400">
              {ocupacion}%
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={95}
            value={ocupacion}
            onChange={(e) => setOcupacion(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-zinc-400">Horas operación</label>
            <span className="text-xs font-semibold text-emerald-400">
              {horasOp}h
            </span>
          </div>
          <input
            type="range"
            min={8}
            max={24}
            value={horasOp}
            onChange={(e) => setHorasOp(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
          Resultados financieros
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-[10px] text-zinc-500 uppercase">Inversión total</p>
            <p className="text-sm font-bold text-zinc-200">{formatCOP(inversionTotal)}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
            <p className="text-[10px] text-zinc-500 uppercase">Ingreso neto/mes</p>
            <p className="text-sm font-bold text-emerald-300">{formatCOP(ingresoNeto)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-[10px] text-zinc-500 uppercase">Recuperación</p>
            <p className={`text-sm font-bold ${pb.text}`}>
              {paybackYears === Infinity ? '—' : paybackYears.toFixed(1)} años
            </p>
            <span className={`text-[10px] ${pb.text}`}>{pb.label}</span>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-[10px] text-zinc-500 uppercase">ROI anual</p>
            <p className="text-sm font-bold text-zinc-200">{roiAnual.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-zinc-500 leading-relaxed">
        Estimaciones indicativas. No reemplaza un estudio de factibilidad profesional.
      </p>
    </div>
  );
}
