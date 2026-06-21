import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IngresoRepository } from '../data/ingreso.repository';
import { Ingreso } from '../domain';
import { uid } from '../data/finanzas.db';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private repo = inject(IngresoRepository);
  readonly ingresos = toSignal(this.repo.live$(), { initialValue: [] as Ingreso[] });

  async crear(input: Omit<Ingreso, 'id'>): Promise<Ingreso> {
    const ingreso: Ingreso = { ...input, id: uid('I-') };
    await this.repo.add(ingreso);
    return ingreso;
  }

  actualizar(id: string, patch: Partial<Ingreso>) { return this.repo.update(id, patch); }
  eliminar(id: string) { return this.repo.delete(id); }
}
