import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './finanzas.db';
import { ConfigRow } from '../domain';

@Injectable({ providedIn: 'root' })
export class ConfigRepository {
  list(): Promise<ConfigRow[]> { return db.config.toArray(); }
  get(parametro: string): Promise<ConfigRow | undefined> { return db.config.get(parametro); }

  async getValor(parametro: string): Promise<string | undefined> {
    const row = await this.get(parametro);
    return row?.valor;
  }

  async getNumber(parametro: string, fallback = 0): Promise<number> {
    const v = await this.getValor(parametro);
    if (v === undefined || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  async set(parametro: string, valor: string, descripcion?: string): Promise<void> {
    const existente = await this.get(parametro);
    await db.config.put({ parametro, valor, descripcion: descripcion ?? existente?.descripcion });
  }

  upsert(row: ConfigRow): Promise<string> { return db.config.put(row); }

  live$() { return from(liveQuery(() => db.config.toArray())); }
}
