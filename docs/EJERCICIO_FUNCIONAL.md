# Ejercicio Funcional: De Demo a Herramienta Real
## tensor.lat — Identificador de Predios para Parqueaderos

---

## 1. DIAGNÓSTICO: ¿Qué tiene el demo vs. qué necesita la herramienta real?

| Dimensión | Demo actual | Herramienta funcional |
|---|---|---|
| **Predios** | 11 predios hardcoded con coordenadas inventadas | Todos los predios públicos/institucionales reales (catastro IGAC + inventarios municipales) |
| **Scoring** | Scores asignados manualmente | Scoring calculado dinámicamente desde datos reales (tráfico, densidad, distancias) |
| **Demanda** | 20 generadores estáticos con aforos estimados | POIs reales con datos de Google Places + aforos verificados + datos de tráfico |
| **Oferta** | 9 parqueaderos con capacidades inventadas | Inventario real de parqueaderos (Google Places + OSM + datos municipales) |
| **Normativa** | Checklist genérico generado por IA | Consulta real al POT de cada ciudad + registro de BIC + restricciones ambientales |
| **Financiero** | Simulador con tarifa fija | Modelo financiero con tarifas reales del mercado, costos de construcción, proyección de ingresos |
| **Geografía** | 4 ciudades sin cobertura real | Cobertura completa de zonas urbanas con geometrías catastrales reales |

---

## 2. FUENTES DE DATOS REALES DISPONIBLES

### 2.1 CAPA DE PREDIOS (Supply — ¿Dónde hay lotes disponibles?)

| Fuente | Dataset / API | Contenido | Registros | Acceso |
|---|---|---|---|---|
| **datos.gov.co** | `sbzv-2tci` | Inventario parques urbanos Bogotá (predios públicos) | 67,592 | Abierto, API REST |
| **datos.gov.co** | `vpxk-gn4h` | Predios activos en predial (dirección, área, área construida) | ~miles | Abierto |
| **datos.gov.co** | `4ia4-yfd4` | Predios públicos municipales y sus usos | Variable | Abierto (tipo map) |
| **IGAC Geoservicios** | WFS Catastro | Polígonos catastrales con información predial | Nacional | WFS público (requiere configuración) |
| **Geoportal IGAC** | https://geoportal.igac.gov.co | Visor catastral con capas de predios | Nacional | Web scraping / WMS |
| **SNR (Notariado)** | ORIP | Cadena de propiedad, gravámenes, embargos | Nacional | Requiere convenio |
| **Alcaldías** | Secretarías de Hacienda | Inventarios de bienes inmuebles del municipio | Por ciudad | Solicitud formal |

**Estrategia de adquisición:**
```
PRIORIDAD 1 (inmediata):
  → datos.gov.co/sbzv-2tci (67K predios Bogotá, ya funciona)
  → Google Places API buscar "terreno baldío", "lote", "zona verde" en cada ciudad
  → OpenStreetMap: landuse=institutional, landuse=brownfield, landuse=greenfield

PRIORIDAD 2 (semana 2):
  → IGAC WFS: Conectar al servicio catastral para obtener polígonos reales
  → Filtrar por propietario = entidad pública (IGAC tipo propietario 2,3,4)

PRIORIDAD 3 (mes 1):
  → Convenio con Alcaldías para acceso a inventarios de bienes inmuebles
  → SNR consulta de propietarios de predios candidatos
```

### 2.2 CAPA DE DEMANDA (Demand — ¿Dónde falta estacionamiento?)

| Fuente | API / Método | Contenido | Costo |
|---|---|---|---|
| **Google Places API** | Nearby Search + Place Details | POIs con ratings, horarios, fotos, popularidad | $0.032/llamada |
| **Google Places (New)** | Text Search + searchNearby | Densidad de visitas estimada | $0.032/llamada |
| **Google Routes API** | Directions + Traffic | Tiempos de viaje con tráfico en tiempo real | $0.005-0.01/req |
| **OpenStreetMap** | Overpass API | amenity=*, building=*, highway=* | Gratis |
| **RUNT** | datos.gov.co | Vehículos matriculados por municipio | Gratis |
| **TransMilenio/Metro** | datos.gov.co | Pasajeros por estación (proxy de demanda) | Gratis |
| **SIMUR** | API municipal | Datos de movilidad urbana (Medellín, Bogotá) | Requiere acceso |
| **Waze for Cities** | Partnership | Incidentes de tráfico, velocidades por segmento | Requiere convenio |

