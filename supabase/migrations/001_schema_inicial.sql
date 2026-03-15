-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
-- CREATE EXTENSION IF NOT EXISTS pgvector; -- Not available on this Supabase plan
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ciudades
CREATE TABLE ciudades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  departamento TEXT NOT NULL,
  poblacion INTEGER,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Predios
CREATE TABLE predios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad_id UUID REFERENCES ciudades(id),
  nombre TEXT,
  direccion TEXT,
  area_m2 NUMERIC,
  propietario TEXT,
  tipo_propietario TEXT,
  uso_actual TEXT,
  geom GEOMETRY(Polygon, 4326),
  centroide GEOMETRY(Point, 4326),
  score_total NUMERIC DEFAULT 0,
  score_accesibilidad NUMERIC DEFAULT 0,
  score_demanda NUMERIC DEFAULT 0,
  score_area NUMERIC DEFAULT 0,
  score_restricciones NUMERIC DEFAULT 0,
  tiene_restriccion_bic BOOLEAN DEFAULT false,
  tiene_restriccion_etnica BOOLEAN DEFAULT false,
  tiene_restriccion_forestal BOOLEAN DEFAULT false,
  uso_suelo_pot TEXT,
  cajones_estimados INTEGER,
  fuente TEXT,
  metadata JSONB,
  -- embedding vector(1536), -- Requires pgvector extension
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generadores de demanda
CREATE TABLE generadores_demanda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad_id UUID REFERENCES ciudades(id),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  aforo INTEGER,
  geom GEOMETRY(Point, 4326),
  google_place_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parqueaderos existentes
CREATE TABLE parqueaderos_existentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad_id UUID REFERENCES ciudades(id),
  nombre TEXT,
  capacidad INTEGER,
  tarifa_hora NUMERIC,
  tarifa_dia NUMERIC,
  geom GEOMETRY(Point, 4326),
  google_place_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Relacion predios-generadores
CREATE TABLE predios_generadores (
  predio_id UUID REFERENCES predios(id),
  generador_id UUID REFERENCES generadores_demanda(id),
  distancia_metros NUMERIC,
  tiempo_caminando_min NUMERIC,
  PRIMARY KEY (predio_id, generador_id)
);

-- Fichas tecnicas
CREATE TABLE fichas_tecnicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predio_id UUID REFERENCES predios(id),
  contenido_ia JSONB,
  pdf_url TEXT,
  generado_en TIMESTAMPTZ DEFAULT now()
);

-- Normativa
CREATE TABLE normativa_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predio_id UUID REFERENCES predios(id),
  componente TEXT,
  norma TEXT,
  descripcion TEXT,
  aplica BOOLEAN,
  fuente TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Spatial indexes
CREATE INDEX predios_geom_idx ON predios USING GIST(geom);
CREATE INDEX predios_centroide_idx ON predios USING GIST(centroide);
CREATE INDEX generadores_geom_idx ON generadores_demanda USING GIST(geom);
CREATE INDEX parqueaderos_geom_idx ON parqueaderos_existentes USING GIST(geom);
-- CREATE INDEX predios_embedding_idx ON predios USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX predios_ciudad_idx ON predios(ciudad_id);
CREATE INDEX predios_score_idx ON predios(score_total DESC);
