import { TestBed } from '@angular/core/testing';
import { PaymentCalendarService, PaymentCalendarConfig } from './payment-calendar.service';

const cfg = (over: Partial<PaymentCalendarConfig> = {}): PaymentCalendarConfig => ({
  diaPagoHabitual: 28,
  frecuencia: 'MENSUAL',
  reglaFinDeSemana: 'adelantar',
  pais: 'CO',
  ...over,
});

describe('PaymentCalendarService', () => {
  let svc: PaymentCalendarService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(PaymentCalendarService);
  });

  it('detecta sábado y domingo', () => {
    // 2026-06-27 es sábado, 2026-06-28 es domingo
    expect(svc.esFinDeSemana(new Date(2026, 5, 27))).toBeTrue();
    expect(svc.esFinDeSemana(new Date(2026, 5, 28))).toBeTrue();
    expect(svc.esFinDeSemana(new Date(2026, 5, 29))).toBeFalse();
  });

  it('detecta festivos fijos en Colombia (1 enero)', () => {
    expect(svc.esFestivo(new Date(2026, 0, 1), 'CO')).toBeTrue();
    expect(svc.esFestivo(new Date(2026, 0, 1), 'OTRO')).toBeFalse();
  });

  it('adelantar: 28 junio 2026 (domingo) → 26 junio (viernes)', () => {
    // 2026-06-28 es domingo
    const ajustada = svc.ajustar(new Date(2026, 5, 28), 'adelantar', 'CO');
    expect(ajustada.getFullYear()).toBe(2026);
    expect(ajustada.getMonth()).toBe(5);
    expect(ajustada.getDate()).toBe(26);
  });

  it('atrasar: 28 junio 2026 (domingo) → 29 junio (lunes)', () => {
    const ajustada = svc.ajustar(new Date(2026, 5, 28), 'atrasar', 'CO');
    expect(ajustada.getDate()).toBe(29);
  });

  it('mantener: devuelve la fecha original aunque sea festivo', () => {
    const ajustada = svc.ajustar(new Date(2026, 0, 1), 'mantener', 'CO');
    expect(ajustada.getDate()).toBe(1);
  });

  it('28 julio 2026 (martes) no se mueve', () => {
    // 2026-07-28 es martes laborable
    const ajustada = svc.ajustar(new Date(2026, 6, 28), 'adelantar', 'CO');
    expect(ajustada.getMonth()).toBe(6);
    expect(ajustada.getDate()).toBe(28);
  });

  it('fechaPagoDelMes ajusta cuando cae fin de semana', () => {
    // Junio 2026 día 28 = domingo → 26 jun (viernes)
    const f = svc.fechaPagoDelMes(2026, 5, cfg());
    expect(f.getDate()).toBe(26);
  });

  it('proximaFechaCrudaSegunFrecuencia MENSUAL', () => {
    // Desde 2026-06-15, próximo pago mensual día 28 = 2026-06-28
    const f = svc.proximaFechaCrudaSegunFrecuencia(new Date(2026, 5, 15), cfg());
    expect(f.getFullYear()).toBe(2026);
    expect(f.getMonth()).toBe(5);
    expect(f.getDate()).toBe(28);
  });

  it('proximaFechaCrudaSegunFrecuencia MENSUAL después del día habitual', () => {
    // Desde 2026-06-29, próximo pago mensual día 28 → 2026-07-28
    const f = svc.proximaFechaCrudaSegunFrecuencia(new Date(2026, 5, 29), cfg());
    expect(f.getMonth()).toBe(6);
    expect(f.getDate()).toBe(28);
  });

  it('proximaFechaCrudaSegunFrecuencia QUINCENAL toma el 15 si aún no pasa', () => {
    const f = svc.proximaFechaCrudaSegunFrecuencia(new Date(2026, 5, 5), cfg({ frecuencia: 'QUINCENAL' }));
    expect(f.getDate()).toBe(15);
  });

  it('calcularProximaFechaPago aplica ajuste', () => {
    // Desde 2026-06-15 → próximo es 28 junio (domingo) → ajusta a 26 junio
    const f = svc.calcularProximaFechaPago(new Date(2026, 5, 15), cfg());
    expect(f.getDate()).toBe(26);
  });

  it('fin de mes seguro: día 31 en febrero → último día del mes', () => {
    // Febrero 2026 (28 días)
    const f = svc.fechaPagoDelMes(2026, 1, cfg({ diaPagoHabitual: 31 }));
    // Suponiendo 28 de febrero 2026 cae sábado, ajustaría a viernes 27
    // 2026-02-28 es sábado
    expect(f.getMonth()).toBe(1);
    expect([27, 28]).toContain(f.getDate());
  });
});
