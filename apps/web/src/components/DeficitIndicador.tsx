interface DeficitIndicadorProps {
  oferta: number;
  demanda: number;
}

export function DeficitIndicador({ oferta, demanda }: DeficitIndicadorProps) {
  const deficit = demanda - oferta;
  const total = Math.max(demanda, oferta, 1);
  const ofertaPct = Math.min((oferta / total) * 100, 100);
  const deficitPct = deficit > 0 ? (deficit / total) * 100 : 0;

  const formatNum = (n: number) =>
    new Intl.NumberFormat("es-CO").format(Math.round(n));

  return (
    <div className="w-full">
      {/* Labels */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span className="text-zinc-400">
            Oferta: <span className="text-zinc-200 font-medium">{formatNum(oferta)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span className="text-zinc-400">
            Demanda: <span className="text-zinc-200 font-medium">{formatNum(demanda)}</span>
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="w-full h-3 bg-zinc-700 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${ofertaPct}%` }}
        />
        {deficitPct > 0 && (
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${deficitPct}%` }}
          />
        )}
      </div>

      {/* Deficit value */}
      {deficit > 0 ? (
        <p className="mt-1.5 text-xs text-red-400 font-semibold">
          Deficit: {formatNum(deficit)} cajones
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-emerald-400 font-semibold">
          Superavit: {formatNum(Math.abs(deficit))} cajones
        </p>
      )}
    </div>
  );
}
