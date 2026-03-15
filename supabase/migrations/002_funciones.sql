-- Funcion: predios en radio de un punto
CREATE OR REPLACE FUNCTION predios_en_radio(
  lat FLOAT, lng FLOAT, radio_metros FLOAT, ciudad TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID, nombre TEXT, direccion TEXT, area_m2 NUMERIC,
  score_total NUMERIC, distancia_metros FLOAT, geom GEOMETRY
) AS $$
  SELECT
    p.id, p.nombre, p.direccion, p.area_m2,
    p.score_total,
    ST_Distance(p.centroide::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distancia_metros,
    p.geom
  FROM predios p
  JOIN ciudades c ON c.id = p.ciudad_id
  WHERE ST_DWithin(
    p.centroide::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radio_metros
  )
  AND (ciudad IS NULL OR c.nombre ILIKE '%' || ciudad || '%')
  ORDER BY distancia_metros ASC;
$$ LANGUAGE SQL STABLE;

-- Funcion: calcular deficit de parqueaderos en radio
CREATE OR REPLACE FUNCTION deficit_parqueaderos(
  lat FLOAT, lng FLOAT, radio_metros FLOAT
)
RETURNS TABLE(
  total_generadores INTEGER,
  aforo_total INTEGER,
  capacidad_parqueaderos INTEGER,
  cajones_deficit INTEGER
) AS $$
  SELECT
    COUNT(DISTINCT g.id)::INTEGER AS total_generadores,
    COALESCE(SUM(g.aforo), 0)::INTEGER AS aforo_total,
    COALESCE((
      SELECT SUM(p.capacidad)
      FROM parqueaderos_existentes p
      WHERE ST_DWithin(p.geom::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radio_metros)
    ), 0)::INTEGER AS capacidad_parqueaderos,
    GREATEST(0, (COALESCE(SUM(g.aforo), 0) * 0.15)::INTEGER - COALESCE((
      SELECT SUM(p.capacidad)
      FROM parqueaderos_existentes p
      WHERE ST_DWithin(p.geom::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radio_metros)
    ), 0)::INTEGER) AS cajones_deficit
  FROM generadores_demanda g
  WHERE ST_DWithin(g.geom::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radio_metros);
$$ LANGUAGE SQL STABLE;
