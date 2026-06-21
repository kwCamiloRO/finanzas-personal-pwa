import { Injectable, inject, computed } from '@angular/core';
import { FinancialAnalysisService } from './financial-analysis.service';
import { ClockService } from '../infra/clock.service';

export interface FlujoDiario {
  fecha: Date;
  ingresoEsperado: number;
  obligacionVence: number;
  saldoEstimado: number;
}

@Injectable({ providedIn: 'root' })
export class CashFlowService {
  private analysis = inject(FinancialAnalysisService);
  private clock = inject(ClockService);

  readonly flujoCicloActivo = computed<FlujoDiario[]>(() => {
    if (!this.analysis.hayCicloActivo()) return [];

    const hoy = this.clock.today();
    const diasRestantes = this.analysis.diasHastaProximoPago();
    const dlr = this.analysis.dineroLibreReal();
    const velocidad = this.analysis.velocidadGasto();

    const compromisos = this.analysis.compromisosPendientes();
    const items: FlujoDiario[] = [];

    let saldoEstimado = dlr;
    for (let d = 0; d <= diasRestantes; d++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + d);

      const obligacionVence = compromisos
        .filter(c => c.fechaVencimiento &&
          new Date(c.fechaVencimiento).toDateString() === fecha.toDateString())
        .reduce((acc, c) => acc + c.saldoPendiente, 0);

      saldoEstimado -= velocidad + obligacionVence;
      items.push({
        fecha,
        ingresoEsperado: 0,
        obligacionVence,
        saldoEstimado,
      });
    }
    return items;
  });
}
