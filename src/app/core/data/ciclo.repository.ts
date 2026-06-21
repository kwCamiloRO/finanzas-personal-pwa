import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './finanzas.db';
import { Ciclo } from '../domain';

@Injectable({ providedIn: 'root' })
export class CicloRepository {
  list(): Promise<Ciclo[]> {
    return db.ciclos.orderBy('fechaPago').reverse().toArray();
  }
  get(id: string): Promise<Ciclo | undefined> { return db.ciclos.get(id); }

  add(c: Ciclo): Promise<string> { return db.ciclos.add(c); }
  update(id: string, patch: Partial<Ciclo>): Promise<number> { return db.ciclos.update(id, patch); }
  delete(id: string): Promise<void> { return db.ciclos.delete(id); }

  live$() {
    return from(liveQuery(() =>
      db.ciclos.orderBy('fechaPago').reverse().toArray()
    ));
  }
}
