import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ObligacionRepository } from '../data/obligacion.repository';
import { Obligacion } from '../domain';
import { uid } from '../data/finanzas.db';

@Injectable({ providedIn: 'root' })
export class ObligationService {
  private repo = inject(ObligacionRepository);
  readonly obligaciones = toSignal(this.repo.live$(), { initialValue: [] as Obligacion[] });

  async crear(input: Omit<Obligacion, 'id'>): Promise<Obligacion> {
    const o: Obligacion = { ...input, id: uid('O-') };
    await this.repo.add(o);
    return o;
  }

  actualizar(id: string, patch: Partial<Obligacion>) { return this.repo.update(id, patch); }
  eliminar(id: string) { return this.repo.delete(id); }
}
