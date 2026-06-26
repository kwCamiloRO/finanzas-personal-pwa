import { Injectable, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IngresoRepository } from '../data/ingreso.repository';
import { GastoRepository } from '../data/gasto.repository';
import { CompromisoRepository } from '../data/compromiso.repository';
import { PagoRepository } from '../data/pago.repository';
import { ObligacionRepository } from '../data/obligacion.repository';
import { ConfigRepository } from '../data/config.repository';
import { CycleService } from './cycle.service';
import { ClockService } from '../infra/clock.service';
import {
  Ingreso, Gasto, Compromiso, Pago, Obligacion, ConfigRow,
  EstadoFinanciero, ModoCiclo,
} from '../domain';
import * as fc from './financial-calculations';

export interface ConfiabilidadItem {
  label: string;
  done: boolean;
  cta?: { label: string; link: string };
}

export interface Confiabilidad {
  items: ConfiabilidadItem[];
  done: number;
  total: number;
  porcentaje: number;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class FinancialAnalysisService {
  private clock = inject(ClockService);
  private cycleService = inject(CycleService);

  private ingresosRepo = inject(IngresoRepository);
  private gastosRepo = inject(GastoRepository);
  private compromisosRepo = inject(CompromisoRepository);
  private pagosRepo = inject(PagoRepository);
  private obligacionesRepo = inject(ObligacionRepository);
  private configRepo = inject(ConfigRepository);

  private ingresos = toSignal(this.ingresosRepo.live$(), { initialValue: [] as Ingreso[] });
  private gastos = toSignal(this.gastosRepo.live$(), { initialValue: [] as Gasto[] });
  private compromisos = toSignal(this.compromisosRepo.live$(), { initialValue: [] as Compromiso[] });
  private pagos = toSignal(this.pagosRepo.live$(), { initialValue: [] as Pago[] });
  private obligaciones = toSignal(this.obligacionesRepo.live$(), { initialValue: [] as Obligacion[] });
  private configRows = toSignal(this.configRepo.live$(), { initialValue: [] as ConfigRow[] });

  private getConfig(key: string, fallback = 0): number {
    const row = this.configRows().find(r => r.parametro === key);
    if (!row || row.valor === '' || row.valor === undefined) return fallback;
    const n = Number(row.valor);
    return Number.isFinite(n) ? n : fallback;
  }
  private getConfigStr(key: string, fallback = ''): string {
    return this.configRows().find(r => r.parametro === key)?.valor ?? fallback;
  }

  /** Snapshot público — útil para consumir las funciones puras desde componentes/servicios. */
  readonly data = computed<fc.DataSnap>(() => ({
    ciclos: this.cycleService.ciclos(),
    ingresos: this.ingresos(),
    gastos: this.gastos(),
    compromisos: this.compromisos(),
    pagos: this.pagos(),
    obligaciones: this.obligaciones(),
  }));

  readonly config = computed<fc.ConfigSnap>(() => ({
    cicloActivoId: this.cycleService.cicloActivoId() ?? '',
    fondoOperativo: this.getConfig('FondoOperativo'),
    umbralVerde: this.getConfig('UmbralVerde', 1_500_000),
    umbralAmarillo: this.getConfig('UmbralAmarillo', 500_000),
    frecuenciaPago: (this.getConfigStr('FrecuenciaPago', 'QUINCENAL') as fc.FrecuenciaPago),
  }));

  private hoy = computed(() => this.clock.today());

  // ===== Estado base =====
  readonly cicloActivo = computed(() => this.cycleService.cicloActivo());
  readonly cicloActivoId = computed(() => this.cycleService.cicloActivoId() ?? '');
  readonly hayCicloActivo = computed(() => !!this.cicloActivoId());
  readonly siguienteCiclo = computed(() => fc.siguienteCiclo(this.data(), this.config()));

  // ===== v0.3.0 — ciclo visualizado en dashboard (activo por defecto) =====
  readonly cicloViendo = computed(() => this.cycleService.cicloViendo() ?? this.cicloActivo());
  readonly cicloViendoId = computed(() => this.cicloViendo()?.id ?? '');
  readonly viendoCicloActivo = computed(() => this.cicloViendoId() === this.cicloActivoId());
  readonly ciclosHistoricos = computed(() => this.cycleService.ciclosHistoricos());

  readonly fondoOperativo = computed(() => this.config().fondoOperativo);
  readonly umbralVerde = computed(() => this.config().umbralVerde);
  readonly umbralAmarillo = computed(() => this.config().umbralAmarillo);

  // ===== Modo y banderas (siempre relativas al ciclo visualizado) =====
  readonly modo = computed<ModoCiclo>(() => fc.modo(this.data(), this.cicloViendoId()));
  readonly fechaPagoAlcanzada = computed(() =>
    fc.fechaPagoAlcanzada(this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }, this.hoy()));
  readonly pagoEsperadoPendiente = computed(() =>
    fc.pagoEsperadoPendiente(this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }, this.hoy()));
  readonly esDiaDePago = computed(() =>
    fc.esDiaDePago(this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }, this.hoy()));

  // ===== Ingresos del ciclo visualizado =====
  readonly ingresosRecibidos = computed(() => fc.ingresosRecibidos(this.data(), this.cicloViendoId()));
  readonly ingresosEsperados = computed(() => fc.ingresosEsperados(this.data(), this.cicloViendoId()));
  readonly ingresosTotalesCiclo = computed(() => fc.ingresosTotalesCiclo(this.data(), this.cicloViendoId()));

  // ===== Compromisos del ciclo visualizado =====
  readonly compromisosCicloActivo = computed(() =>
    fc.compromisosDelCiclo(this.data(), this.cicloViendoId()).map(c => ({
      ...c,
      vigencia: fc.vigencia(this.data(), c, this.hoy()),
    }))
  );
  readonly compromisosPendientes = computed(() =>
    this.compromisosCicloActivo().filter(c => c.saldoPendiente > 0)
  );

  // ===== Obligaciones =====
  readonly obligacionesProyectadas = computed(() =>
    fc.obligacionesProyectadas(this.data(), this.cicloViendoId()));
  readonly obligacionesEsenciales = computed(() =>
    fc.obligacionesProyectadasPorPrioridad(this.data(), this.cicloViendoId(), 'A'));
  readonly obligacionesFinancieras = computed(() =>
    fc.obligacionesProyectadasPorPrioridad(this.data(), this.cicloViendoId(), 'B'));
  readonly obligacionesImportantes = computed(() =>
    fc.obligacionesProyectadasPorPrioridad(this.data(), this.cicloViendoId(), 'C'));
  readonly obligacionesFlexibles = computed(() =>
    fc.obligacionesProyectadasPorPrioridad(this.data(), this.cicloViendoId(), 'D'));

  readonly obligacionesVencidas = computed(() =>
    this.compromisosCicloActivo()
      .filter(c => c.vigencia === 'Vencido')
      .reduce((acc, c) => acc + c.saldoPendiente, 0)
  );
  readonly obligacionesCorrientes = computed(() =>
    this.compromisosCicloActivo()
      .filter(c => c.vigencia === 'Corriente')
      .reduce((acc, c) => acc + c.saldoPendiente, 0)
  );

  // ===== Gastos y pagos =====
  readonly gastosCiclo = computed(() => fc.gastosCiclo(this.data(), this.cicloViendoId()));
  readonly pagosCicloRealizados = computed(() => fc.pagosCicloRealizados(this.data(), this.cicloViendoId()));

  // ===== Métricas principales =====
  readonly dineroLibreProyectado = computed(() =>
    fc.dineroLibreProyectado(this.data(), this.cicloViendoId()));
  readonly dineroDisponibleReal = computed(() =>
    fc.dineroDisponibleReal(this.data(), this.cicloViendoId()));
  readonly dineroLibreReal = computed(() =>
    fc.dineroLibreRealLegacy(this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }));

  // ===== Salud =====
  readonly porcentajeLibreRestante = computed(() =>
    fc.porcentajeLibreRestante(this.data(), this.cicloViendoId()));
  readonly saludCiclo = computed<EstadoFinanciero>(() =>
    fc.saludCiclo(this.data(), this.cicloViendoId()));
  readonly estadoFinanciero = computed<EstadoFinanciero>(() => {
    const dlr = this.dineroLibreReal();
    if (dlr >= this.umbralVerde()) return 'VERDE';
    if (dlr >= this.umbralAmarillo()) return 'AMARILLO';
    return 'ROJO';
  });

  // ===== Fechas y días — v0.3.0 (siempre desde el ciclo visualizado) =====
  readonly fechaProximoPago = computed(() => fc.fechaProximoPago(
    this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }, this.hoy()));
  readonly diasHastaProximoPago = computed(() => fc.diasHastaProximoPago(
    this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }, this.hoy()));
  readonly diasTranscurridos = computed(() => fc.diasTranscurridos(
    this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }, this.hoy()));
  readonly fechaInicioCiclo = computed(() => {
    const c = this.cicloViendo();
    return c ? fc.fechaInicioCiclo(this.data(), c) : null;
  });
  readonly fechaFinCiclo = computed(() => {
    const c = this.cicloViendo();
    return c ? fc.fechaFinCiclo(this.data(), c, fc.duracionEstimada(this.config())) : null;
  });
  readonly diasRestantesCiclo = computed(() => {
    const c = this.cicloViendo();
    return c ? fc.diasRestantesCiclo(this.data(), c, this.hoy(), fc.duracionEstimada(this.config())) : 0;
  });
  readonly duracionCicloDias = computed(() => {
    const c = this.cicloViendo();
    return c ? fc.duracionCiclo(this.data(), c, fc.duracionEstimada(this.config())) : 0;
  });

  // ===== Velocidad y gasto máximo diario (v0.3.0 corregido) =====
  readonly velocidadGasto = computed(() => fc.velocidadGasto(
    this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }, this.hoy()));
  /** Gasto máximo diario corregido: usa diasRestantesCiclo (fin - hoy), no días hasta próximo pago. */
  readonly gastoMaximoDiario = computed(() => fc.gastoMaximoDiarioV2(
    this.data(), { ...this.config(), cicloActivoId: this.cicloViendoId() }, this.hoy()));

  // ===== Confiabilidad =====
  readonly confiabilidad = computed<Confiabilidad>(() => {
    const base = fc.confiabilidad(this.data(), this.config());
    const items: ConfiabilidadItem[] = base.items.map((it, idx) => {
      if (it.done) return it;
      const links = ['/cycles/new', '/incomes/new', '/obligations/new', '/obligations/new', '/obligations/new'];
      const labels = ['Crear ciclo', 'Agregar ingreso', 'Agregar esenciales', 'Agregar financieras', 'Agregar importantes'];
      return { ...it, cta: { label: labels[idx]!, link: links[idx]! } };
    });
    const mensaje =
      base.mensaje === 'NO_CONFIABLE' ? 'Tu proyección aún no es confiable'
      : base.mensaje === 'RAZONABLE' ? 'Tu proyección es razonable'
      : 'Tu proyección es altamente confiable';
    return { items, done: base.done, total: base.total, porcentaje: base.porcentaje, mensaje };
  });
}
