import { Injectable, inject } from '@angular/core';
import { db, uid } from '../data/finanzas.db';
import { ObligationService } from './obligation.service';
import { ObligacionRepository } from '../data/obligacion.repository';
import { CompromisoRepository } from '../data/compromiso.repository';
import { PaymentService } from './payment.service';
import { Compromiso, Obligacion } from '../domain';

@Injectable({ providedIn: 'root' })
export class ObligationLifecycleService {
  private obs = inject(ObligationService);
  private obsRepo = inject(ObligacionRepository);
  private compRepo = inject(CompromisoRepository);
  private payments = inject(PaymentService);

  /** Finaliza una obligación. No proyectará en ciclos futuros. Los ciclos anteriores no cambian. */
  async finalizar(obligacionId: string, motivo?: string): Promise<void> {
    await this.obsRepo.update(obligacionId, {
      activa: false,
      estadoFinalizacion: 'Finalizada',
      motivoFinalizacion: motivo,
      fechaFin: new Date(),
    });
  }

  /** Pausa una obligación: no se proyecta este ciclo ni los siguientes hasta reactivar. */
  async pausar(obligacionId: string, motivo?: string): Promise<void> {
    await this.obsRepo.update(obligacionId, {
      estadoFinalizacion: 'Pausada',
      motivoFinalizacion: motivo,
    });
  }

  /** Reactiva una obligación previamente pausada o finalizada. */
  async reactivar(obligacionId: string): Promise<void> {
    await this.obsRepo.update(obligacionId, {
      activa: true,
      estadoFinalizacion: 'Activa',
      motivoFinalizacion: undefined,
      fechaFin: undefined,
    });
  }

  /**
   * Distribuye una obligación flexible a lo largo de N ciclos.
   * Setea `cuotasTotales` y `cuotasRestantes`. Cada vez que se ejecuta
   * `crearSiguienteCicloAutomatico` se descuenta una cuota.
   *
   * @param valorEsperadoTipico se sobreescribe a (monto / cuotas).
   */
  async distribuirEnCuotas(obligacionId: string, montoTotal: number, cuotas: number): Promise<void> {
    if (cuotas <= 0 || montoTotal <= 0) return;
    const cuota = Math.round(montoTotal / cuotas);
    await this.obsRepo.update(obligacionId, {
      valorEsperadoTipico: cuota,
      cuotasTotales: cuotas,
      cuotasRestantes: cuotas,
      recurrente: false,  // distribuida no es recurrente perpetua
      activa: true,
      estadoFinalizacion: 'Activa',
    });
  }

  /**
   * Cambio rápido de estado de un compromiso desde el checklist.
   * - 'Pagada':  marca estadoRapido + registra pago por el saldo pendiente.
   * - 'Parcial': solo marca estadoRapido (el usuario abre form para monto exacto).
   * - 'Omitida': marca estadoRapido (no se registra pago; el saldoPendiente se mantiene).
   * - 'Pendiente': vuelve al estado neutro.
   */
  async marcarRapido(
    compromisoId: string,
    nuevoEstado: 'Pendiente' | 'Pagada' | 'Parcial' | 'Omitida',
  ): Promise<void> {
    const c = await this.compRepo.get(compromisoId);
    if (!c) return;
    await this.compRepo.update(compromisoId, { estadoRapido: nuevoEstado });

    if (nuevoEstado === 'Pagada') {
      // Calcula saldo pendiente actual y registra un pago por ese monto
      const pagos = await db.pagos.where('compromisoId').equals(compromisoId).toArray();
      const pagado = pagos.reduce((acc, p) => acc + p.monto, 0);
      const saldo = Math.max(0, c.valorReal - pagado);
      if (saldo > 0) {
        await this.payments.registrarPagoCompromiso({
          compromisoId,
          monto: saldo,
          comentario: 'Pago rápido desde checklist',
        });
      }
    }
  }

  /**
   * Aplica "Mantener todas" sobre los compromisos recurrentes de un ciclo:
   * marca todos como `estadoRapido = 'Pendiente'` confirmando que están vigentes.
   * Devuelve el número confirmado.
   */
  async confirmarRecurrentesDelCiclo(cicloId: string): Promise<number> {
    const compromisos = await db.compromisos.where('periodo').equals(cicloId).toArray();
    for (const c of compromisos) {
      if (!c.estadoRapido) {
        await db.compromisos.update(c.id, { estadoRapido: 'Pendiente' });
      }
    }
    return compromisos.length;
  }
}
