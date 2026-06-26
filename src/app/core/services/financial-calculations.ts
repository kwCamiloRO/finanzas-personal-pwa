/**
 * Funciones puras de cálculo financiero.
 * Sin Angular, sin Dexie, sin signals. Solo entradas → salidas.
 *
 * Las usa `FinancialAnalysisService` envolviéndolas en signals.
 * Las usan tests directamente sin TestBed.
 */
import {
  Ciclo, Ingreso, Gasto, Compromiso, Pago, Obligacion,
  Prioridad, Vigencia, ModoCiclo, EstadoFinanciero,
} from '../domain';

export type FrecuenciaPago = 'QUINCENAL' | 'MENSUAL' | 'VARIABLE';

export interface DataSnap {
  ciclos: Ciclo[];
  ingresos: Ingreso[];
  gastos: Gasto[];
  compromisos: Compromiso[];
  pagos: Pago[];
  obligaciones: Obligacion[];
}

export interface ConfigSnap {
  cicloActivoId: string;
  fondoOperativo: number;
  umbralVerde: number;
  umbralAmarillo: number;
  frecuenciaPago: FrecuenciaPago;
}

export const emptyData = (): DataSnap => ({
  ciclos: [], ingresos: [], gastos: [],
  compromisos: [], pagos: [], obligaciones: [],
});

export const defaultConfig = (overrides: Partial<ConfigSnap> = {}): ConfigSnap => ({
  cicloActivoId: '',
  fondoOperativo: 0,
  umbralVerde: 1_500_000,
  umbralAmarillo: 500_000,
  frecuenciaPago: 'QUINCENAL',
  ...overrides,
});

