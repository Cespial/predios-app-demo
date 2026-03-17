import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PredioData {
  nombre: string;
  direccion: string;
  area_m2: number;
  propietario: string;
  score_total: number;
  score_area: number;
  score_accesibilidad: number;
  score_demanda: number;
  score_restricciones: number;
  ciudad: string;
  cajones_estimados: number;
}

interface GeneradorData {
  nombre: string;
  tipo: string;
  aforo: number;
  distancia_metros: number;
}

interface DeficitData {
  capacidad_parqueaderos: number;
  demanda_ponderada: number;
  cajones_deficit: number;
}

interface FichaData {
  resumen_ejecutivo?: string;
  modelo_tarifario?: {
    tarifa_fraccion_30min: number;
    tarifa_hora: number;
    tarifa_dia: number;
    tarifa_mes: number;
  };
  servicios_complementarios?: string[];
  riesgos_principales?: string[];
  ingresos_estimados_mes?: number;
}

interface FinancieroData {
  cajones: number;
  tarifaHora: number;
  ocupacion: number;
  tipoConstruccion: string;
  costoMCajon: number;
  inversionTotal: number;
  ingresoBrutoMes: number;
  ingresoNetoMes: number;
  paybackYears: number;
  roiAnual: number;
}

interface NormativaData {
  componente: string;
  norma: string;
  descripcion: string;
}

export interface PDFInput {
  predio: PredioData;
  generadores: GeneradorData[];
  deficit: DeficitData;
  ficha: FichaData | null;
  normativa: NormativaData[];
  financiero?: FinancieroData;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const colors = {
  dark: '#18181b',
  emerald: '#10b981',
  emeraldLight: '#d1fae5',
  gray50: '#fafafa',
  gray100: '#f4f4f5',
  gray200: '#e4e4e7',
  gray300: '#d4d4d8',
  gray500: '#71717a',
  gray700: '#3f3f46',
  gray900: '#18181b',
  white: '#ffffff',
  red500: '#ef4444',
  amber500: '#f59e0b',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: colors.gray900,
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  // Header
  header: {
    backgroundColor: colors.dark,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: -40,
    marginTop: -60,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: colors.emerald,
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: colors.white,
  },
  headerDate: {
    fontSize: 8,
    color: colors.gray300,
  },
  // Sections
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: colors.dark,
    marginBottom: 8,
    marginTop: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.emerald,
    paddingBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: colors.gray700,
    marginBottom: 4,
    marginTop: 8,
  },
  // Info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  infoCell: {
    width: '50%',
    paddingVertical: 4,
    paddingRight: 8,
  },
  infoLabel: {
    fontSize: 7,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 10,
    color: colors.gray900,
    fontFamily: 'Helvetica-Bold',
  },
  // Score bar
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreLabel: {
    width: 100,
    fontSize: 9,
    color: colors.gray700,
  },
  scoreBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: colors.gray200,
    borderRadius: 5,
  },
  scoreBarFill: {
    height: 10,
    backgroundColor: colors.emerald,
    borderRadius: 5,
  },
  scoreValue: {
    width: 40,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: colors.gray700,
  },
  // Table
  table: {
    marginTop: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.dark,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: colors.white,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
  },
  tableRowAlt: {
    backgroundColor: colors.gray50,
  },
  tableCell: {
    fontSize: 8,
    color: colors.gray700,
  },
  // Deficit
  deficitGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  deficitCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
  },
  deficitCardLabel: {
    fontSize: 7,
    color: colors.gray500,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  deficitCardValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray900,
  },
  // AI section
  aiText: {
    fontSize: 9,
    color: colors.gray700,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 9,
    color: colors.emerald,
    marginRight: 6,
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    fontSize: 9,
    color: colors.gray700,
    flex: 1,
  },
  // Tag / chip
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    backgroundColor: colors.emeraldLight,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  tagText: {
    fontSize: 7,
    color: colors.dark,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: colors.gray300,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: colors.gray500,
  },
  // Score total highlight
  scoreTotalBox: {
    backgroundColor: colors.emerald,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  scoreTotalText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: colors.white,
  },
});

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------
function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreBarBg}>
        <View style={[styles.scoreBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.scoreValue}>{value.toFixed(1)}</Text>
    </View>
  );
}

