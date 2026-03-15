"use client";

import { useState } from "react";
import type { NormativaItem } from "@/types";
import { ChevronDown, ChevronRight, Check, X, HelpCircle } from "lucide-react";

interface ChecklistNormativoProps {
  items: NormativaItem[];
}

function AplicaBadge({ aplica }: { aplica?: boolean }) {
  if (aplica === true) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
        <Check size={12} />
        Aplica
      </span>
    );
  }
  if (aplica === false) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
        <X size={12} />
        No aplica
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
      <HelpCircle size={12} />
      Por verificar
    </span>
  );
}

export function ChecklistNormativo({ items }: ChecklistNormativoProps) {
  // Group items by componente
  const grouped = items.reduce<Record<string, NormativaItem[]>>((acc, item) => {
    const key = item.componente;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(Object.keys(grouped))
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4 text-center">
        No hay normativa disponible.
      </p>
    );
  }

  return (
    <div className="w-full space-y-2">
      {Object.entries(grouped).map(([componente, normas]) => {
        const isExpanded = expandedGroups.has(componente);
        return (
          <div
            key={componente}
            className="border border-zinc-800 rounded-lg overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(componente)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-zinc-200">
                {componente}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {normas.length} norma{normas.length !== 1 ? "s" : ""}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-zinc-500" />
                ) : (
                  <ChevronRight size={16} className="text-zinc-500" />
                )}
              </div>
            </button>

            {/* Table */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-zinc-800 text-zinc-500 text-xs">
                      <th className="text-left px-4 py-2 font-medium">Norma</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Descripcion
                      </th>
                      <th className="text-center px-4 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normas.map((norma, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-2 text-zinc-300 font-medium whitespace-nowrap">
                          {norma.norma}
                        </td>
                        <td className="px-4 py-2 text-zinc-400">
                          {norma.descripcion}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <AplicaBadge aplica={norma.aplica} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
