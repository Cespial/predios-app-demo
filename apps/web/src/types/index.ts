export interface Ciudad {
  id: string;
  nombre: string;
  departamento: string;
  poblacion: number;
  lat: number;
  lng: number;
  total_predios?: number;
  total_generadores?: number;
  deficit_total_cajones?: number;
}

export interface Predio {
  id: string;
  ciudad_id: string;
  nombre: string;
  direccion: string;
  area_m2: number;
  propietario: string;
  tipo_propietario: string;
  uso_actual: string;
  geom: GeoJSON.Geometry | null;
  centroide_lat: number;
  centroide_lng: number;
  score_total: number;
  score_accesibilidad: number;
  score_demanda: number;
  score_area: number;
  score_restricciones: number;
  tiene_restriccion_bic: boolean;
  tiene_restriccion_etnica: boolean;
  tiene_restriccion_forestal: boolean;
  uso_suelo_pot: string;
  cajones_estimados: number;
  fuente: string;
  metadata: Record<string, unknown>;
  generadores_cercanos_count?: number;
  ciudad_nombre?: string;
}

export interface GeneradorDemanda {
  id: string;
  ciudad_id: string;
  nombre: string;
  tipo: GeneradorTipo;
  aforo: number;
  lat: number;
  lng: number;
  google_place_id: string;
  distancia_metros?: number;
  tiempo_caminando_min?: number;
}

export type GeneradorTipo =
  | 'estadio'
  | 'hospital'
  | 'clinica'
  | 'universidad'
  | 'metro'
  | 'centro_comercial'
  | 'coliseo';

export interface ParqueaderoExistente {
  id: string;
  ciudad_id: string;
  nombre: string;
  capacidad: number;
  tarifa_hora: number;
  tarifa_dia: number;
  lat: number;
  lng: number;
  distancia_metros?: number;
}

export interface FichaTecnica {
  id: string;
  predio_id: string;
  contenido_ia: FichaContenido;
  pdf_url: string | null;
  generado_en: string;
}

export interface FichaContenido {
  resumen_ejecutivo: string;
  cajones_recomendados: number;
  modelo_tarifario: {
    tarifa_fraccion_30min: number;
    tarifa_hora: number;
    tarifa_dia: number;
    tarifa_mes: number;
  };
  ingresos_estimados_mes: number;
  servicios_complementarios: string[];
  riesgos_principales: string[];
  vinculacion_plan_desarrollo: {
    municipal: string;
    departamental: string;
    nacional: string;
  };
  normativa_aplicable: NormativaItem[];
}

export interface NormativaItem {
  componente: string;
  norma: string;
  descripcion: string;
  aplica?: boolean;
}

export interface DeficitInfo {
  total_generadores: number;
  aforo_total: number;
  capacidad_parqueaderos: number;
  cajones_deficit: number;
}

export interface PredioDetalle extends Predio {
  generadores_cercanos: GeneradorDemanda[];
  parqueaderos_cercanos: ParqueaderoExistente[];
  ficha: FichaTecnica | null;
  normativa: NormativaItem[];
  deficit: DeficitInfo;
  generando_ficha?: boolean;
}

export interface PrediosResponse {
  predios: Predio[];
  total: number;
  page: number;
  pages: number;
}

export interface MapaGeoJSON {
  predios: GeoJSON.FeatureCollection;
  generadores: GeoJSON.FeatureCollection;
  parqueaderos: GeoJSON.FeatureCollection;
}
