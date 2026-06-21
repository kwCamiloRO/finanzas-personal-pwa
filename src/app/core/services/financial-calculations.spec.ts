/**
 * Tests de la batería de escenarios de ciclos descritos en docs/TEST_PLAN_CICLOS.md.
 * Funciones puras → no requieren TestBed ni Karma config especial.
 */
import * as fc from './financial-calculations';
import { Ciclo, Ingreso, Obligacion, Compromiso, Pago, Gasto } from '../domain';

// Helpers de fábrica
const d = (s: string) => new Date(s + 'T00:00:00');
const ciclo = (id: string, fechaPago: string, estado: 'Abierto' | 'Cerrado' = 'Abierto'): Ciclo =>
  ({ id, fechaPago: d(fechaPago), estado });

const ingreso = (id: string, cicloId: string, tipo: any, valor: number, estado: any, fecha = '2026-06-20'): Ingreso =>
  ({ id, cicloId, tipo, valor, estado, fecha: d(fecha) });

const obligacion = (id: string, nombre: string, prioridad: any, valorEsperadoTipico = 0, recurrente = true, activa = true): Obligacion =>
  ({ id, nombre, tipo: 'Otro' as any, prioridad, valorEsperadoTipico, recurrente, activa });

const compromiso = (id: string, obligacionId: string, periodo: string, valorReal: number, fechaVencimiento?: string): Compromiso =>
  ({ id, obligacionId, periodo, valorProyectado: valorReal, valorReal, fechaVencimiento: fechaVencimiento ? d(fechaVencimiento) : undefined });

const pago = (id: string, fuente: 'Compromiso' | 'Deuda', refId: string, monto: number, fecha = '2026-06-20'): Pago =>
  ({ id, fuente,
     compromisoId: fuente === 'Compromiso' ? refId : undefined,
     deudaId: fuente === 'Deuda' ? refId : undefined,
     monto, fecha: d(fecha) });

const gasto = (id: string, cicloId: string, valor: number, fecha = '2026-06-20'): Gasto =>
  ({ id, cicloId, valor, fecha: d(fecha), categoria: 'Otro' as any });


describe('ESCENARIO 1 — Ciclo futuro sin ingreso recibido', () => {
  it('DLP = ingresos esperados − obligaciones, modo PLANIFICACION', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 6_500_000, 'Esperado')],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 1_750_000)],
      compromisos: [], pagos: [], gastos: [],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001' });
    const hoy = d('2026-06-20');

    expect(fc.ingresosRecibidos(data, 'C001')).toBe(0);
    expect(fc.ingresosEsperados(data, 'C001')).toBe(6_500_000);
    expect(fc.obligacionesProyectadas(data, 'C001')).toBe(1_750_000);
    expect(fc.dineroLibreProyectado(data, 'C001')).toBe(4_750_000);
    expect(fc.dineroDisponibleReal(data, 'C001')).toBe(0);
    expect(fc.modo(data, 'C001')).toBe('PLANIFICACION');
    expect(fc.fechaPagoAlcanzada(data, cfg, hoy)).toBeFalse();
    expect(fc.diasHastaProximoPago(data, cfg, hoy)).toBe(6);
  });
});


describe('ESCENARIO 2 — Gasto antes del primer ingreso', () => {
  it('Gasto cuenta hacia el ciclo activo aunque la fecha sea previa a fechaPago', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 6_500_000, 'Esperado')],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 1_750_000)],
      compromisos: [], pagos: [],
      gastos: [gasto('G1', 'C001', 10_000, '2026-06-20')],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001' });
    const hoy = d('2026-06-20');

    expect(fc.gastosCiclo(data, 'C001')).toBe(10_000);
    expect(fc.dineroLibreProyectado(data, 'C001')).toBe(4_740_000);
    expect(fc.dineroDisponibleReal(data, 'C001')).toBe(-10_000);
    // En modo PLANIFICACION el dashboard oculta DDR. La cifra negativa NO debería mostrarse.
    expect(fc.modo(data, 'C001')).toBe('PLANIFICACION');
    // diasTranscurridos = 0 (fechaPago aún no llega) → velocidad no se calcula
    expect(fc.diasTranscurridos(data, cfg, hoy)).toBe(0);
    expect(fc.velocidadGasto(data, cfg, hoy)).toBe(0);
  });
});


