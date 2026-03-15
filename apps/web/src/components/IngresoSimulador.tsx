"use client";

import { useState } from "react";
import { Calculator, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface IngresoSimuladorProps {
  cajones: number;
  tarifaHora: number;
}

function calcIngresoMensual(
  cajones: number,
  ocupacion: number,
  horasOp: number,
  tarifaHora: number
): number {
  return cajones * ocupacion * horasOp * tarifaHora * 30;
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

export function IngresoSimulador({
  cajones,
  tarifaHora,
}: IngresoSimuladorProps) {
  const [ocupacion, setOcupacion] = useState(60);
  const [horasOp, setHorasOp] = useState(14);

  const pesimista = calcIngresoMensual(cajones, 0.4, horasOp, tarifaHora);
  const base = calcIngresoMensual(cajones, ocupacion / 100, horasOp, tarifaHora);
  const optimista = calcIngresoMensual(cajones, 0.8, horasOp, tarifaHora);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator size={16} className="text-emerald-400" />
        <span className="text-sm font-semibold text-zinc-200">
          Simulador de Ingresos
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

      {/* Sliders */}
      <div className="space-y-3">
        {/* Ocupacion */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-zinc-400">Ocupacion promedio</label>
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
          <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
            <span>30%</span>
            <span>95%</span>
          </div>
        </div>

        {/* Horas operacion */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-zinc-400">Horas operacion</label>
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
          <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
            <span>8h</span>
            <span>24h</span>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div className="space-y-2">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
          Escenarios mensuales
        </h4>

        {/* Pesimista */}
        <div className="flex items-center justify-between bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-red-400" />
            <div>
              <span className="text-xs text-zinc-400">Pesimista</span>
              <span className="text-[10px] text-zinc-600 ml-1">(40% ocu.)</span>
            </div>
          </div>
          <span className="text-sm font-bold text-red-300">
            {formatCOP(pesimista)}
          </span>
        </div>

        {/* Base */}
        <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <Minus size={14} className="text-emerald-400" />
            <div>
              <span className="text-xs text-zinc-400">Base</span>
              <span className="text-[10px] text-zinc-600 ml-1">
                ({ocupacion}% ocu.)
              </span>
            </div>
          </div>
          <span className="text-sm font-bold text-emerald-300">
            {formatCOP(base)}
          </span>
        </div>

        {/* Optimista */}
        <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/10 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-400" />
            <div>
              <span className="text-xs text-zinc-400">Optimista</span>
              <span className="text-[10px] text-zinc-600 ml-1">(80% ocu.)</span>
            </div>
          </div>
          <span className="text-sm font-bold text-blue-300">
            {formatCOP(optimista)}
          </span>
        </div>
      </div>
    </div>
  );
}
