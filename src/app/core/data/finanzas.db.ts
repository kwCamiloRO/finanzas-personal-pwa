import Dexie, { Table } from 'dexie';
import {
  ConfigRow, Ciclo, Ingreso, Obligacion, Compromiso, Pago, Gasto, Deuda
} from '../domain';

export class FinanzasDB extends Dexie {
  config!:       Table<ConfigRow, string>;
  ciclos!:       Table<Ciclo, string>;
  ingresos!:     Table<Ingreso, string>;
  obligaciones!: Table<Obligacion, string>;
  compromisos!:  Table<Compromiso, string>;
  pagos!:        Table<Pago, string>;
  gastos!:       Table<Gasto, string>;
  deudas!:       Table<Deuda, string>;

  constructor() {
    super('FinanzasDB');

    // v1 — esquema original
    this.version(1).stores({
      config:       'parametro',
      ciclos:       'id, fechaPago, estado',
      ingresos:     'id, cicloId, fecha, tipo, estado',
      obligaciones: 'id, tipo, prioridad, activa',
      compromisos:  'id, obligacionId, periodo, fechaVencimiento',
      pagos:        'id, fecha, fuente, compromisoId, deudaId',
      gastos:       'id, cicloId, fecha, categoria',
      deudas:       'id, persona, prioridad',
    });

    // v2 — aditivo: nuevos campos opcionales + nuevos índices auxiliares.
    // Se ejecuta automáticamente la primera vez que se abre con esta versión.
    // No borra ni reescribe nada que ya esté en la BD del usuario.
    this.version(2).stores({
      config:       'parametro',
      ciclos:       'id, fechaPago, estado, fechaInicio, fechaFin',
      ingresos:     'id, cicloId, fecha, tipo, estado',
      obligaciones: 'id, tipo, prioridad, activa, estadoFinalizacion',
      compromisos:  'id, obligacionId, periodo, fechaVencimiento, estadoRapido',
      pagos:        'id, fecha, fuente, compromisoId, deudaId',
      gastos:       'id, cicloId, fecha, categoria',
      deudas:       'id, persona, prioridad',
    }).upgrade(async tx => {
      // Backfill conservador: si faltan campos, los inferimos.
      // No tocamos nada que el usuario ya tenga seteado.

      // 1) ciclos: inferir fechaInicio / fechaFin si falta.
      const ciclos = await tx.table<Ciclo>('ciclos').toArray();
      ciclos.sort((a, b) => +new Date(a.fechaPago) - +new Date(b.fechaPago));
      for (let i = 0; i < ciclos.length; i++) {
        const c = ciclos[i];
        const prev = i > 0 ? ciclos[i - 1] : null;
        const next = i < ciclos.length - 1 ? ciclos[i + 1] : null;
        const patch: Partial<Ciclo> = {};
        if (!c.fechaInicio) {
          patch.fechaInicio = prev ? new Date(prev.fechaPago) : new Date(c.fechaPago);
        }
        if (!c.fechaFin && next) {
          const f = new Date(next.fechaPago);
          f.setDate(f.getDate() - 1);
          patch.fechaFin = f;
        }
        if (prev && !c.cicloAnteriorId) patch.cicloAnteriorId = prev.id;
        if (next && !c.cicloSiguienteId) patch.cicloSiguienteId = next.id;
        if (Object.keys(patch).length > 0) {
          await tx.table('ciclos').update(c.id, patch);
        }
      }

      // 2) obligaciones: si tienen `activa=false` y no tienen estadoFinalizacion, marcarlas 'Finalizada'.
      //    Si activa=true sin estadoFinalizacion, marcar 'Activa'.
      await tx.table<Obligacion>('obligaciones').toCollection().modify(o => {
        if (!o.estadoFinalizacion) {
          o.estadoFinalizacion = o.activa ? 'Activa' : 'Finalizada';
        }
      });

      // 3) Sembrar nuevos parámetros de config sin sobrescribir los que ya existen.
      const NUEVOS: { parametro: string; valor: string; descripcion: string }[] = [
        { parametro: 'DiaPagoHabitual',   valor: '28',  descripcion: 'Día del mes en que normalmente recibes el pago.' },
        { parametro: 'ReglaFinDeSemana',  valor: 'adelantar', descripcion: 'Si la fecha cae sábado/domingo/festivo: adelantar | atrasar | mantener.' },
        { parametro: 'Pais',              valor: 'CO',  descripcion: 'Código de país (CO, MX, AR, ...) para calendario de festivos.' },
      ];
      for (const n of NUEVOS) {
        const existe = await tx.table('config').get(n.parametro);
        if (!existe) await tx.table('config').add(n);
      }
    });
  }
}

export const db = new FinanzasDB();

export function uid(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}${ts}${rnd}`;
}