describe('ESCENARIO 3 — Dos ciclos existentes', () => {
  it('Solo C001 está activo; C002 aparece como siguiente', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26'), ciclo('C002', '2026-07-26')],
      ingresos: [], obligaciones: [], compromisos: [], pagos: [], gastos: [],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001' });

    const activo = fc.cicloActivo(data, cfg);
    expect(activo?.id).toBe('C001');
    const siguiente = fc.siguienteCiclo(data, cfg);
    expect(siguiente?.id).toBe('C002');
  });

  it('No hay siguiente si solo existe el activo', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [], obligaciones: [], compromisos: [], pagos: [], gastos: [],
    };
    expect(fc.siguienteCiclo(data, fc.defaultConfig({ cicloActivoId: 'C001' }))).toBeNull();
  });
});


describe('ESCENARIO 4 — Fecha de pago alcanzada (planificación→ejecución)', () => {
  it('fechaPagoAlcanzada=true cuando hoy >= fechaPago, modo sigue PLANIFICACION sin ingreso recibido', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 6_500_000, 'Esperado')],
      obligaciones: [], compromisos: [], pagos: [], gastos: [],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001' });
    const hoy = d('2026-06-27');

    expect(fc.fechaPagoAlcanzada(data, cfg, hoy)).toBeTrue();
    expect(fc.modo(data, 'C001')).toBe('PLANIFICACION');
    expect(fc.pagoEsperadoPendiente(data, cfg, hoy)).toBeTrue();
  });

  it('Cuando el usuario marca el salario como Recibido → modo EJECUCION', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 6_500_000, 'Recibido')],
      obligaciones: [], compromisos: [], pagos: [], gastos: [],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001' });
    const hoy = d('2026-06-27');

    expect(fc.modo(data, 'C001')).toBe('EJECUCION');
    expect(fc.dineroDisponibleReal(data, 'C001')).toBe(6_500_000);
    expect(fc.pagoEsperadoPendiente(data, cfg, hoy)).toBeFalse();
  });
});


describe('ESCENARIO 5 — Estimación del siguiente ciclo (fecha simulada 25 jul)', () => {
  it('Si existe C002 registrado, fechaProximoPago apunta a su fecha', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26'), ciclo('C002', '2026-07-26')],
      ingresos: [], obligaciones: [], compromisos: [], pagos: [], gastos: [],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001' });
    const hoy = d('2026-07-25');

    const fpp = fc.fechaProximoPago(data, cfg, hoy);
    expect(fpp?.toISOString().slice(0, 10)).toBe('2026-07-26');
    expect(fc.diasHastaProximoPago(data, cfg, hoy)).toBe(1);
  });

  it('Si no existe siguiente ciclo, estima por frecuencia de pago', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [], obligaciones: [], compromisos: [], pagos: [], gastos: [],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001', frecuenciaPago: 'MENSUAL' });
    const hoy = d('2026-07-25');
    const fpp = fc.fechaProximoPago(data, cfg, hoy);
    // 26-jun + 30 días = 26-jul
    expect(fpp?.toISOString().slice(0, 10)).toBe('2026-07-26');
  });
});


