import { Injectable, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CicloRepository } from '../data/ciclo.repository';
import { ConfigRepository } from '../data/config.repository';
import { Ciclo } from '../domain';
import { uid, db } from '../data/finanzas.db';

@Injectable({ providedIn: 'root' })
export class CycleService {
  private ciclosRepo = inject(CicloRepository);
  private configRepo = inject(ConfigRepository);

  readonly ciclos = toSignal(this.ciclosRepo.live$(), { initialValue: [] as Ciclo[] });
  readonly configRows = toSignal(this.configRepo.live$(), { initialValue: [] });

  readonly cicloActivoId = computed(() => {
    const row = this.configRows().find(r => r.parametro === 'CicloActivo');
    return row?.valor || null;
  });

  readonly cicloActivo = computed(() => {
    const id = this.cicloActivoId();
    if (!id) return null;
    return this.ciclos().find(c => c.id === id) ?? null;
  });

  async crearCiclo(input: { fechaPago: Date; notas?: string; setActivo?: boolean }): Promise<Ciclo> {
    const ciclo: Ciclo = {
      id: uid('C-'),
      fechaPago: input.fechaPago,
      estado: 'Abierto',
      notas: input.notas,
    };
    await db.transaction('rw', db.ciclos, db.config, async () => {
      await db.ciclos.add(ciclo);
      if (input.setActivo) {
        await this.configRepo.set('CicloActivo', ciclo.id);
      }
    });
    return ciclo;
  }

  async actualizarCiclo(id: string, patch: Partial<Ciclo>): Promise<void> {
    await this.ciclosRepo.update(id, patch);
  }

  async cerrarCiclo(id: string): Promise<void> {
    await this.ciclosRepo.update(id, { estado: 'Cerrado' });
    const activo = await this.configRepo.getValor('CicloActivo');
    if (activo === id) {
      await this.configRepo.set('CicloActivo', '');
    }
  }

  async marcarActivo(id: string): Promise<void> {
    const ciclo = await this.ciclosRepo.get(id);
    if (!ciclo) return;
    await db.transaction('rw', db.ciclos, db.config, async () => {
      if (ciclo.estado === 'Cerrado') {
        await db.ciclos.update(id, { estado: 'Abierto' });
      }
      await this.configRepo.set('CicloActivo', id);
    });
  }

  async eliminar(id: string): Promise<void> {
    const activo = await this.configRepo.getValor('CicloActivo');
    if (activo === id) {
      await this.configRepo.set('CicloActivo', '');
    }
    await this.ciclosRepo.delete(id);
  }
}
