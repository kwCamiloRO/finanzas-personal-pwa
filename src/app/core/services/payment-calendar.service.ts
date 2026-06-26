import { Injectable } from '@angular/core';

export type ReglaFinDeSemana = 'adelantar' | 'atrasar' | 'mantener';
export type PaisCalendario = 'CO' | 'MX' | 'AR' | 'CL' | 'PE' | 'EC' | 'ES' | 'OTRO';
export type Frecuencia = 'QUINCENAL' | 'MENSUAL' | 'VARIABLE';

export interface PaymentCalendarConfig {
  diaPagoHabitual: number;
  frecuencia: Frecuencia;
  reglaFinDeSemana: ReglaFinDeSemana;
  pais: PaisCalendario;
}

/**
 * Festivos por país. Solo Colombia poblada por ahora.
 * El servicio queda abierto a extensión: el set de fechas se busca por país.
 * Cada fecha es "MM-DD" para festivos fijos o "YYYY-MM-DD" para festivos con cálculo eclesiástico.
 *
 * Para mantener el código simple, listamos un set base de festivos fijos + algunos lunes festivos
 * 2024-2030. Es suficiente para el motor de pagos (decide si "adelantar/atrasar" un día concreto).
 * Si necesitamos precisión total para todos los años, se agrega un computeColombianHolidays(year).
 */
const FESTIVOS_FIJOS_CO: string[] = [
  '01-01', // Año nuevo
  '05-01', // Día del trabajo
  '07-20', // Independencia
  '08-07', // Boyacá
  '12-08', // Inmaculada
  '12-25', // Navidad
];

// Lunes festivos pre-calculados (2024-2030). Si la fecha cae aquí, ese día es festivo.
const FESTIVOS_VARIABLES_CO: Record<number, string[]> = {
  2024: ['2024-01-08','2024-03-25','2024-03-28','2024-03-29','2024-05-13','2024-06-03','2024-06-10','2024-07-01','2024-08-19','2024-10-14','2024-11-04','2024-11-11'],
  2025: ['2025-01-06','2025-03-24','2025-04-17','2025-04-18','2025-06-02','2025-06-23','2025-06-30','2025-08-18','2025-10-13','2025-11-03','2025-11-17'],
  2026: ['2026-01-12','2026-03-23','2026-04-02','2026-04-03','2026-05-18','2026-06-08','2026-06-15','2026-08-17','2026-10-12','2026-11-02','2026-11-16'],
  2027: ['2027-01-11','2027-03-22','2027-03-25','2027-03-26','2027-05-10','2027-05-31','2027-06-07','2027-08-16','2027-10-18','2027-11-01','2027-11-15'],
  2028: ['2028-01-10','2028-03-20','2028-04-13','2028-04-14','2028-05-29','2028-06-19','2028-06-26','2028-08-21','2028-10-16','2028-11-06','2028-11-13'],
  2029: ['2029-01-08','2029-03-19','2029-03-29','2029-03-30','2029-05-14','2029-06-04','2029-06-11','2029-08-20','2029-10-15','2029-11-05','2029-11-12'],
  2030: ['2030-01-07','2030-03-25','2030-04-18','2030-04-19','2030-06-03','2030-06-24','2030-07-01','2030-08-19','2030-10-14','2030-11-04','2030-11-11'],
};

export interface HolidayProvider {
  esFestivo(fecha: Date): boolean;
}

const colombiaProvider: HolidayProvider = {
  esFestivo(fecha: Date): boolean {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    if (FESTIVOS_FIJOS_CO.includes(`${mm}-${dd}`)) return true;
    const yyyy = fecha.getFullYear();
    const lista = FESTIVOS_VARIABLES_CO[yyyy] ?? [];
    const iso = `${yyyy}-${mm}-${dd}`;
    return lista.includes(iso);
  }
};

const noopProvider: HolidayProvider = { esFestivo: () => false };

function providerFor(pais: PaisCalendario): HolidayProvider {
  if (pais === 'CO') return colombiaProvider;
  return noopProvider;
}

@Injectable({ providedIn: 'root' })
export class PaymentCalendarService {

  /** ¿La fecha cae en sábado o domingo? */
  esFinDeSemana(fecha: Date): boolean {
    const d = fecha.getDay();
    return d === 0 || d === 6;
  }