describe('ESCENARIO 7 — Obligaciones recurrentes en nuevo ciclo', () => {
  it('Una obligación recurrente activa sin compromiso aún aparece en obligacionesProyectadas', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C002', '2026-07-26')],
      ingresos: [], compromisos: [], pagos: [], gastos: [],
      obligaciones: [
        obligacion('O1', 'Arriendo', 'A', 1_750_000, true, true),
        obligacion('O2', 'Tarjeta', 'B', 800_000, true, true),
      ],
    };
    expect(fc.obligacionesProyectadas(data, 'C002')).toBe(2_550_000);
    expect(fc.obligacionesProyectadasPorPrioridad(data, 'C002', 'A')).toBe(1_750_000);
    expect(fc.obligacionesProyectadasPorPrioridad(data, 'C002', 'B')).toBe(800_000);
  });

  it('Si existe compromiso para esa obligación, NO se duplica', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C002', '2026-07-26')],
      ingresos: [], pagos: [], gastos: [],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 1_750_000)],
      compromisos: [compromiso('CM1', 'O1', 'C002', 1_800_000)],
    };
    // Solo se cuenta el compromiso (valor real 1.8M), no la obligación del catálogo (1.75M).
    expect(fc.obligacionesProyectadas(data, 'C002')).toBe(1_800_000);
  });
});


describe('ESCENARIO 8 — Ingreso extra (Prima)', () => {
  it('Agregar prima sube el DLP', () => {
    const sinPrima: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 6_500_000, 'Esperado')],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 1_750_000)],
      compromisos: [], pagos: [], gastos: [],
    };
    const conPrima: fc.DataSnap = {
      ...sinPrima,
      ingresos: [
        ...sinPrima.ingresos,
        ingreso('I2', 'C001', 'Prima', 2_000_000, 'Esperado'),
      ],
    };

    expect(fc.dineroLibreProyectado(sinPrima, 'C001')).toBe(4_750_000);
    expect(fc.dineroLibreProyectado(conPrima, 'C001')).toBe(6_750_000);
  });
});


describe('ESCENARIO 9 — Pago parcial de deuda', () => {
  it('Saldo de deuda refleja pagos acumulados', () => {
    const data: fc.DataSnap = {
      ciclos: [], ingresos: [], obligaciones: [], compromisos: [], gastos: [],
      pagos: [pago('P1', 'Deuda', 'D1', 250_000)],
    };
    expect(fc.valorPagadoDeuda(data, 'D1')).toBe(250_000);
    expect(fc.saldoDeuda(data, 'D1', 500_000)).toBe(250_000);
  });

  it('Saldo se trunca a 0 si se sobregira', () => {
    const data: fc.DataSnap = {
      ciclos: [], ingresos: [], obligaciones: [], compromisos: [], gastos: [],
      pagos: [
        pago('P1', 'Deuda', 'D1', 250_000),
        pago('P2', 'Deuda', 'D1', 300_000),
      ],
    };
    expect(fc.saldoDeuda(data, 'D1', 500_000)).toBe(0);
  });

  it('Saldo de compromiso refleja pagos acumulados', () => {
    const data: fc.DataSnap = {
      ciclos: [], ingresos: [], obligaciones: [], gastos: [],
      compromisos: [compromiso('CM1', 'O1', 'C001', 1_750_000)],
      pagos: [
        pago('P1', 'Compromiso', 'CM1', 500_000),
        pago('P2', 'Compromiso', 'CM1', 250_000),
      ],
    };
    expect(fc.saldoCompromiso(data, data.compromisos[0])).toBe(1_000_000);
  });
});


