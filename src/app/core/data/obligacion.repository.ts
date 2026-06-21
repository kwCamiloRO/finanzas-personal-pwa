import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './finanzas.db';
import { Obligacion } from '../domain';

@Injectable({ providedIn: 'root' })
export class ObligacionRepository {
  list(): Promise<Obligacion[]> { return db.obligaciones.toArray(); }
  activas(): Promise<Obligacion[]> {
    return db.obligaciones.filter(o => o.activa).toArray();
  }
  get(id: string): Promise<Obligacion | undefined> { return db.obligaciones.get(id); }
  add(o: Obligacion): Promise<string> { return db.obligaciones.add(o); }
  update(id: string, patch: Partial<Obligacion>): Promise<number> { return db.obligaciones.update(id, patch); }
  delete(id: string): Promise<void> { return db.obligaciones.delete(id); }

  live$() { return from(liveQuery(() => db.obligaciones.toArray())); }
}
