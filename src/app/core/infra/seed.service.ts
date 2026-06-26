import { Injectable } from '@angular/core';
import { db } from '../data/finanzas.db';

const SEED_DEFAULTS: { parametro: string; valor: string; descripcion: string }[] = [
  { parametro: 'IngresoBase',          valor: '0',       descripcion: 'Salario base mensual neto en COP.' },
  { parametro: 'FondoOperativo',       valor: '0',       descripcion: 'Reserva intocable: alimentacion, gasolina e imprevistos.' },
  { parametro: 'CicloActivo',          valor: '',        descripcion: 'CicloID actualmente en curso.' },
  { parametro: 'MonedaSimbolo',        valor: 'COP',     descripcion: 'Moneda utilizada en el libro.' },
  { parametro: 'UmbralVerde',          valor: '1500000', descripcion: 'DLR >= este valor -> VERDE.' },
  { parametro: 'UmbralAmarillo',       valor: '500000',  descripcion: 'DLR >= este valor y < UmbralVerde -> AMARILLO.' },
  { parametro: 'UmbralNFModerada',     valor: '0',       descripcion: 'NF <= este valor -> Sin Necesidad.' },
  { parametro: 'UmbralNFCritica',      valor: '1500000', descripcion: 'NF > este valor -> Requiere Credito.' },
  { parametro: 'FrecuenciaPago',       valor: 'QUINCENAL', descripcion: 'QUINCENAL | MENSUAL | VARIABLE.' },
  { parametro: 'OnboardingCompletado', valor: 'true',    descripcion: 'Marcador del onboarding (MVP: skip).' },
  { parametro: 'Modo',                 valor: 'COMPLETO', descripcion: 'SIMPLE | COMPLETO.' },
  { parametro: 'DiaPagoHabitual',      valor: '28',      descripcion: 'Dia del mes en que normalmente recibes el pago.' },
  { parametro: 'ReglaFinDeSemana',     valor: 'adelantar', descripcion: 'Si la fecha cae sab/dom/festivo: adelantar | atrasar | mantener.' },
  { parametro: 'Pais',                 valor: 'CO',      descripcion: 'Codigo de pais (CO, MX, AR, ...) para calendario de festivos.' },
];

@Injectable({ providedIn: 'root' })
export class SeedService {
  async runIfFirstTime(): Promise<void> {
    const existentes = await db.config.count();
    if (existentes > 0) return;
    await db.config.bulkAdd(SEED_DEFAULTS);
  }
}
