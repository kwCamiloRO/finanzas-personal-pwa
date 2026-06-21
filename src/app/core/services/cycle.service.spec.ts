/**
 * Tests del CycleService: solamente un ciclo activo, transiciones, eliminación.
 * Usa la base de datos Dexie real (resetea entre tests).
 */
import { TestBed } from '@angular/core/testing';
import { CycleService } from './cycle.service';
import { db } from '../data/finanzas.db';

const d = (s: string) => new Date(s + 'T00:00:00');

describe('CycleService', () => {
  let service: CycleService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CycleService);
    await db.delete();
    await db.open();
    await db.config.put({ parametro: 'CicloActivo', valor: '', descripcion: '' });
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it('crearCiclo con setActivo=true marca activo en CONFIG', async () => {
    const c = await service.crearCiclo({ fechaPago: d('2026-06-26'), setActivo: true });
    const cfg = await db.config.get('CicloActivo');
    expect(cfg?.valor).toBe(c.id);
  });

  it('Solo un ciclo puede ser activo a la vez', async () => {
    const c1 = await service.crearCiclo({ fechaPago: d('2026-06-26'), setActivo: true });
    const c2 = await service.crearCiclo({ fechaPago: d('2026-07-26'), setActivo: false });

    let cfg = await db.config.get('CicloActivo');
    expect(cfg?.valor).toBe(c1.id);

    await service.marcarActivo(c2.id);
    cfg = await db.config.get('CicloActivo');
    expect(cfg?.valor).toBe(c2.id);
    // C1 sigue existiendo, simplemente ya no es el activo
    const c1Existe = await db.ciclos.get(c1.id);
    expect(c1Existe).toBeTruthy();
  });

  it('cerrarCiclo limpia CicloActivo si era el activo', async () => {
    const c = await service.crearCiclo({ fechaPago: d('2026-06-26'), setActivo: true });
    await service.cerrarCiclo(c.id);
    const ciclo = await db.ciclos.get(c.id);
    expect(ciclo?.estado).toBe('Cerrado');
    const cfg = await db.config.get('CicloActivo');
    expect(cfg?.valor).toBe('');
  });

  it('eliminar borra el ciclo y resetea CicloActivo si aplica', async () => {
    const c = await service.crearCiclo({ fechaPago: d('2026-06-26'), setActivo: true });
    await service.eliminar(c.id);
    expect(await db.ciclos.get(c.id)).toBeUndefined();
    const cfg = await db.config.get('CicloActivo');
    expect(cfg?.valor).toBe('');
  });

  it('marcarActivo en un ciclo Cerrado lo reabre', async () => {
    const c = await service.crearCiclo({ fechaPago: d('2026-06-26'), setActivo: true });
    await service.cerrarCiclo(c.id);
    expect((await db.ciclos.get(c.id))?.estado).toBe('Cerrado');
    await service.marcarActivo(c.id);
    expect((await db.ciclos.get(c.id))?.estado).toBe('Abierto');
  });
});