**Métricas de demanda por tipo de generador:**

| Generador | Factor cajones/aforo | Fuente normativa | Horas pico |
|---|---|---|---|
| Hospital/Clínica | 20-25% | Decreto 1077/2015 | 8am-6pm |
| Centro Comercial | 12% (1:8 visitantes) | Decreto 1077/2015 Art. 2.2.6 | 11am-9pm |
| Estadio/Coliseo | 8-10% | POT municipal | Eventos |
| Universidad | 5% | POT genérico | 6am-10pm |
| Estación Metro/TM | 2% (park & ride) | Estándar intermodal | 5am-10pm |
| Oficinas gobierno | 15% | Decreto 1077/2015 | 7am-5pm |
| Iglesia/templo | 10% | POT | Domingos 6am-2pm |

### 2.3 CAPA DE OFERTA EXISTENTE (Supply — ¿Qué parqueaderos ya hay?)

| Fuente | Método | Datos | Cobertura |
|---|---|---|---|
| **Google Places API** | `type=parking` | Nombre, ubicación, rating, horario | Alta |
| **OpenStreetMap** | `amenity=parking` + `capacity=*` | Ubicación, capacidad, tipo (superficie/cubierto) | Media |
| **Apps parqueaderos** | Web scraping | Tarifa actual, ocupación en tiempo real | Variable |
| **Alcaldías** | Inventarios | Parqueaderos con licencia, capacidad oficial | Por convenio |

### 2.4 CAPA REGULATORIA (Feasibility — ¿Se puede construir aquí?)

| Restricción | Fuente | Formato | Impacto |
|---|---|---|---|
| **POT / Uso de suelo** | Secretaría de Planeación municipal | Shapefile / WMS | CRÍTICO — define si el uso "parqueadero" está permitido |
| **BIC (Bien de Interés Cultural)** | Ministerio de Cultura + datos.gov.co | Lista + polígonos | BLOQUEO si el predio o su entorno es BIC |
| **Zonas de protección ambiental** | CAR + ANLA | Shapefile | BLOQUEO en humedales, rondas de río, reservas |
| **Restricción étnica** | ANT (Agencia Nacional de Tierras) | Polígonos | BLOQUEO en resguardos indígenas |
| **Estrato socioeconómico** | DANE + Alcaldía | Por manzana | Afecta tarifa máxima permitida |
| **NSR-10** | MINVIVIENDA | Normativa | Obligatorio para estructura >2 pisos |
| **Decreto 1077/2015** | MINVIVIENDA | Norma nacional | Requisitos mínimos de diseño |

### 2.5 CAPA FINANCIERA (Economics — ¿Es rentable?)

| Variable | Fuente | Método |
|---|---|---|
| **Tarifas competencia** | Google Places reviews + apps | Scraping de precios mencionados |
| **Valor catastral del terreno** | IGAC / Lonja de Propiedad Raíz | Avalúo catastral vs comercial |
| **Costo construcción/m²** | Camacol índice de costos | COP/m² por ciudad y tipo |
| **Demanda proyectada** | Modelo basado en generadores + tráfico | Interno |
| **Tasa de descuento** | DTF + spread del sector | Banco de la República |

---

## 3. MODELO DE SCORING FUNCIONAL

### 3.1 Score de Demanda (40% del total)