describe('ESCENARIO 10 — Comparación proyectado vs real al cierre', () => {
  it('Calcula diferencia entre DLP proyectado y DLR efectivo', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26', 'Cerrado')],
      ingresos: [
        ingreso('I1', 'C001', 'Salario', 6_500_000, 'Recibido'),
      ],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 1_750_000)],
      compromisos: [compromiso('CM1', 'O1', 'C001', 1_750_000)],
      pagos: [pago('P1', 'Compromiso', 'CM1', 1_750_000)],
      gastos: [gasto('G1', 'C001', 2_000_000)],
    };
    const cmp = fc.compararProyectadoVsReal(data, 'C001');
    expect(cmp.ingresoReal).toBe(6_500_000);
    expect(cmp.obligacionReal).toBe(1_750_000);
    expect(cmp.gastoReal).toBe(2_000_000);
    expect(cmp.dlpReal).toBe(2_750_000);
    // DLP proyectado en este escenario = 6.5M - 1.75M (compromiso) - 2M (gasto) = 2.75M
    expect(cmp.dlpProyectado).toBe(2_750_000);
    expect(cmp.diferencia).toBe(0);
  });

  it('Si recibí MENOS ingreso del esperado, diferencia es negativa', () => {
    // Escenario: planeé recibir salario 6.5M + prima 1M. El salario llegó;
    // la prima nunca se confirmó (sigue en estado Esperado al cierre).
    // Obligaciones y gastos se ejecutaron tal cual.
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26', 'Cerrado')],
      ingresos: [
        ingreso('I1', 'C001', 'Salario', 6_500_000, 'Recibido'),
        ingreso('I2', 'C001', 'Prima',   1_000_000, 'Esperado'),
      ],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 1_750_000)],
      compromisos: [compromiso('CM1', 'O1', 'C001', 1_750_000)],
      pagos: [pago('P1', 'Compromiso', 'CM1', 1_750_000)],
      gastos: [gasto('G1', 'C001', 2_000_000)],
    };
    const cmp = fc.compararProyectadoVsReal(data, 'C001');
    // ingresoProyectado = 6.5M (Recibido) + 1M (Esperado) = 7.5M
    // ingresoReal = 6.5M
    // obligacionProyectada = valorProyectado del compromiso = 1.75M
    // obligacionReal = pagos = 1.75M
    // gastoReal = 2M
    // dlpProyectado = 7.5M - 1.75M - 2M = 3.75M
    // dlpReal       = 6.5M - 1.75M - 2M = 2.75M
    // diferencia    = 2.75M - 3.75M     = -1M (la prima que no llegó)
    expect(cmp.ingresoProyectado).toBe(7_500_000);
    expect(cmp.ingresoReal).toBe(6_500_000);
    expect(cmp.obligacionProyectada).toBe(1_750_000);
    expect(cmp.obligacionReal).toBe(1_750_000);
    expect(cmp.dlpProyectado).toBe(3_750_000);
    expect(cmp.dlpReal).toBe(2_750_000);
    expect(cmp.diferencia).toBe(-1_000_000);
  });

  it('Si pagué MENOS en obligaciones de lo planeado, diferencia es positiva (pero quedo debiendo)', () => {
    // Escenario: arriendo presupuestado 1.75M, llegó tal cual,
    // pero solo pagué 1.5M (250k quedan pendientes).
    // Tengo 250k extra en el bolsillo pero sigo debiendo.
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26', 'Cerrado')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 6_500_000, 'Recibido')],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 1_750_000)],
      compromisos: [compromiso('CM1', 'O1', 'C001', 1_750_000)],
      pagos: [pago('P1', 'Compromiso', 'CM1', 1_500_000)],
      gastos: [gasto('G1', 'C001', 2_000_000)],
    };
    const cmp = fc.compararProyectadoVsReal(data, 'C001');
    // ingresoProyectado=6.5M, ingresoReal=6.5M
    // obligacionProyectada=1.75M, obligacionReal=1.5M
    // gastoReal=2M
    // dlpProyectado = 6.5 - 1.75 - 2 = 2.75M
    // dlpReal       = 6.5 - 1.5 - 2 = 3.0M
    // diferencia    = 3.0 - 2.75 = +0.25M
    expect(cmp.obligacionProyectada).toBe(1_750_000);
    expect(cmp.obligacionReal).toBe(1_500_000);
    expect(cmp.dlpProyectado).toBe(2_750_000);
    expect(cmp.dlpReal).toBe(3_000_000);
    expect(cmp.diferencia).toBe(250_000);
  });
});


