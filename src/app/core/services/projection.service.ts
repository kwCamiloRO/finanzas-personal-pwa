import { Injectable, inject } from '@angular/core';
import { db, uid } from '../data/finanzas.db';
import { ObligacionRepository } from '../data/obligacion.repository';
import { CompromisoRepository } from '../data/compromiso.repository';
import { CicloRepository } from '../data/ciclo.repository';
import { ConfigRepository } from '../data/config.repository';
import { Ciclo, Obligacion } from '../domain';
import * as fc from './financial-calculations';
import {
  PaymentCalendarService, PaymentCalendarConfig, ReglaFinDeSemana, PaisCalendario,
} from './payment-calendar.service';

export interface Asunciones {
  ingresoEstimado?: number;
  ajusteGastosPct?: number;
  pagarDeudasIds?: string[];
}

export interface ProyeccionProximoCiclo {
  ingresoProyectado: number;
  obligacionesProyectadas: number;
  gastosProyectados: number;
  dlpProyectado: number;
  asunciones: Asunciones;
}

export interface ImpactoSimulado {
  dlpAntes: number;
  dlpDespues: number;
  delta: number;
}

export interface CicloAutoCreado {
  ciclo: Ciclo;
  compromisosCreados: number;
  obligacionesRecurrentes: number;
  fechaPagoCalculadaCruda: Date;
  fechaPagoCalculadaAjustada: Date;
}

@Injectable({ providedIn: 'root' })
export class ProjectionService {
  private obligacionesRepo = inject(ObligacionRepository);
  private compromisosRepo = inject(CompromisoRepository);
  private ciclosRepo = inject(CicloRepository);
  private configRepo = inject(ConfigRepository);
  private calendar = inject(PaymentCalendarService);

  async proyectarProximoCiclo(asunciones: Asunciones = {}): Promise<ProyeccionProximoCiclo> {
    const ingresoBase = await this.configRepo.getNumber('IngresoBase');
    const obligaciones = await this.obligacionesRepo.activas();
    const ciclosCerrados = (await this.ciclosRepo.list())
      .filter(c => c.estado === 'Cerrado');

    const obligacionesRecurrentes = obligaciones.filter(o => o.recurrente);
    const obligacionesProyectadas = obligacionesRecurrentes
      .reduce((acc, o) => acc + (o.valorEsperadoTipico ?? 0), 0);

    let gastosPromedio = 0;
    if (ciclosCerrados.length > 0) {
      const ultimos = ciclosCerrados.slice(0, 3);
      const sumas = await Promise.all(
        ultimos.map(c => db.gastos.where('cicloId').equals(c.id).toArray())
      );
      const totales = sumas.map(arr => arr.reduce((acc, g) => acc + g.valor, 0));
      gastosPromedio = totales.reduce((a, b) => a + b, 0) / totales.length;
    }

    const ajuste = asunciones.ajusteGastosPct ?? 0;
    const gastosProyectados = Math.round(gastosPromedio * (1 + ajuste));
    const ingresoProyectado = asunciones.ingresoEstimado ?? ingresoBase;
    const dlpProyectado = ingresoProyectado - obligacionesProyectadas - gastosProyectados;

    return {
      ingresoProyectado,
      obligacionesProyectadas,
      gastosProyectados,
      dlpProyectado,
      asunciones,
    };
  }

  async crearSiguienteCiclo(fechaPago: Date, opciones: { activar?: boolean; notas?: string } = {}): Promise<Ciclo> {
    const nuevo: Ciclo = {
      id: uid('C-'),
      fechaPago,
      estado: 'Abierto',
      notas: opciones.notas,
    };

    const obligaciones = await this.obligacionesRepo.activas();
    const recurrentes = obligaciones.filter(o =>
      o.recurrente
      && (o.valorEsperadoTipico ?? 0) > 0
      && o.estadoFinalizacion !== 'Finalizada'
      && o.estadoFinalizacion !== 'Pausada'
    );

    await db.transaction('rw', db.ciclos, db.compromisos, db.config, async () => {
      await db.ciclos.add(nuevo);
      for (const o of recurrentes) {
        await db.compromisos.add({
          id: uid('CM-'),
          obligacionId: o.id,
          periodo: nuevo.id,
          valorProyectado: o.valorEsperadoTipico ?? 0,
          valorReal: o.valorEsperadoTipico ?? 0,
          estadoRapido: 'Pendiente',
        });
      }
      if (opciones.activar) {
        await this.configRepo.set('CicloActivo', nuevo.id);
      }
    });

    return nuevo;
  }

