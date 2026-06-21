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
  }
}

export const db = new FinanzasDB();

export function uid(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}${ts}${rnd}`;
}