function TableHeader({ cells }: { cells: { text: string; width: string }[] }) {
  return (
    <View style={styles.tableHeaderRow}>
      {cells.map((c, i) => (
        <Text
          key={i}
          style={[styles.tableHeaderCell, { width: c.width }]}
        >
          {c.text}
        </Text>
      ))}
    </View>
  );
}

function TableRow({
  cells,
  alt,
}: {
  cells: { text: string; width: string }[];
  alt: boolean;
}) {
  return (
    <View style={[styles.tableRow, alt ? styles.tableRowAlt : {}]}>
      {cells.map((c, i) => (
        <Text key={i} style={[styles.tableCell, { width: c.width }]}>
          {c.text}
        </Text>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PDF Document
// ---------------------------------------------------------------------------
function FichaDocument({ data }: { data: PDFInput }) {
  const { predio, generadores, deficit, ficha, normativa, financiero } = data;
  const now = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO').format(Math.round(n));
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <Document
      title={`Ficha de Inversión — ${predio.nombre}`}
      author="tensor.lat"
      subject="Ficha de Inversión — Lote para Parqueadero"
    >
      <Page size="A4" style={styles.page}>
        {/* ---------- HEADER ---------- */}
        <View style={styles.header} fixed>
          <Text style={styles.logoText}>tensor.lat</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Ficha de Inversión</Text>
          </View>
          <Text style={styles.headerDate}>{now}</Text>
        </View>

        {/* ---------- SECTION 1: Property Info ---------- */}
        <Text style={styles.sectionTitle}>1. Información del Lote</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>{predio.nombre}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Ciudad</Text>
            <Text style={styles.infoValue}>{predio.ciudad}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Dirección</Text>
            <Text style={styles.infoValue}>{predio.direccion}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Propietario</Text>
            <Text style={styles.infoValue}>{predio.propietario}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Área</Text>
            <Text style={styles.infoValue}>{fmt(predio.area_m2)} m²</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Cajones Estimados</Text>
            <Text style={styles.infoValue}>{fmt(predio.cajones_estimados)}</Text>
          </View>
        </View>
        <View style={{ marginTop: 6 }}>
          <Text style={styles.infoLabel}>Viabilidad Total</Text>
          <View style={styles.scoreTotalBox}>
            <Text style={styles.scoreTotalText}>
              {predio.score_total.toFixed(1)} / 100
            </Text>
          </View>
        </View>

        {/* ---------- SECTION 2: Scores Breakdown ---------- */}
        <Text style={styles.sectionTitle}>2. Desglose de Viabilidad</Text>
        <ScoreBar label="Área" value={predio.score_area} />
        <ScoreBar label="Accesibilidad" value={predio.score_accesibilidad} />
        <ScoreBar label="Demanda" value={predio.score_demanda} />
        <ScoreBar label="Viabilidad Legal" value={predio.score_restricciones} />

        {/* ---------- SECTION 3: Demand Analysis ---------- */}
        <Text style={styles.sectionTitle}>3. Análisis de Demanda</Text>
        {generadores.length > 0 ? (
          <View style={styles.table}>
            <TableHeader
              cells={[
                { text: 'Nombre', width: '35%' },
                { text: 'Tipo', width: '25%' },
                { text: 'Aforo', width: '20%' },
                { text: 'Distancia', width: '20%' },
              ]}
            />
            {generadores.map((g, i) => (
              <TableRow
                key={i}
                alt={i % 2 === 1}
                cells={[
                  { text: g.nombre, width: '35%' },
                  { text: g.tipo, width: '25%' },
                  { text: fmt(g.aforo), width: '20%' },
                  { text: `${fmt(g.distancia_metros)} m`, width: '20%' },
                ]}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.aiText}>
            No se encontraron generadores de demanda cercanos.
          </Text>
        )}

        {/* ---------- SECTION 4: Parking Deficit ---------- */}
        <Text style={styles.sectionTitle}>4. Estacionamientos Faltantes</Text>
        <View style={styles.deficitGrid}>
          <View style={styles.deficitCard}>
            <Text style={styles.deficitCardLabel}>Capacidad Existente</Text>
            <Text style={styles.deficitCardValue}>
              {fmt(deficit.capacidad_parqueaderos)}
            </Text>
          </View>
          <View style={styles.deficitCard}>
            <Text style={styles.deficitCardLabel}>Demanda Estimada</Text>
            <Text style={styles.deficitCardValue}>
              {fmt(deficit.demanda_ponderada)}
            </Text>
          </View>
          <View
            style={[
              styles.deficitCard,
              {
                borderColor:
                  deficit.cajones_deficit > 0 ? colors.red500 : colors.emerald,
              },
            ]}
          >
            <Text style={styles.deficitCardLabel}>Faltantes</Text>
            <Text
              style={[
                styles.deficitCardValue,
                {
                  color:
                    deficit.cajones_deficit > 0
                      ? colors.red500
                      : colors.emerald,
                },
              ]}
            >
              {deficit.cajones_deficit > 0 ? '+' : ''}
              {fmt(deficit.cajones_deficit)}
            </Text>
          </View>
          <View style={styles.deficitCard}>
            <Text style={styles.deficitCardLabel}>Cajones Propuestos</Text>
            <Text
              style={[styles.deficitCardValue, { color: colors.emerald }]}
            >
              {fmt(predio.cajones_estimados)}
            </Text>
          </View>
        </View>

        {/* ---------- SECTION 5: Financial Model ---------- */}
        {financiero && (
          <>
            <Text style={styles.sectionTitle}>5. Modelo Financiero</Text>
            <View style={styles.deficitGrid}>
              <View style={styles.deficitCard}>
                <Text style={styles.deficitCardLabel}>Inversión Total</Text>
                <Text style={styles.deficitCardValue}>
                  {fmtCurrency(financiero.inversionTotal)}
                </Text>
              </View>
              <View style={styles.deficitCard}>
                <Text style={styles.deficitCardLabel}>Ingreso Neto/Mes</Text>
                <Text style={[styles.deficitCardValue, { color: colors.emerald }]}>
                  {fmtCurrency(financiero.ingresoNetoMes)}
                </Text>
              </View>
              <View style={[styles.deficitCard, {
                borderColor: financiero.paybackYears < 5 ? colors.emerald : financiero.paybackYears <= 8 ? colors.amber500 : colors.red500,
              }]}>
                <Text style={styles.deficitCardLabel}>Recuperación</Text>
                <Text style={[styles.deficitCardValue, {
                  color: financiero.paybackYears < 5 ? colors.emerald : financiero.paybackYears <= 8 ? colors.amber500 : colors.red500,
                }]}>
                  {financiero.paybackYears.toFixed(1)} años
                </Text>
              </View>
              <View style={styles.deficitCard}>
                <Text style={styles.deficitCardLabel}>ROI Anual</Text>
                <Text style={styles.deficitCardValue}>
                  {financiero.roiAnual.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 6 }}>
              <Text style={styles.aiText}>
                Tipo de construcción: {financiero.tipoConstruccion} (${fmt(financiero.costoMCajon)}M/cajón) · {financiero.cajones} cajones · Tarifa: {fmtCurrency(financiero.tarifaHora)}/h · Ocupación: {financiero.ocupacion}%
              </Text>
              <Text style={[styles.aiText, { fontStyle: 'italic', fontSize: 7 }]}>
                Estimaciones indicativas. No reemplaza un estudio de factibilidad profesional.
              </Text>
            </View>
          </>
        )}

        {/* ---------- SECTION 6: AI Analysis ---------- */}
        {ficha && (
          <>
            <Text style={styles.sectionTitle} break>
              {financiero ? '6' : '5'}. Análisis IA
            </Text>

            {ficha.resumen_ejecutivo && (
              <>
                <Text style={styles.sectionSubtitle}>Resumen Ejecutivo</Text>
                <Text style={styles.aiText}>{ficha.resumen_ejecutivo}</Text>
              </>
            )}

            {ficha.modelo_tarifario && (
              <>
                <Text style={styles.sectionSubtitle}>Modelo Tarifario</Text>
                <View style={styles.table}>
                  <TableHeader
                    cells={[
                      { text: 'Concepto', width: '50%' },
                      { text: 'Tarifa', width: '50%' },
                    ]}
                  />
                  <TableRow
                    alt={false}
                    cells={[
                      { text: 'Fracción 30 min', width: '50%' },
                      {
                        text: fmtCurrency(
                          ficha.modelo_tarifario.tarifa_fraccion_30min
                        ),
                        width: '50%',
                      },
                    ]}
                  />
                  <TableRow
                    alt={true}
                    cells={[
                      { text: 'Hora', width: '50%' },
                      {
                        text: fmtCurrency(ficha.modelo_tarifario.tarifa_hora),
                        width: '50%',
                      },
                    ]}
                  />
                  <TableRow
                    alt={false}
                    cells={[
                      { text: 'Día', width: '50%' },
                      {
                        text: fmtCurrency(ficha.modelo_tarifario.tarifa_dia),
                        width: '50%',
                      },
                    ]}
                  />
                  <TableRow
                    alt={true}
                    cells={[
                      { text: 'Mes', width: '50%' },
                      {
                        text: fmtCurrency(ficha.modelo_tarifario.tarifa_mes),
                        width: '50%',
                      },
                    ]}
                  />
                </View>
                {ficha.ingresos_estimados_mes != null && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.infoLabel}>
                      Ingresos Estimados / Mes
                    </Text>
                    <Text style={styles.infoValue}>
                      {fmtCurrency(ficha.ingresos_estimados_mes)}
                    </Text>
                  </View>
                )}
              </>
            )}

            {ficha.servicios_complementarios &&
              ficha.servicios_complementarios.length > 0 && (
                <>
                  <Text style={styles.sectionSubtitle}>
                    Servicios Complementarios
                  </Text>
                  <View style={styles.tagRow}>
                    {ficha.servicios_complementarios.map((s, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

            {ficha.riesgos_principales &&
              ficha.riesgos_principales.length > 0 && (
                <>
                  <Text style={styles.sectionSubtitle}>
                    Riesgos Principales
                  </Text>
                  {ficha.riesgos_principales.map((r, i) => (
                    <View key={i} style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>!</Text>
                      <Text style={styles.bulletText}>{r}</Text>
                    </View>
                  ))}
                </>
              )}
          </>
        )}

        {/* ---------- SECTION 6: Normativa ---------- */}
        {normativa.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {financiero && ficha ? '7' : ficha ? '6' : financiero ? '6' : '5'}. Normativa Aplicable
            </Text>
            <View style={styles.table}>
              <TableHeader
                cells={[
                  { text: 'Componente', width: '25%' },
                  { text: 'Norma', width: '25%' },
                  { text: 'Descripción', width: '50%' },
                ]}
              />
              {normativa.map((n, i) => (
                <TableRow
                  key={i}
                  alt={i % 2 === 1}
                  cells={[
                    { text: n.componente, width: '25%' },
                    { text: n.norma, width: '25%' },
                    { text: n.descripcion, width: '50%' },
                  ]}
                />
              ))}
            </View>
          </>
        )}

        {/* ---------- FOOTER ---------- */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generado por tensor.lat — {now} · Fuentes: IGAC, datos.gov.co, Google Places, OSM, Claude AI
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function generatePDF(data: PDFInput): Promise<Buffer> {
  return renderToBuffer(<FichaDocument data={data} />);
}