describe('Reglas de salud (semáforo)', () => {
  it('VERDE cuando >= 30% libre', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 10_000_000, 'Esperado')],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 6_000_000)], // 40% libre
      compromisos: [], pagos: [], gastos: [],
    };
    expect(fc.porcentajeLibreRestante(data, 'C001')).toBeCloseTo(0.4, 2);
    expect(fc.saludCiclo(data, 'C001')).toBe('VERDE');
  });

  it('AMARILLO cuando entre 10% y 30%', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 10_000_000, 'Esperado')],
      obligaciones: [obligacion('O1', 'X', 'A', 8_000_000)], // 20% libre
      compromisos: [], pagos: [], gastos: [],
    };
    expect(fc.saludCiclo(data, 'C001')).toBe('AMARILLO');
  });

  it('ROJO cuando < 10%', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 10_000_000, 'Esperado')],
      obligaciones: [obligacion('O1', 'X', 'A', 9_500_000)], // 5% libre
      compromisos: [], pagos: [], gastos: [],
    };
    expect(fc.saludCiclo(data, 'C001')).toBe('ROJO');
  });
});


describe('Vigencia y vencidos', () => {
  it('Compromiso vencido cuando hay saldo y fechaVencimiento < hoy', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [], obligaciones: [], pagos: [], gastos: [],
      compromisos: [compromiso('CM1', 'O1', 'C001', 500_000, '2026-06-18')],
    };
    const hoy = d('2026-06-20');
    expect(fc.vigencia(data, data.compromisos[0], hoy)).toBe('Vencido');
  });

  it('Compromiso corriente cuando fechaVencimiento futura', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [], obligaciones: [], pagos: [], gastos: [],
      compromisos: [compromiso('CM1', 'O1', 'C001', 500_000, '2026-06-30')],
    };
    expect(fc.vigencia(data, data.compromisos[0], d('2026-06-20'))).toBe('Corriente');
  });

  it('Compromiso pagado cuando saldo=0', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [], obligaciones: [], gastos: [],
      compromisos: [compromiso('CM1', 'O1', 'C001', 500_000, '2026-06-15')],
      pagos: [pago('P1', 'Compromiso', 'CM1', 500_000)],
    };
    expect(fc.vigencia(data, data.compromisos[0], d('2026-06-20'))).toBe('Pagado');
  });
});


describe('Confiabilidad', () => {
  it('Sin datos -> NO_CONFIABLE', () => {
    const data = fc.emptyData();
    const cfg = fc.defaultConfig();
    const r = fc.confiabilidad(data, cfg);
    expect(r.done).toBe(0);
    expect(r.mensaje).toBe('NO_CONFIABLE');
  });

  it('Con ciclo + ingreso + esenciales -> RAZONABLE', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 6_500_000, 'Esperado')],
      obligaciones: [obligacion('O1', 'Arriendo', 'A', 1_750_000)],
      compromisos: [], pagos: [], gastos: [],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001' });
    const r = fc.confiabilidad(data, cfg);
    expect(r.done).toBe(3);
    expect(r.mensaje).toBe('RAZONABLE');
  });

  it('Con A+B+C -> ALTAMENTE_CONFIABLE', () => {
    const data: fc.DataSnap = {
      ciclos: [ciclo('C001', '2026-06-26')],
      ingresos: [ingreso('I1', 'C001', 'Salario', 6_500_000, 'Esperado')],
      obligaciones: [
        obligacion('O1', 'Arriendo', 'A'),
        obligacion('O2', 'Tarjeta', 'B'),
        obligacion('O3', 'Veterinario', 'C'),
      ],
      compromisos: [], pagos: [], gastos: [],
    };
    const cfg = fc.defaultConfig({ cicloActivoId: 'C001' });
    const r = fc.confiabilidad(data, cfg);
    expect(r.done).toBe(5);
    expect(r.mensaje).toBe('ALTAMENTE_CONFIABLE');
  });
});