```
INPUTS:
  - N generadores en radio 1km (con tipo y aforo)
  - Factor de cajones por tipo (tabla normativa)
  - Capacidad de parqueaderos existentes en radio 1km
  - Datos de tráfico (velocidad promedio en hora pico via Google Routes)
  - Densidad poblacional (DANE censo)

CÁLCULO:
  demanda_bruta = Σ (aforo_generador_i × factor_tipo_i)
  oferta_existente = Σ capacidad_parqueadero_j (en radio 1km)
  deficit = max(0, demanda_bruta - oferta_existente)

  // Factor de tráfico: velocidad baja = alta demanda
  factor_trafico = 1 - (velocidad_pico / velocidad_libre)  // 0-1

  // Factor densidad poblacional
  factor_densidad = min(1, densidad_hab_km2 / 15000)

  score_demanda = normalize(deficit × (1 + factor_trafico) × (1 + factor_densidad), 0, 100)
```

### 3.2 Score de Accesibilidad (25%)

```
INPUTS:
  - Distancia a vía principal más cercana (Google Routes)
  - Número de vías de acceso (OSM highway=primary,secondary,tertiary en radio 300m)
  - Distancia a transporte público (Metro/TM/MIO estación más cercana)
  - Índice de caminabilidad (Walk Score API o cálculo propio)

CÁLCULO:
  // Vías: 0 = malo, 3+ = excelente
  factor_vias = min(1, vias_en_300m / 3)

  // Transporte público: <200m excelente, >1km malo
  factor_tp = max(0, 1 - distancia_tp_m / 1000)

  // Vía principal: <100m excelente, >500m malo
  factor_via_principal = max(0, 1 - distancia_via_principal_m / 500)

  score_accesibilidad = (factor_vias × 40 + factor_tp × 30 + factor_via_principal × 30)
```

### 3.3 Score de Área (20%)

```
INPUTS:
  - Área del predio en m² (catastro)
  - Forma del predio (ratio perímetro²/área — cuanto más cuadrado, mejor)
  - Pendiente del terreno (DEM si disponible)

CÁLCULO:
  // Área óptima: 2500-8000 m² para parqueadero en superficie
  if area < 1000: factor_area = 0.1
  elif area < 2000: factor_area = 0.4
  elif area < 4000: factor_area = 0.7
  elif area < 8000: factor_area = 1.0
  elif area < 15000: factor_area = 0.9  // Muy grande = más costoso
  else: factor_area = 0.7

  // Forma: cuadrado ideal = ratio ~12.57, alargado > 20
  compacidad = (4 * π * area) / perimetro²
  factor_forma = min(1, compacidad / 0.8)

  score_area = factor_area × 70 + factor_forma × 30
```

### 3.4 Score de Restricciones (15%)

```
INPUTS:
  - ¿Es BIC? (Ministerio de Cultura)
  - ¿Tiene restricción ambiental? (CAR/ANLA)
  - ¿Zona de protección étnica? (ANT)
  - ¿Uso compatible en POT? (Planeación municipal)
  - ¿Estrato del entorno? (DANE)

CÁLCULO:
  score = 100
  if es_bic: score -= 100  // BLOQUEANTE
  if restriccion_ambiental: score -= 100  // BLOQUEANTE
  if restriccion_etnica: score -= 100  // BLOQUEANTE
  if uso_pot_incompatible: score -= 80  // Casi bloqueante
  if estrato >= 5: score -= 10  // Regulación de tarifa más estricta

  score_restricciones = max(0, score)
```

---

## 4. APIs NECESARIAS Y PRESUPUESTO

| API | Uso | Llamadas/mes estimadas | Costo/mes |
|---|---|---|---|
| **Google Places API** | POIs + parqueaderos | 5,000 | $160 USD |
| **Google Maps JavaScript** | Mapa interactivo | Ilimitado (web) | $0 (con crédito $200/mes) |
| **Google Static Maps** | Miniaturas ciudades | 500 | $1 USD |
| **Google Routes/Directions** | Tráfico + distancias | 2,000 | $10-20 USD |
| **datos.gov.co** | Predios + catastro | 10,000 | Gratis |
| **OpenStreetMap Overpass** | Red vial + parking | 500 | Gratis |
| **Anthropic Claude API** | Fichas técnicas IA | 200 | $60 USD (Sonnet) |
| **Supabase** | Base de datos PostGIS | Continuo | $25 USD (Pro) |
| **Vercel** | Hosting + serverless | Continuo | $20 USD (Pro) |
| **TOTAL** | | | **~$300 USD/mes** |

