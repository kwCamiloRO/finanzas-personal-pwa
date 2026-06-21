import { Injectable, inject } from '@angular/core';
import { PagoRepository } from '../data/pago.repository';
import { Pago, PagoFuente } from '../domain';
import { uid } from '../data/finanzas.db';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private repo = inject(PagoRepository);

  async registrarPagoCompromiso(input: {
    compromisoId: string;
    monto: number;
    fecha?: Date;
    comentario?: string;
  }): Promise<Pago> {
    const pago: Pago = {
      id: uid('P-'),
      fuente: 'Compromiso',
      compromisoId: input.compromisoId,
      monto: input.monto,
      fecha: input.fecha ?? new Date(),
      comentario: input.comentario,
    };
    await this.repo.add(pago);
    return pago;
  }

  async registrarPagoDeuda(input: {
    deudaId: string;
    monto: number;
    fecha?: Date;
    comentario?: string;
  }): Promise<Pago> {
    const pago: Pago = {
      id: uid('P-'),
      fuente: 'Deuda',
      deudaId: input.deudaId,
      monto: input.monto,
      fecha: input.fecha ?? new Date(),
      comentario: input.comentario,
    };
    await this.repo.add(pago);
    return pago;
  }

  eliminar(id: string) { return this.repo.delete(id); }
}
