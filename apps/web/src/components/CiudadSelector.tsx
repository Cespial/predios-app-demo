"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { ChevronDown } from "lucide-react";
import type { Ciudad } from "@/types";

export function CiudadSelector() {
  const { ciudadActiva, ciudades, setCiudadActiva, setCiudades } = useStore();

  useEffect(() => {
    async function fetchCiudades() {
      try {
        const res = await fetch("/api/ciudades");
        if (!res.ok) throw new Error("Error al cargar ciudades");
        const data: Ciudad[] = await res.json();
        setCiudades(data);
        if (!ciudadActiva && data.length > 0) {
          setCiudadActiva(data[0]);
        }
      } catch (err) {
        console.error("Error fetching ciudades:", err);
      }
    }
    fetchCiudades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ciudad = ciudades.find((c) => c.id === e.target.value);
    if (ciudad) setCiudadActiva(ciudad);
  };

  return (
    <div className="relative">
      <select
        value={ciudadActiva?.id ?? ""}
        onChange={handleChange}
        className="appearance-none w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors cursor-pointer"
      >
        <option value="" disabled>
          Seleccionar ciudad
        </option>
        {ciudades.map((ciudad) => (
          <option key={ciudad.id} value={ciudad.id}>
            {ciudad.nombre} - {ciudad.departamento}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
      />
    </div>
  );
}