---

## 5. PIPELINE DE DATOS: ARQUITECTURA FUNCIONAL

```
┌─────────────────────────────────────────────────────────┐
│                    FUENTES EXTERNAS                     │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│datos.gov │ Google   │   OSM    │  IGAC    │ POT/BIC     │
│   .co    │ Places   │ Overpass │ Catastro │ Municipal   │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬──────┘
     │          │          │          │            │
     ▼          ▼          ▼          ▼            ▼
┌─────────────────────────────────────────────────────────┐
│              ETL PIPELINE (Python + Cron)                │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Ingestor  │  │Ingestor  │  │Ingestor  │  │Ingestor │ │
│  │Predios   │  │Demanda   │  │Oferta    │  │Norma    │ │
│  │Públicos  │  │(POIs)    │  │(Parking) │  │(POT+BIC)│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │             │              │       │
│       ▼             ▼             ▼              ▼       │
│  ┌──────────────────────────────────────────────────┐   │
│  │          SCORING ENGINE (PostGIS + Python)        │   │
│  │                                                   │   │
│  │  Para cada predio:                                │   │
│  │    1. Calcular demanda en radio (ST_DWithin)     │   │
│  │    2. Calcular oferta existente (ST_DWithin)     │   │
│  │    3. Evaluar accesibilidad (red vial + TP)      │   │
│  │    4. Evaluar restricciones (POT + BIC)          │   │
│  │    5. Score total ponderado                       │   │
│  │    6. Ranking por ciudad                          │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL + PostGIS)              │
│                                                          │
│  predios ←→ generadores ←→ parqueaderos                 │
│     ↓              ↓              ↓                      │
│  scoring_config   factores    fichas_tecnicas            │
│                                                          │
│  + Spatial indexes (GIST)                                │
│  + deficit_parqueaderos_v2()                             │
│  + predios_en_radio()                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS API + FRONTEND                      │
│                                                          │
│  /api/predios      → Ranking filtrable                  │
│  /api/mapa         → GeoJSON para Google Maps           │
│  /api/ficha-pdf    → PDF profesional                    │
│  /api/claude       → Análisis IA por predio             │
│  /api/datos-ext    → Consulta datos.gov.co en vivo      │
│                                                          │
│  Mapa Google Maps + Panel lateral + Fichas técnicas     │
└─────────────────────────────────────────────────────────┘
```

---

## 6. PLAN DE IMPLEMENTACIÓN POR SPRINTS

### Sprint A — Predios Reales (Semana 1)
**Objetivo:** Reemplazar los 11 predios demo con datos reales

| Tarea | Fuente | Detalle |
|---|---|---|
| Ingestar sbzv-2tci completo | datos.gov.co | 67,592 predios públicos de Bogotá con uso, dirección, área |
| Filtrar candidatos | PostGIS | Solo predios con destinación "USO PUBLICO" + área > 1000m² |
| Geocodificar direcciones | Google Geocoding API | Convertir "KR 52 58D 01 SUR" → lat/lng |
| Crear polígonos estimados | PostGIS | ST_Buffer del punto geocodificado por √(área/π) |
| Asignar ciudad_id | SQL | Vincular con tabla ciudades existente |
| **Resultado:** ~500-2000 predios reales en Bogotá | | |

### Sprint B — Demanda Real (Semana 2)
**Objetivo:** Datos de demanda basados en Google Places real

| Tarea | Fuente | Detalle |
|---|---|---|
| Scraper Google Places por ciudad | Google Places API | 7 tipos × 4 ciudades × ~50 resultados = ~1400 POIs |
| Extraer aforos de Place Details | Google Places | user_ratings_total como proxy de popularidad |
| Calcular demand score real | PostGIS | deficit_parqueaderos_v2 con datos reales |
| Scraper parqueaderos existentes | Google Places + OSM | type=parking, amenity=parking |
| **Resultado:** ~1500 generadores + ~2000 parqueaderos reales | | |

