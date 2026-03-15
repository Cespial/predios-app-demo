-- Sprint 3: Scoring config versioning + per-type demand factors

-- Versionable scoring weights
CREATE TABLE IF NOT EXISTS scoring_config (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  activa BOOLEAN DEFAULT false,
  w_area NUMERIC NOT NULL DEFAULT 0.20,
  w_accesibilidad NUMERIC NOT NULL DEFAULT 0.25,
  w_demanda NUMERIC NOT NULL DEFAULT 0.40,
  w_restricciones NUMERIC NOT NULL DEFAULT 0.15,
  created_at TIMESTAMPTZ DEFAULT now(),
  notas TEXT
);

INSERT INTO scoring_config (version, activa, w_area, w_accesibilidad, w_demanda, w_restricciones, notas)
VALUES ('v1.0', true, 0.20, 0.25, 0.40, 0.15, 'Pesos iniciales del demo')
ON CONFLICT (version) DO NOTHING;

-- Parking demand factors by generator type (replaces fixed 15%)
CREATE TABLE IF NOT EXISTS factores_demanda_parqueadero (
  tipo_generador TEXT PRIMARY KEY,
  factor_cajones NUMERIC NOT NULL,
  fuente TEXT,
  notas TEXT
);

INSERT INTO factores_demanda_parqueadero (tipo_generador, factor_cajones, fuente, notas) VALUES
  ('estadio', 0.08, 'POT Medellín Art. 255', 'Eventos deportivos: 8% del aforo requiere cajón'),
  ('hospital', 0.20, 'Decreto 1077/2015', 'Alta rotación de visitantes y personal'),
  ('clinica', 0.25, 'Decreto 1077/2015', 'Similar a hospital pero mayor densidad'),
  ('universidad', 0.05, 'POT genérico', 'Bajo por transporte público estudiantil'),
  ('metro', 0.02, 'Estándar intermodal', 'Muy bajo: usuarios llegan en transporte público'),
  ('centro_comercial', 0.12, 'Decreto 1077/2015 Art. 2.2.6', 'Comercio: 1 cajón por cada 8 visitantes'),
  ('coliseo', 0.10, 'POT genérico', 'Eventos: 10% del aforo')
ON CONFLICT (tipo_generador) DO UPDATE SET factor_cajones = EXCLUDED.factor_cajones;

-- Improved deficit function using per-type factors
CREATE OR REPLACE FUNCTION deficit_parqueaderos_v2(
  lat FLOAT, lng FLOAT, radio_metros FLOAT
)
RETURNS TABLE(
  total_generadores INTEGER,
  aforo_total INTEGER,
  demanda_ponderada INTEGER,
  capacidad_parqueaderos INTEGER,
  cajones_deficit INTEGER
) AS $$
  WITH generadores_en_radio AS (
    SELECT g.id, g.tipo, g.aforo,
           COALESCE(f.factor_cajones, 0.15) AS factor
    FROM generadores_demanda g
    LEFT JOIN factores_demanda_parqueadero f ON f.tipo_generador = g.tipo
    WHERE ST_DWithin(g.geom::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radio_metros)
  ),
  parq AS (
    SELECT COALESCE(SUM(p.capacidad), 0)::INTEGER AS cap
    FROM parqueaderos_existentes p
    WHERE ST_DWithin(p.geom::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radio_metros)
  )
  SELECT
    COUNT(DISTINCT g.id)::INTEGER AS total_generadores,
    COALESCE(SUM(g.aforo), 0)::INTEGER AS aforo_total,
    COALESCE(SUM((g.aforo * g.factor)::INTEGER), 0)::INTEGER AS demanda_ponderada,
    (SELECT cap FROM parq)::INTEGER AS capacidad_parqueaderos,
    GREATEST(0, COALESCE(SUM((g.aforo * g.factor)::INTEGER), 0) - (SELECT cap FROM parq))::INTEGER AS cajones_deficit
  FROM generadores_en_radio g;
$$ LANGUAGE SQL STABLE;

-- RLS
ALTER TABLE scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE factores_demanda_parqueadero ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lectura publica scoring" ON scoring_config FOR SELECT USING (true);
CREATE POLICY "lectura publica factores" ON factores_demanda_parqueadero FOR SELECT USING (true);

-- Flag to distinguish demo vs production data
ALTER TABLE predios ADD COLUMN IF NOT EXISTS es_demo BOOLEAN DEFAULT true;
