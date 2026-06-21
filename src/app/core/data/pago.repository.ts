import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './finanzas.db';
import { Pago } from '../domain';

@Injectable({ providedIn: 'root' })
export class PagoRepository {
  list(): Promise<Pago[]> { return db.pagos.orderBy('fecha').reverse().toArray(); }
  porCompromiso(compromisoId: string): Promise<Pago[]> {
    return db.pagos.where('compromisoId').equals(compromisoId).toArray();
  }
  porDeuda(deudaId: string): Promise<Pago[]> {
    return db.pagos.where('deudaId').equals(deudaId).toArray();
  }
  add(p: Pago): Promise<string> { return db.pagos.add(p); }
  delete(id: string): Promise<void> { return db.pagos.delete(id); }

  live$() { return from(liveQuery(() => db.pagos.toArray())); }
}
