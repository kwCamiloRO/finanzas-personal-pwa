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

  // v0.3.0 — ciclo visualizado en dashboard (puede ser distinto al activo).
  // Default: el activo. El usuario puede cambiarlo via selector sin tocar rutas.
  private _cicloViendoIdOverride = signal<string | null>(null);
  readonly cicloViendoId = computed(() =>
    this._cicloViendoIdOverride() ?? this.cicloActivoId() ?? ''
  );
  readonly cicloViendo = computed(() =>
    this.ciclos().find(c => c.id === this.cicloViendoId()) ?? null
  );
  setCicloViendo(id: string | null) { this._cicloViendoIdOverride.set(id); }
  resetCicloViendo() { this._cicloViendoIdOverride.set(null); }

  // Listado de ciclos cerrados o anteriores al activo (descendente por fechaPago)
  readonly ciclosHistoricos = computed(() => {
    const activoId = this.cicloActivoId();
    return [...this.ciclos()]
      .filter(c => c.id !== activoId)
      .sort((a, b) => +new Date(b.fechaPago) - +new Date(a.fechaPago));
  });

  async crearCiclo(input: {
    fechaPago: Date;
    notas?: string;
    setActivo?: boolean;
    fechaInicio?: Date;
    fechaFin?: Date;
    creadoAutomaticamente?: boolean;
    generadoDesdeConfiguracion?: boolean;
  }): Promise<Ciclo> {
    const ciclo: Ciclo = {
      id: uid('C-'),
      fechaPago: input.fechaPago,
      estado: 'Abierto',
      notas: input.notas,
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      creadoAutomaticamente: input.creadoAutomaticamente,
      generadoDesdeConfiguracion: input.generadoDesdeConfiguracion,
    };
    await db.transaction('rw', db.ciclos, db.config, async () => {
      await db.ciclos.add(ciclo);
      // Vincular al ciclo anterior (si existe) por fechaPago anterior más cercano
      const anteriores = await db.ciclos
        .where('fechaPago').below(ciclo.fechaPago)
        .reverse().sortBy('fechaPago');
      const anterior = anteriores[0];
      if (anterior) {
        await db.ciclos.update(ciclo.id, { cicloAnteriorId: anterior.id });
        await db.ciclos.update(anterior.id, { cicloSiguienteId: ciclo.id });
        // fechaFin del anterior = fechaPago de este - 1 (si aún no tiene)
        const anteriorActualizado = await db.ciclos.get(anterior.id);
        if (anteriorActualizado && !anteriorActualizado.fechaFin) {
          const ff = new Date(ciclo.fechaPago);
          ff.setDate(ff.getDate() - 1);
          await db.ciclos.update(anterior.id, { fechaFin: ff });
        }
      }
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
