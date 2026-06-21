import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GastoRepository } from '../data/gasto.repository';
import { Gasto } from '../domain';
import { uid } from '../data/finanzas.db';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private repo = inject(GastoRepository);
  readonly gastos = toSignal(this.repo.live$(), { initialValue: [] as Gasto[] });

  async crear(input: Omit<Gasto, 'id'>): Promise<Gasto> {
    const gasto: Gasto = { ...input, id: uid('G-') };
    await this.repo.add(gasto);
    return gasto;
  }

  actualizar(id: string, patch: Partial<Gasto>) { return this.repo.update(id, patch); }
  eliminar(id: string) { return this.repo.delete(id); }
}