  /**
   * v0.3.0 — Crea el siguiente ciclo automáticamente:
   *  - Calcula fechaPago usando PaymentCalendarService + Config global.
   *  - Calcula fechaInicio y fechaFin a partir del ciclo activo / fecha calculada.
   *  - Replica solo obligaciones recurrentes activas (no finalizadas, no pausadas).
   *  - Vincula cicloAnterior/cicloSiguiente.
   *  - NO marca el nuevo como activo por defecto (lo hace el usuario el día del pago).
   */
  async crearSiguienteCicloAutomatico(opts: { activar?: boolean } = {}): Promise<CicloAutoCreado> {
    const ciclos = await this.ciclosRepo.list();
    const cicloRefId = await this.configRepo.getValor('CicloActivo');
    const cicloRef = ciclos.find(c => c.id === cicloRefId)
      ?? ciclos.sort((a, b) => +new Date(b.fechaPago) - +new Date(a.fechaPago))[0];

    const cfg = await this.cargarPaymentCalendarConfig();

    const fechaRef = cicloRef ? new Date(cicloRef.fechaPago) : new Date();
    const fechaPagoCruda = this.calendar.proximaFechaCrudaSegunFrecuencia(fechaRef, cfg);
    const fechaPagoAjustada = this.calendar.ajustar(fechaPagoCruda, cfg.reglaFinDeSemana, cfg.pais);

    const fechaInicio = cicloRef ? new Date(cicloRef.fechaPago) : new Date(fechaPagoAjustada);
    const fechaFin = new Date(fechaPagoAjustada);
    fechaFin.setDate(fechaFin.getDate() - 1);

    const obligaciones = await this.obligacionesRepo.activas();
    const recurrentes = obligaciones.filter(o =>
      o.recurrente
      && (o.valorEsperadoTipico ?? 0) > 0
      && o.estadoFinalizacion !== 'Finalizada'
      && o.estadoFinalizacion !== 'Pausada'
    );

    const nuevo: Ciclo = {
      id: uid('C-'),
      fechaPago: fechaPagoAjustada,
      estado: 'Abierto',
      fechaInicio,
      fechaFin,
      cicloAnteriorId: cicloRef?.id,
      creadoAutomaticamente: true,
      generadoDesdeConfiguracion: true,
    };

    await db.transaction('rw', db.ciclos, db.compromisos, db.config, async () => {
      await db.ciclos.add(nuevo);
      if (cicloRef) {
        await db.ciclos.update(cicloRef.id, { cicloSiguienteId: nuevo.id });
      }
      for (const o of recurrentes) {
        await db.compromisos.add({
          id: uid('CM-'),
          obligacionId: o.id,
          periodo: nuevo.id,
          valorProyectado: o.valorEsperadoTipico ?? 0,
          valorReal: o.valorEsperadoTipico ?? 0,
          estadoRapido: 'Pendiente',
        });
      }
      // Procesar obligaciones flexibles con cuotasRestantes (v0.3.0).
      // Excluimos las que ya están en `recurrentes` para evitar doble compromiso.
      const recurrentesIds = new Set(recurrentes.map(o => o.id));
      const flexCuotas = obligaciones.filter(o =>
        (o.cuotasRestantes ?? 0) > 0 && !recurrentesIds.has(o.id)
      );
      for (const o of flexCuotas) {
        const monto = o.valorEsperadoTipico ?? 0;
        if (monto <= 0) continue;
        await db.compromisos.add({
          id: uid('CM-'),
          obligacionId: o.id,
          periodo: nuevo.id,
          valorProyectado: monto,
          valorReal: monto,
          estadoRapido: 'Pendiente',
        });
        const nuevasCuotas = (o.cuotasRestantes ?? 0) - 1;
        const patch: Partial<Obligacion> = { cuotasRestantes: nuevasCuotas };
        if (nuevasCuotas <= 0) {
          patch.estadoFinalizacion = 'Finalizada';
          patch.fechaFin = new Date();
          patch.motivoFinalizacion = 'Cuotas completadas';
          patch.activa = false;
        }
        await db.obligaciones.update(o.id, patch);
      }
      if (opts.activar) {
        await this.configRepo.set('CicloActivo', nuevo.id);
      }
    });

    return {
      ciclo: nuevo,
      compromisosCreados: recurrentes.length,
      obligacionesRecurrentes: recurrentes.length,
      fechaPagoCalculadaCruda: fechaPagoCruda,
      fechaPagoCalculadaAjustada: fechaPagoAjustada,
    };
  }

  private async cargarPaymentCalendarConfig(): Promise<PaymentCalendarConfig> {
    const diaPagoHabitual = await this.configRepo.getNumber('DiaPagoHabitual', 28);
    const reglaRaw = (await this.configRepo.getValor('ReglaFinDeSemana')) ?? 'adelantar';
    const pais = ((await this.configRepo.getValor('Pais')) ?? 'CO') as PaisCalendario;
    const freqRaw = ((await this.configRepo.getValor('FrecuenciaPago')) ?? 'MENSUAL');
    return {
      diaPagoHabitual,
      reglaFinDeSemana: reglaRaw as ReglaFinDeSemana,
      pais,
      frecuencia: freqRaw === 'MENSUAL' ? 'MENSUAL' : freqRaw === 'QUINCENAL' ? 'QUINCENAL' : 'VARIABLE',
    };
  }

  simularImpacto(snap: fc.DataSnap, cicloId: string,
                 cambio: { tipo: 'ingreso' | 'gasto' | 'pago'; monto: number }): ImpactoSimulado {
    const dlpAntes = fc.dineroLibreProyectado(snap, cicloId);
    let dlpDespues = dlpAntes;
    switch (cambio.tipo) {
      case 'ingreso': dlpDespues = dlpAntes + cambio.monto; break;
      case 'gasto':   dlpDespues = dlpAntes - cambio.monto; break;
      case 'pago':    dlpDespues = dlpAntes; break;
    }
    return { dlpAntes, dlpDespues, delta: dlpDespues - dlpAntes };
  }
  compararCiclo(snap: fc.DataSnap, cicloId: string) {
    return fc.compararProyectadoVsReal(snap, cicloId);
  }

  compararCicloExtendido(snap: fc.DataSnap, cicloId: string) {
    return fc.comparativoExtendido(snap, cicloId);
  }
}
