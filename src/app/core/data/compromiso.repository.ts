import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './finanzas.db';
import { Compromiso } from '../domain';

@Injectable({ providedIn: 'root' })
export class CompromisoRepository {
  list(): Promise<Compromiso[]> { return db.compromisos.toArray(); }
  porCiclo(cicloId: string): Promise<Compromiso[]> {
    return db.compromisos.where('periodo').equals(cicloId).toArray();
  }
  get(id: string): Promise<Compromiso | undefined> { return db.compromisos.get(id); }
  add(c: Compromiso): Promise<string> { return db.compromisos.add(c); }
  update(id: string, patch: Partial<Compromiso>): Promise<number> { return db.compromisos.update(id, patch); }
  delete(id: string): Promise<void> { return db.compromisos.delete(id); }

  live$() { return from(liveQuery(() => db.compromisos.toArray())); }
  livePorCiclo$(cicloId: string) {
    return from(liveQuery(() => db.compromisos.where('periodo').equals(cicloId).toArray()));
  }
}
