import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './finanzas.db';
import { Ingreso } from '../domain';

@Injectable({ providedIn: 'root' })
export class IngresoRepository {
  list(): Promise<Ingreso[]> {
    return db.ingresos.orderBy('fecha').reverse().toArray();
  }
  porCiclo(cicloId: string): Promise<Ingreso[]> {
    return db.ingresos.where('cicloId').equals(cicloId).toArray();
  }
  add(i: Ingreso): Promise<string> { return db.ingresos.add(i); }
  update(id: string, patch: Partial<Ingreso>): Promise<number> { return db.ingresos.update(id, patch); }
  delete(id: string): Promise<void> { return db.ingresos.delete(id); }

  live$() {
    return from(liveQuery(() =>
      db.ingresos.orderBy('fecha').reverse().toArray()
    ));
  }
  livePorCiclo$(cicloId: string) {
    return from(liveQuery(() =>
      db.ingresos.where('cicloId').equals(cicloId).toArray()
    ));
  }
}
