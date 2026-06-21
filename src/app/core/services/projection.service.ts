import { Injectable, inject } from '@angular/core';
import { db, uid } from '../data/finanzas.db';
import { ObligacionRepository } from '../data/obligacion.repository';
import { CompromisoRepository } from '../data/compromiso.repository';
import { CicloRepository } from '../data/ciclo.repository';
import { ConfigRepository } from '../data/config.repository';
import { Ciclo, Obligacion } from '../domain';
import * as fc from './financial-calculations';

export interface Asunciones {
  ingresoEstimado?: number;
  ajusteGastosPct?: number;     // por ejemplo 0.1 = +10% gastos
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

@Injectable({ providedIn: 'root' })
export class ProjectionService {
  private obligacionesRepo = inject(ObligacionRepository);
  private compromisosRepo = inject(CompromisoRepository);
  private ciclosRepo = inject(CicloRepository);
  private configRepo = inject(ConfigRepository);

  /**
   * Calcula la proyección del próximo ciclo basándose en:
   * - Obligaciones recurrentes activas (su valorEsperadoTipico).
   * - Promedio de gastos de los últimos 3 ciclos cerrados (o 0 si no hay historial).
   * - Asunciones del usuario (ingreso estimado, ajuste de gastos, deudas a pagar).
   */
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

  /**
   * Crea un nuevo ciclo y replica las obligaciones recurrentes como compromisos proyectados.
   * NO copia gastos ni pagos. NO marca como activo automáticamente; el usuario decide.
   */
  async crearSiguienteCiclo(fechaPago: Date, opciones: { activar?: boolean; notas?: string } = {}): Promise<Ciclo> {
    const nuevo: Ciclo = {
      id: uid('C-'),
      fechaPago,
      estado: 'Abierto',
      notas: opciones.notas,
    };

    const obligaciones = await this.obligacionesRepo.activas();
    const recurrentes = obligaciones.filter(o => o.recurrente && (o.valorEsperadoTipico ?? 0) > 0);

    await db.transaction('rw', db.ciclos, db.compromisos, db.config, async () => {
      await db.ciclos.add(nuevo);
      for (const o of recurrentes) {
        await db.compromisos.add({
          id: uid('CM-'),
          obligacionId: o.id,
          periodo: nuevo.id,
          valorProyectado: o.valorEsperadoTipico ?? 0,
          valorReal: o.valorEsperadoTipico ?? 0,
        });
      }
      if (opciones.activar) {
        await this.configRepo.set('CicloActivo', nuevo.id);
      }
    });

    return nuevo;
  }

  /**
   * Simula el impacto de un cambio (nuevo ingreso, gasto, pago) sobre el DLP actual.
   * No persiste nada.
   */
  simularImpacto(snap: fc.DataSnap, cicloId: string,
                 cambio: { tipo: 'ingreso' | 'gasto' | 'pago'; monto: number }): ImpactoSimulado {
    const dlpAntes = fc.dineroLibreProyectado(snap, cicloId);
    let dlpDespues = dlpAntes;
    switch (cambio.tipo) {
      case 'ingreso': dlpDespues = dlpAntes + cambio.monto; break;
      case 'gasto':   dlpDespues = dlpAntes - cambio.monto; break;
      case 'pago':    dlpDespues = dlpAntes; break; // pago de compromiso no cambia DLP (ya está restado)
    }
    return { dlpAntes, dlpDespues, delta: dlpDespues - dlpAntes };
  }

  /**
   * Compara proyectado vs real para un ciclo (típicamente al cerrarlo).
   */
  compararCiclo(snap: fc.DataSnap, cicloId: string) {
    return fc.compararProyectadoVsReal(snap, cicloId);
  }
}