  /** ¿La fecha es festiva en el país configurado? */
  esFestivo(fecha: Date, pais: PaisCalendario = 'CO'): boolean {
    return providerFor(pais).esFestivo(fecha);
  }

  /** ¿La fecha es no laboral (sábado, domingo o festivo)? */
  esNoLaboral(fecha: Date, pais: PaisCalendario = 'CO'): boolean {
    return this.esFinDeSemana(fecha) || this.esFestivo(fecha, pais);
  }

  /**
   * Ajusta una fecha aplicando la regla cuando cae en día no laboral.
   * - adelantar: retrocede hasta encontrar día laboral
   * - atrasar:  avanza hasta encontrar día laboral
   * - mantener: devuelve la fecha tal cual
   */
  ajustar(fecha: Date, regla: ReglaFinDeSemana, pais: PaisCalendario = 'CO'): Date {
    if (regla === 'mantener') return new Date(fecha);
    const step = regla === 'adelantar' ? -1 : 1;
    let actual = new Date(fecha);
    actual.setHours(0, 0, 0, 0);
    while (this.esNoLaboral(actual, pais)) {
      actual.setDate(actual.getDate() + step);
    }
    return actual;
  }

  /**
   * Calcula la próxima fecha de pago AJUSTADA a partir de una fecha de referencia
   * y la configuración del calendario.
   */
  calcularProximaFechaPago(
    desde: Date,
    config: PaymentCalendarConfig,
  ): Date {
    const fechaCruda = this.proximaFechaCrudaSegunFrecuencia(desde, config);
    return this.ajustar(fechaCruda, config.reglaFinDeSemana, config.pais);
  }

  /**
   * Calcula la fecha de pago para un mes específico (mes, año) aplicando regla.
   * Útil para "¿en qué día real cae el pago de julio 2026?".
   */
  fechaPagoDelMes(year: number, monthZeroIndexed: number, config: PaymentCalendarConfig): Date {
    const cruda = this.fechaDelMes(year, monthZeroIndexed, config.diaPagoHabitual);
    return this.ajustar(cruda, config.reglaFinDeSemana, config.pais);
  }

  /**
   * Devuelve la próxima fecha CRUDA (sin ajuste por festivos/fin de semana)
   * a partir de una fecha de referencia y la frecuencia.
   * - QUINCENAL: 15 y diaPagoHabitual (típicamente fin de mes).
   * - MENSUAL: diaPagoHabitual del próximo mes (o este mes si aún no llegó).
   * - VARIABLE: usa diaPagoHabitual del próximo mes como mejor estimación.
   */
  proximaFechaCrudaSegunFrecuencia(desde: Date, config: PaymentCalendarConfig): Date {
    const base = new Date(desde);
    base.setHours(0, 0, 0, 0);

    if (config.frecuencia === 'QUINCENAL') {
      // candidato 1: día 15 de este mes
      const c1 = this.fechaDelMes(base.getFullYear(), base.getMonth(), 15);
      // candidato 2: diaPagoHabitual de este mes
      const c2 = this.fechaDelMes(base.getFullYear(), base.getMonth(), config.diaPagoHabitual);
      // candidato 3: día 15 del próximo mes
      const c3 = this.fechaDelMes(base.getFullYear(), base.getMonth() + 1, 15);
      const candidatos = [c1, c2, c3].filter(d => d > base);
      candidatos.sort((a, b) => +a - +b);
      return candidatos[0] ?? c3;
    }

    // MENSUAL / VARIABLE
    const propuesta = this.fechaDelMes(base.getFullYear(), base.getMonth(), config.diaPagoHabitual);
    if (propuesta > base) return propuesta;
    return this.fechaDelMes(base.getFullYear(), base.getMonth() + 1, config.diaPagoHabitual);
  }

  /** Construye una fecha YYYY-MM-DD respetando fin de mes (ej. dia 31 en febrero -> 28/29) */
  private fechaDelMes(year: number, monthZeroIndexed: number, dia: number): Date {
    const totalDiasMes = new Date(year, monthZeroIndexed + 1, 0).getDate();
    const diaSeguro = Math.min(dia, totalDiasMes);
    const f = new Date(year, monthZeroIndexed, diaSeguro);
    f.setHours(0, 0, 0, 0);
    return f;
  }
}