// ============================================================================
// Helpers de fecha
// ============================================================================
export function diffDays(a: Date, b: Date): number {
  const MS = 86_400_000;
  return Math.round((+a - +b) / MS);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function duracionEstimada(c: ConfigSnap): number {
  return c.frecuenciaPago === 'MENSUAL' ? 30 : 15;
}

// ============================================================================
// Lookup de ciclo
// ============================================================================
export function cicloActivo(d: DataSnap, c: ConfigSnap): Ciclo | null {
  return d.ciclos.find(x => x.id === c.cicloActivoId) ?? null;
}

export function siguienteCiclo(d: DataSnap, c: ConfigSnap): Ciclo | null {
  const activo = cicloActivo(d, c);
  if (!activo) return null;
  const fpActivo = +new Date(activo.fechaPago);
  return d.ciclos
    .filter(x => +new Date(x.fechaPago) > fpActivo)
    .sort((a, b) => +new Date(a.fechaPago) - +new Date(b.fechaPago))[0] ?? null;
}

// ============================================================================
// Ingresos
// ============================================================================
export function ingresosRecibidos(d: DataSnap, cicloId: string): number {
  return d.ingresos
    .filter(i => i.cicloId === cicloId && i.estado === 'Recibido')
    .reduce((acc, i) => acc + i.valor, 0);
}

export function ingresosEsperados(d: DataSnap, cicloId: string): number {
  return d.ingresos
    .filter(i => i.cicloId === cicloId && (i.estado === 'Esperado' || i.estado === 'Confirmado'))
    .reduce((acc, i) => acc + i.valor, 0);
}

export function ingresosTotalesCiclo(d: DataSnap, cicloId: string): number {
  return ingresosRecibidos(d, cicloId) + ingresosEsperados(d, cicloId);
}

// ============================================================================
// Compromisos y saldos
// ============================================================================
export function valorPagadoCompromiso(d: DataSnap, compromisoId: string): number {
  return d.pagos
    .filter(p => p.fuente === 'Compromiso' && p.compromisoId === compromisoId)
    .reduce((acc, p) => acc + p.monto, 0);
}

export function saldoCompromiso(d: DataSnap, c: Compromiso): number {
  return Math.max(0, c.valorReal - valorPagadoCompromiso(d, c.id));
}

export function vigencia(d: DataSnap, c: Compromiso, hoy: Date): Vigencia {
  const saldo = saldoCompromiso(d, c);
  if (saldo <= 0) return 'Pagado';
  if (c.fechaVencimiento && new Date(c.fechaVencimiento) < startOfDay(hoy)) return 'Vencido';
  return 'Corriente';
}

export function compromisosDelCiclo(d: DataSnap, cicloId: string) {
  return d.compromisos
    .filter(c => c.periodo === cicloId)
    .map(c => {
      const o = d.obligaciones.find(x => x.id === c.obligacionId);
      return {
        ...c,
        saldoPendiente: saldoCompromiso(d, c),
        prioridad: (o?.prioridad ?? 'D') as Prioridad,
        nombre: o?.nombre ?? '(sin nombre)',
        tipo: o?.tipo ?? 'Otro',
      };
    });
}

// ============================================================================
// Obligaciones proyectadas (compromisos del ciclo + obligaciones activas sin compromiso)
// ============================================================================
export function obligacionesProyectadas(d: DataSnap, cicloId: string): number {
  if (!cicloId) {
    return d.obligaciones
      .filter(o => o.activa)
      .reduce((acc, o) => acc + (o.valorEsperadoTipico ?? 0), 0);
  }
  const compromisosCiclo = d.compromisos.filter(c => c.periodo === cicloId);
  const conCompromiso = new Set(compromisosCiclo.map(c => c.obligacionId));
  const sumaComp = compromisosCiclo.reduce((acc, c) => acc + saldoCompromiso(d, c), 0);
  const sumaActivas = d.obligaciones
    .filter(o => o.activa && !conCompromiso.has(o.id))
    .reduce((acc, o) => acc + (o.valorEsperadoTipico ?? 0), 0);
  return sumaComp + sumaActivas;
}

export function obligacionesProyectadasPorPrioridad(d: DataSnap, cicloId: string, p: Prioridad): number {
  if (!cicloId) {
    return d.obligaciones
      .filter(o => o.activa && o.prioridad === p)
      .reduce((acc, o) => acc + (o.valorEsperadoTipico ?? 0), 0);
  }
  const compromisosCiclo = compromisosDelCiclo(d, cicloId);
  const conCompromiso = new Set(compromisosCiclo.map(c => c.obligacionId));
  const sumaC = compromisosCiclo
    .filter(c => c.prioridad === p)
    .reduce((acc, c) => acc + c.saldoPendiente, 0);
  const sumaO = d.obligaciones
    .filter(o => o.activa && o.prioridad === p && !conCompromiso.has(o.id))
    .reduce((acc, o) => acc + (o.valorEsperadoTipico ?? 0), 0);
  return sumaC + sumaO;
}

// ============================================================================
// Gastos y pagos
// ============================================================================
export function gastosCiclo(d: DataSnap, cicloId: string): number {
  return d.gastos
    .filter(g => g.cicloId === cicloId)
    .reduce((acc, g) => acc + g.valor, 0);
}

export function pagosCicloRealizados(d: DataSnap, cicloId: string): number {
  const compIds = new Set(d.compromisos.filter(c => c.periodo === cicloId).map(c => c.id));
  return d.pagos
    .filter(p => p.fuente === 'Compromiso' && p.compromisoId && compIds.has(p.compromisoId))
    .reduce((acc, p) => acc + p.monto, 0);
}

// ============================================================================
// Deudas
// ============================================================================
export function valorPagadoDeuda(d: DataSnap, deudaId: string): number {
  return d.pagos
    .filter(p => p.fuente === 'Deuda' && p.deudaId === deudaId)
    .reduce((acc, p) => acc + p.monto, 0);
}

export function saldoDeuda(d: DataSnap, deudaId: string, valorOriginal: number): number {
  return Math.max(0, valorOriginal - valorPagadoDeuda(d, deudaId));
}

// ============================================================================
// Métricas principales
// ============================================================================
export function dineroLibreProyectado(d: DataSnap, cicloId: string): number {
  return ingresosTotalesCiclo(d, cicloId)
    - obligacionesProyectadas(d, cicloId)
    - gastosCiclo(d, cicloId);
}

export function dineroDisponibleReal(d: DataSnap, cicloId: string): number {
  return ingresosRecibidos(d, cicloId)
    - pagosCicloRealizados(d, cicloId)
    - gastosCiclo(d, cicloId);
}

export function dineroLibreRealLegacy(d: DataSnap, c: ConfigSnap): number {
  const ca = c.cicloActivoId;
  return ingresosRecibidos(d, ca)
    - c.fondoOperativo
    - obligacionesProyectadasPorPrioridad(d, ca, 'A')
    - obligacionesProyectadasPorPrioridad(d, ca, 'B')
    - gastosCiclo(d, ca);
}

// ============================================================================
// Modo y banderas de fecha
// ============================================================================
export function modo(d: DataSnap, cicloId: string): ModoCiclo {
  return ingresosRecibidos(d, cicloId) > 0 ? 'EJECUCION' : 'PLANIFICACION';
}

/** Indica si la fecha de pago del ciclo ya pasó (o es hoy) */
export function fechaPagoAlcanzada(d: DataSnap, c: ConfigSnap, hoy: Date): boolean {
  const activo = cicloActivo(d, c);
  if (!activo) return false;
  return startOfDay(new Date(activo.fechaPago)) <= startOfDay(hoy);
}

/** Cuando fechaPagoAlcanzada=true pero modo=PLANIFICACION → pago esperado pendiente de confirmar */
export function pagoEsperadoPendiente(d: DataSnap, c: ConfigSnap, hoy: Date): boolean {
  return fechaPagoAlcanzada(d, c, hoy) && modo(d, c.cicloActivoId) === 'PLANIFICACION';
}

// ============================================================================
// Salud y semáforos
// ============================================================================
export function porcentajeLibreRestante(d: DataSnap, cicloId: string): number {
  const total = ingresosTotalesCiclo(d, cicloId);
  if (total <= 0) return 0;
  return dineroLibreProyectado(d, cicloId) / total;
}

export function saludCiclo(d: DataSnap, cicloId: string): EstadoFinanciero {
  if (ingresosTotalesCiclo(d, cicloId) === 0) return 'AMARILLO';
  const p = porcentajeLibreRestante(d, cicloId);
  if (p >= 0.30) return 'VERDE';
  if (p >= 0.10) return 'AMARILLO';
  return 'ROJO';
}

// ============================================================================
// Días
// ============================================================================
export function fechaProximoPago(d: DataSnap, c: ConfigSnap, hoy: Date): Date | null {
  const activo = cicloActivo(d, c);
  if (!activo) return null;
  const fp = new Date(activo.fechaPago);
  if (fp > hoy) return fp;
  // Si el ciclo ya inició, buscar el siguiente ciclo registrado; si no, estimar.
  const sig = siguienteCiclo(d, c);
  if (sig) return new Date(sig.fechaPago);
  return addDays(fp, duracionEstimada(c));
}

export function diasHastaProximoPago(d: DataSnap, c: ConfigSnap, hoy: Date): number {
  const f = fechaProximoPago(d, c, hoy);
  if (!f) return 0;
  return Math.max(0, diffDays(f, hoy));
}

export function diasTranscurridos(d: DataSnap, c: ConfigSnap, hoy: Date): number {
  const activo = cicloActivo(d, c);
  if (!activo) return 0;
  const fp = new Date(activo.fechaPago);
  if (fp > hoy) return 0;
  return Math.max(0, diffDays(hoy, fp));
}

export function velocidadGasto(d: DataSnap, c: ConfigSnap, hoy: Date): number {
  const dt = diasTranscurridos(d, c, hoy);
  return dt > 0 ? gastosCiclo(d, c.cicloActivoId) / dt : 0;
}

export function gastoMaximoDiario(d: DataSnap, c: ConfigSnap, hoy: Date): number {
  const dias = diasHastaProximoPago(d, c, hoy);
  const base = modo(d, c.cicloActivoId) === 'EJECUCION'
    ? dineroDisponibleReal(d, c.cicloActivoId)
    : dineroLibreProyectado(d, c.cicloActivoId);
  if (dias <= 0) return Math.max(0, base);
  return Math.max(0, base / dias);
}

// ============================================================================
// Confiabilidad
// ============================================================================
export interface ConfiabilidadResult {
  items: { label: string; done: boolean }[];
  done: number;
  total: number;
  porcentaje: number;
  mensaje: 'NO_CONFIABLE' | 'RAZONABLE' | 'ALTAMENTE_CONFIABLE';
}

export function confiabilidad(d: DataSnap, c: ConfigSnap): ConfiabilidadResult {
  const ca = c.cicloActivoId;
  const tieneIngreso = !!ca && d.ingresos.some(i => i.cicloId === ca);
  const tieneEsenciales  = d.obligaciones.some(o => o.activa && o.prioridad === 'A');
  const tieneFinancieras = d.obligaciones.some(o => o.activa && o.prioridad === 'B');
  const tieneImportantes = d.obligaciones.some(o => o.activa && o.prioridad === 'C');

  const items = [
    { label: 'Ciclo creado', done: !!ca },
    { label: 'Ingreso principal registrado', done: tieneIngreso },
    { label: 'Obligaciones esenciales registradas', done: tieneEsenciales },
    { label: 'Obligaciones financieras registradas', done: tieneFinancieras },
    { label: 'Obligaciones importantes registradas', done: tieneImportantes },
  ];
  const done = items.filter(i => i.done).length;
  const total = items.length;
  const mensaje: ConfiabilidadResult['mensaje'] =
    done <= 2 ? 'NO_CONFIABLE'
    : done <= 4 ? 'RAZONABLE'
    : 'ALTAMENTE_CONFIABLE';
  return { items, done, total, porcentaje: done / total, mensaje };
}

// ============================================================================
// Comparativo proyectado vs real (escenario 10: cierre de ciclo)
// ============================================================================
export interface Comparativo {
  ingresoProyectado: number;
  ingresoReal: number;
  obligacionProyectada: number;
  obligacionReal: number;
  gastoReal: number;
  dlpProyectado: number;
  dlpReal: number;
  diferencia: number;
}

/**
 * Comparativo cierre de ciclo:
 *
 * PROYECTADO = lo planeado AL INICIO del ciclo. Usa `valorProyectado` del compromiso,
 * NO `saldoPendiente`. Si un compromiso ya se pagó, eso no rebaja la "proyección"
 * porque la proyección es histórica (lo que el usuario presupuestó).
 *
 * REAL = lo que efectivamente ocurrió.
 *   - ingresoReal: ingresos en estado 'Recibido'
 *   - obligacionReal: pagos efectuados a compromisos del ciclo
 *   - gastoReal: gastos registrados
 *
 * gastoReal aparece en ambos lados (no hay campo separado de "gasto proyectado"),
 * por lo que se cancela en la diferencia y la comparación queda dominada por
 * INGRESO planeado vs recibido y OBLIGACION planeada vs pagada (lo que el
 * usuario controla al cierre).
 */
export function compararProyectadoVsReal(d: DataSnap, cicloId: string): Comparativo {
  // PROYECTADO
  const ingresoProyectado = ingresosTotalesCiclo(d, cicloId);

  const compromisosCiclo = d.compromisos.filter(c => c.periodo === cicloId);
  const conCompromiso = new Set(compromisosCiclo.map(c => c.obligacionId));
  const obligacionProyectada =
    compromisosCiclo.reduce((acc, c) => acc + c.valorProyectado, 0) +
    d.obligaciones
      .filter(o => o.activa && !conCompromiso.has(o.id))
      .reduce((acc, o) => acc + (o.valorEsperadoTipico ?? 0), 0);

  // REAL
  const ingresoReal = ingresosRecibidos(d, cicloId);
  const obligacionReal = pagosCicloRealizados(d, cicloId);
  const gastoReal = gastosCiclo(d, cicloId);

  // DLP / DLR. gastoReal aparece a ambos lados (no hay "gasto proyectado").
  const dlpProyectado = ingresoProyectado - obligacionProyectada - gastoReal;
  const dlpReal = ingresoReal - obligacionReal - gastoReal;

  return {
    ingresoProyectado, ingresoReal,
    obligacionProyectada, obligacionReal,
    gastoReal,
    dlpProyectado, dlpReal,
    diferencia: dlpReal - dlpProyectado,
  };
}

// ============================================================================
// v0.3.0 - Motor de ciclos: fechas inferidas, gasto diario por dias restantes
// ============================================================================

/** Fecha de inicio efectiva del ciclo (inferida si no esta persistida). */
export function fechaInicioCiclo(d: DataSnap, ciclo: Ciclo): Date {
  if (ciclo.fechaInicio) return new Date(ciclo.fechaInicio);
  // Inferir del ciclo anterior por fechaPago
  const ordenados = [...d.ciclos].sort((a, b) => +new Date(a.fechaPago) - +new Date(b.fechaPago));
  const idx = ordenados.findIndex(c => c.id === ciclo.id);
  if (idx > 0) return new Date(ordenados[idx - 1].fechaPago);
  return new Date(ciclo.fechaPago);
}

/** Fecha de fin efectiva del ciclo: un dia antes del siguiente pago (o estimada). */
export function fechaFinCiclo(d: DataSnap, ciclo: Ciclo, duracionDefault = 15): Date {
  if (ciclo.fechaFin) return new Date(ciclo.fechaFin);
  const ordenados = [...d.ciclos].sort((a, b) => +new Date(a.fechaPago) - +new Date(b.fechaPago));
  const idx = ordenados.findIndex(c => c.id === ciclo.id);
  const next = idx >= 0 && idx < ordenados.length - 1 ? ordenados[idx + 1] : null;
  if (next) {
    const f = new Date(next.fechaPago);
    f.setDate(f.getDate() - 1);
    return f;
  }
  const f = new Date(ciclo.fechaPago);
  f.setDate(f.getDate() + duracionDefault - 1);
  return f;
}

/** Dias restantes del ciclo (hoy -> fechaFin). Minimo 0. */
export function diasRestantesCiclo(d: DataSnap, ciclo: Ciclo, hoy: Date, duracionDefault = 15): number {
  const fin = fechaFinCiclo(d, ciclo, duracionDefault);
  return Math.max(0, diffDays(fin, hoy));
}

/** Duracion real del ciclo (fechaFin - fechaInicio + 1). */
export function duracionCiclo(d: DataSnap, ciclo: Ciclo, duracionDefault = 15): number {
  const ini = fechaInicioCiclo(d, ciclo);
  const fin = fechaFinCiclo(d, ciclo, duracionDefault);
  return Math.max(1, diffDays(fin, ini) + 1);
}

/**
 * Gasto maximo diario corregido (v0.3.0):
 *   base = en modo EJECUCION usar dineroDisponibleReal, en PLANIFICACION usar dineroLibreProyectado.
 *   dias = diasRestantesCiclo (fechaFin del ciclo - hoy), no dias hasta proximo pago.
 *   Si hoy > fechaFin, devuelve base (no hay dias restantes).
 */
export function gastoMaximoDiarioV2(d: DataSnap, c: ConfigSnap, hoy: Date): number {
  const activo = cicloActivo(d, c);
  if (!activo) return 0;
  const base = modo(d, c.cicloActivoId) === 'EJECUCION'
    ? dineroDisponibleReal(d, c.cicloActivoId)
    : dineroLibreProyectado(d, c.cicloActivoId);
  const dias = diasRestantesCiclo(d, activo, hoy, duracionEstimada(c));
  if (dias <= 0) return Math.max(0, base);
  return Math.max(0, base / dias);
}

/** Hoy es dia de pago del ciclo activo? */
export function esDiaDePago(d: DataSnap, c: ConfigSnap, hoy: Date): boolean {
  const activo = cicloActivo(d, c);
  if (!activo) return false;
  return startOfDay(new Date(activo.fechaPago)).getTime() === startOfDay(hoy).getTime();
}

/** Ciclos historicos (cerrados u ordenados por fecha descendente, sin contar el activo). */
export function ciclosHistoricos(d: DataSnap, c: ConfigSnap): Ciclo[] {
  return [...d.ciclos]
    .filter(x => x.id !== c.cicloActivoId)
    .sort((a, b) => +new Date(b.fechaPago) - +new Date(a.fechaPago));
}

/** Comparativa enriquecida (v0.3.0): incluye porcentaje de precision y desglose. */
export interface ComparativoExtendido {
  cicloId: string;
  ingresoProyectado: number;
  ingresoReal: number;
  diffIngreso: number;
  obligacionProyectada: number;
  obligacionReal: number;
  diffObligacion: number;
  gastoReal: number;
  dlpProyectado: number;
  dlpReal: number;
  diferencia: number;
  porcentajePrecision: number;       // 0..1; 1 = clavado, baja conforme |diferencia| crece
  causaPrincipal: 'ingreso' | 'obligacion' | 'gasto' | 'ninguna';
}

export function comparativoExtendido(d: DataSnap, cicloId: string): ComparativoExtendido {
  const cmp = compararProyectadoVsReal(d, cicloId);
  const diffIngreso = cmp.ingresoReal - cmp.ingresoProyectado;
  const diffObligacion = cmp.obligacionReal - cmp.obligacionProyectada;
  // base de comparacion: ingresoProyectado (denominador no nulo)
  const base = Math.max(1, cmp.ingresoProyectado);
  const precision = Math.max(0, 1 - Math.abs(cmp.diferencia) / base);

  // gastoReal aparece a ambos lados de DLP y DLR, por lo que se cancela y NUNCA es
  // matematicamente la causa de la diferencia. La causa solo puede ser ingreso u obligacion.
  // Si ambas diferencias son cero, no hay causa.
  let causa: ComparativoExtendido['causaPrincipal'] = 'ninguna';
  if (Math.abs(diffIngreso) > 0 || Math.abs(diffObligacion) > 0) {
    causa = Math.abs(diffIngreso) >= Math.abs(diffObligacion) ? 'ingreso' : 'obligacion';
  }

  return {
    cicloId,
    ingresoProyectado: cmp.ingresoProyectado,
    ingresoReal: cmp.ingresoReal,
    diffIngreso,
    obligacionProyectada: cmp.obligacionProyectada,
    obligacionReal: cmp.obligacionReal,
    diffObligacion,
    gastoReal: cmp.gastoReal,
    dlpProyectado: cmp.dlpProyectado,
    dlpReal: cmp.dlpReal,
    diferencia: cmp.diferencia,
    porcentajePrecision: precision,
    causaPrincipal: causa,
  };
}
