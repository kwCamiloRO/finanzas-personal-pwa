/**
 * Tests del motor de proyecciones.
 * Para `proyectarProximoCiclo` y `crearSiguienteCiclo` se usa la API pública del servicio.
 * Para `simularImpacto` y `compararCiclo` se prueban como funciones puras con datos sintéticos.
 */
import { TestBed } from '@angular/core/testing';
import { ProjectionService } from './projection.service';
import * as fc from './financial-calculations';
import { db } from '../data/finanzas.db';
import { Ciclo, Obligacion } from '../domain';

const d = (s: string) => new Date(s + 'T00:00:00');

describe('ProjectionService.simularImpacto', () => {
  let service: ProjectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectionService);
  });

  it('Ingreso adicional sube DLP', () => {
    const data: fc.DataSnap = {
      ciclos: [{ id: 'C1', fechaPago: d('2026-06-26'), estado: 'Abierto' }],
      ingresos: [{ id: 'I1', cicloId: 'C1', tipo: 'Salario', valor: 6_500_000, estado: 'Esperado', fecha: d('2026-06-20') }],
      obligaciones: [{ id: 'O1', nombre: 'Arriendo', tipo: 'Otro' as any, prioridad: 'A', recurrente: true, activa: true, valorEsperadoTipico: 1_750_000 }],
      compromisos: [], pagos: [], gastos: [],
    };
    const impacto = service.simularImpacto(data, 'C1', { tipo: 'ingreso', monto: 2_000_000 });
    expect(impacto.dlpAntes).toBe(4_750_000);
    expect(impacto.dlpDespues).toBe(6_750_000);
    expect(impacto.delta).toBe(2_000_000);
  });

  it('Gasto extra baja DLP', () => {
    const data: fc.DataSnap = {
      ciclos: [{ id: 'C1', fechaPago: d('2026-06-26'), estado: 'Abierto' }],
      ingresos: [{ id: 'I1', cicloId: 'C1', tipo: 'Salario', valor: 6_500_000, estado: 'Esperado', fecha: d('2026-06-20') }],
      obligaciones: [], compromisos: [], pagos: [], gastos: [],
    };
    const impacto = service.simularImpacto(data, 'C1', { tipo: 'gasto', monto: 500_000 });
    expect(impacto.delta).toBe(-500_000);
  });

  it('Pago de compromiso no cambia DLP (ya estaba restado)', () => {
    const data: fc.DataSnap = {
      ciclos: [{ id: 'C1', fechaPago: d('2026-06-26'), estado: 'Abierto' }],
      ingresos: [{ id: 'I1', cicloId: 'C1', tipo: 'Salario', valor: 6_500_000, estado: 'Esperado', fecha: d('2026-06-20') }],
      obligaciones: [{ id: 'O1', nombre: 'Arriendo', tipo: 'Otro' as any, prioridad: 'A', recurrente: true, activa: true, valorEsperadoTipico: 1_750_000 }],
      compromisos: [], pagos: [], gastos: [],
    };
    const impacto = service.simularImpacto(data, 'C1', { tipo: 'pago', monto: 500_000 });
    expect(impacto.delta).toBe(0);
  });
});


describe('ProjectionService.compararCiclo', () => {
  let service: ProjectionService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectionService);
  });

  it('Devuelve diferencia 0 cuando todo se ejecutó tal cual se planeó', () => {
    const data: fc.DataSnap = {
      ciclos: [{ id: 'C1', fechaPago: d('2026-06-26'), estado: 'Cerrado' }],
      ingresos: [{ id: 'I1', cicloId: 'C1', tipo: 'Salario', valor: 6_500_000, estado: 'Recibido', fecha: d('2026-06-26') }],
      obligaciones: [{ id: 'O1', nombre: 'Arriendo', tipo: 'Otro' as any, prioridad: 'A', recurrente: true, activa: true, valorEsperadoTipico: 1_750_000 }],
      compromisos: [{ id: 'CM1', obligacionId: 'O1', periodo: 'C1', valorProyectado: 1_750_000, valorReal: 1_750_000 }],
      pagos: [{ id: 'P1', fuente: 'Compromiso', compromisoId: 'CM1', monto: 1_750_000, fecha: d('2026-06-26') }],
      gastos: [{ id: 'G1', cicloId: 'C1', valor: 2_000_000, fecha: d('2026-06-30'), categoria: 'Otro' as any }],
    };
    const cmp = service.compararCiclo(data, 'C1');
    expect(cmp.diferencia).toBe(0);
  });
});


describe('ProjectionService.crearSiguienteCiclo (integración Dexie)', () => {
  let service: ProjectionService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectionService);
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it('Crea ciclo y clona obligaciones recurrentes como compromisos', async () => {
    const o1: Obligacion = { id: 'O1', nombre: 'Arriendo', tipo: 'Otro' as any, prioridad: 'A',
      recurrente: true, activa: true, valorEsperadoTipico: 1_750_000 };
    const o2: Obligacion = { id: 'O2', nombre: 'Eventual', tipo: 'Otro' as any, prioridad: 'C',
      recurrente: false, activa: true, valorEsperadoTipico: 100_000 };
    await db.obligaciones.bulkAdd([o1, o2]);

    const nuevo = await service.crearSiguienteCiclo(d('2026-07-26'));
    expect(nuevo.id).toBeTruthy();
    expect(nuevo.estado).toBe('Abierto');

    const compromisos = await db.compromisos.where('periodo').equals(nuevo.id).toArray();
    // Solo la recurrente debería estar replicada
    expect(compromisos.length).toBe(1);
    expect(compromisos[0].obligacionId).toBe('O1');
    expect(compromisos[0].valorReal).toBe(1_750_000);
  });

  it('Con opción activar=true setea CicloActivo en CONFIG', async () => {
    await db.config.put({ parametro: 'CicloActivo', valor: '', descripcion: '' });
    const nuevo = await service.crearSiguienteCiclo(d('2026-07-26'), { activar: true });
    const cfg = await db.config.get('CicloActivo');
    expect(cfg?.valor).toBe(nuevo.id);
  });
});


describe('ProjectionService.proyectarProximoCiclo', () => {
  let service: ProjectionService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectionService);
    await db.delete();
    await db.open();
    await db.config.put({ parametro: 'IngresoBase', valor: '6500000', descripcion: '' });
  });

  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it('Sin historial: gastos proyectados = 0', async () => {
    await db.obligaciones.add({ id: 'O1', nombre: 'Arriendo', tipo: 'Otro' as any, prioridad: 'A',
      recurrente: true, activa: true, valorEsperadoTipico: 1_750_000 });
    const p = await service.proyectarProximoCiclo();
    expect(p.ingresoProyectado).toBe(6_500_000);
    expect(p.obligacionesProyectadas).toBe(1_750_000);
    expect(p.gastosProyectados).toBe(0);
    expect(p.dlpProyectado).toBe(4_750_000);
  });

  it('Con ingreso estimado custom respeta el valor', async () => {
    const p = await service.proyectarProximoCiclo({ ingresoEstimado: 9_000_000 });
    expect(p.ingresoProyectado).toBe(9_000_000);
  });
});