### Sprint C — Scoring Dinámico (Semana 3)
**Objetivo:** Score calculado automáticamente, no hardcoded

| Tarea | Fuente | Detalle |
|---|---|---|
| Implementar red vial desde OSM | Overpass API | highway=primary,secondary,tertiary → tabla vias |
| Calcular accesibilidad por predio | PostGIS | Contar vías en radio 300m |
| Implementar compacidad de forma | PostGIS | ST_Area / (ST_Perimeter²) para cada polígono |
| Recalcular todos los scores | Python scorer | Ejecutar 05_scorer.py con datos reales |
| Cron job semanal | GitHub Actions | Re-ejecutar scoring cada domingo |
| **Resultado:** Scores dinámicos y actualizados | | |

### Sprint D — Regulatorio Real (Semana 4)
**Objetivo:** Restricciones basadas en datos oficiales

| Tarea | Fuente | Detalle |
|---|---|---|
| Descargar BIC por ciudad | Ministerio de Cultura / datos.gov.co | Listado de bienes de interés cultural |
| Descargar zonas ambientales | CAR de cada región | Shapefiles de rondas de río, humedales |
| Consultar POT por ciudad | Planeación municipal | Uso de suelo permitido por zona |
| Cruzar con predios | PostGIS | ST_Intersects(predio, zona_restriccion) |
| **Resultado:** Flags de restricción reales por predio | | |

### Sprint E — Modelo Financiero (Semana 5)
**Objetivo:** Proyección financiera realista

| Tarea | Fuente | Detalle |
|---|---|---|
| Scraping tarifas competencia | Google Places reviews | Extraer "tarifa: $X/hora" de reseñas |
| Costos de construcción | Camacol + DANE IPC | COP/m² por ciudad |
| Modelo de ingresos | Interno | cajones × tarifa × ocupación × horas × días |
| Modelo de costos | Interno | Terreno + construcción + operación + impuestos |
| VPN y TIR por predio | Python | scipy.optimize para TIR |
| **Resultado:** Ficha financiera real por predio | | |

---

## 7. CRITERIOS DE ÉXITO DE LA HERRAMIENTA FUNCIONAL

| Criterio | Métrica | Target |
|---|---|---|
| **Cobertura** | Predios evaluados por ciudad | >500 por ciudad capital |
| **Precisión** | Score vs. evaluación manual de experto | >80% concordancia en top 20 |
| **Actualización** | Frecuencia de re-scoring | Semanal automática |
| **Respuesta** | Tiempo de carga del mapa | <3 segundos |
| **Financiero** | TIR proyectada vs. TIR real (validación) | ±20% |
| **Regulatorio** | Restricciones identificadas vs. reales | >95% recall |
| **Usabilidad** | Tiempo para evaluar un predio | <2 minutos |

---

## 8. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| IGAC no expone WFS público confiable | Alta | Alto | Usar datos.gov.co + geocodificación de direcciones |
| Google Places rate limit | Media | Medio | Cache agresivo (24h), batch nocturno |
| POT no disponible en formato digital | Alta | Alto | Consulta manual inicial, digitalización gradual |
| Datos de tráfico insuficientes | Media | Medio | Usar Google Routes API como proxy |
| Cambios en datos.gov.co datasets | Media | Medio | Monitoreo con health checks, fallback a cache |
| Costos de APIs exceden presupuesto | Baja | Medio | Cache agresivo, limitar scraping a ciudades prioritarias |

---

## 9. QUICK WINS (Se pueden hacer esta semana)

1. **Ingestar los 67,592 predios de Bogotá** desde sbzv-2tci → filtrar por área > 1000m² y destinación "USO PUBLICO" → ~5000 predios candidatos inmediatos

2. **Ejecutar Google Places scraper** para las 4 ciudades (ya tenemos el script 02_google_places_scraper.py) → generadores y parqueaderos reales

3. **Scoring automático** con el script 05_scorer.py usando los datos reales → ranking inmediato

4. **Cron job** en GitHub Actions que re-ejecuta el ETL cada domingo

---

*Documento generado por tensor.lat — 2026-03-15*
