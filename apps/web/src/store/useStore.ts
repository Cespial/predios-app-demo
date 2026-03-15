import { create } from 'zustand';
import type { Ciudad, Predio } from '@/types';

interface Filtros {
  scoreMin: number;
  areaMin: number;
  propietarios: string[];
  sinRestricciones: boolean;
}

interface AppState {
  ciudadActiva: Ciudad | null;
  ciudades: Ciudad[];
  predioSeleccionado: Predio | null;
  filtros: Filtros;
  panelDetalleAbierto: boolean;
  capasVisibles: {
    predios: boolean;
    generadores: boolean;
    parqueaderos: boolean;
    deficit: boolean;
  };
  setCiudadActiva: (ciudad: Ciudad) => void;
  setCiudades: (ciudades: Ciudad[]) => void;
  setPredioSeleccionado: (predio: Predio | null) => void;
  setFiltros: (filtros: Partial<Filtros>) => void;
  setPanelDetalleAbierto: (abierto: boolean) => void;
  toggleCapa: (capa: keyof AppState['capasVisibles']) => void;
}

export const useStore = create<AppState>((set) => ({
  ciudadActiva: null,
  ciudades: [],
  predioSeleccionado: null,
  filtros: {
    scoreMin: 0,
    areaMin: 0,
    propietarios: [],
    sinRestricciones: false,
  },
  panelDetalleAbierto: false,
  capasVisibles: {
    predios: true,
    generadores: true,
    parqueaderos: true,
    deficit: true,
  },
  setCiudadActiva: (ciudad) => set({ ciudadActiva: ciudad, predioSeleccionado: null, panelDetalleAbierto: false }),
  setCiudades: (ciudades) => set({ ciudades }),
  setPredioSeleccionado: (predio) => set({ predioSeleccionado: predio, panelDetalleAbierto: !!predio }),
  setFiltros: (filtros) => set((state) => ({ filtros: { ...state.filtros, ...filtros } })),
  setPanelDetalleAbierto: (abierto) => set({ panelDetalleAbierto: abierto }),
  toggleCapa: (capa) =>
    set((state) => ({
      capasVisibles: { ...state.capasVisibles, [capa]: !state.capasVisibles[capa] },
    })),
}));
