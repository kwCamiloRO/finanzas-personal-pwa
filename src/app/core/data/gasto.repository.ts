import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './finanzas.db';
import { Gasto } from '../domain';

@Injectable({ providedIn: 'root' })
export class GastoRepository {
  list(): Promise<Gasto[]> {
    return db.gastos.orderBy('fecha').reverse().toArray();
  }
  porCiclo(cicloId: string): Promise<Gasto[]> {
    return db.gastos.where('cicloId').equals(cicloId).toArray();
  }
  add(g: Gasto): Promise<string> { return db.gastos.add(g); }
  update(id: string, patch: Partial<Gasto>): Promise<number> { return db.gastos.update(id, patch); }
  delete(id: string): Promise<void> { return db.gastos.delete(id); }

  live$() {
    return from(liveQuery(() =>
      db.gastos.orderBy('fecha').reverse().toArray()
    ));
  }
  livePorCiclo$(cicloId: string) {
    return from(liveQuery(() =>
      db.gastos.where('cicloId').equals(cicloId).toArray()
    ));
  }
}
