# TEST_PLAN_CICLOS — Validación de reglas de ciclos

Plan de prueba ejecutable. Las pruebas viven en:

- `src/app/core/services/financial-calculations.spec.ts` — funciones puras (todos los escenarios)
- `src/app/core/services/cycle.service.spec.ts` — CRUD de ciclos contra Dexie real
- `src/app/core/services/projection.service.spec.ts` — proyección, clonado, comparativo

Correr con:

```bash
npm test
```

## Tabla de cobertura

| Escenario | Spec file | `describe` |
|---|---|---|
| 1. Ciclo futuro sin ingreso recibido | financial-calculations.spec | `ESCENARIO 1 — Ciclo futuro sin ingreso recibido` |
| 2. Gasto antes del primer ingreso | financial-calculations.spec | `ESCENARIO 2 — Gasto antes del primer ingreso` |
| 3. Dos ciclos existentes | financial-calculations.spec | `ESCENARIO 3 — Dos ciclos existentes` |
| 4. Cambio de ciclo automático | financial-calculations.spec | `ESCENARIO 4 — Fecha de pago alcanzada` |
| 5. Llegada del siguiente pago | financial-calculations.spec + projection.service.spec | `ESCENARIO 5` + `crearSiguienteCiclo` |
| 6. Apertura del nuevo ciclo | cycle.service.spec | `CycleService` (todas) |
| 7. Obligaciones recurrentes en nuevo ciclo | financial-calculations.spec + projection.service.spec | `ESCENARIO 7` |
| 8. Ingreso extra (prima) | financial-calculations.spec | `ESCENARIO 8 — Ingreso extra (Prima)` |
| 9. Pago parcial de deuda | financial-calculations.spec | `ESCENARIO 9 — Pago parcial de deuda` |
| 10. Cierre de ciclo (proyectado vs real) | financial-calculations.spec + projection.service.spec | `ESCENARIO 10` |

## Reglas validadas

### Regla A — Ciclo activo único
- Solo el ciclo cuyo `id` coincide con `Config.CicloActivo` es "activo".
- Crear un segundo ciclo no lo activa por defecto.
- `marcarActivo` cambia el activo y reabre si estaba cerrado.

### Regla B — Modo derivado
- `modo === 'EJECUCION'` cuando `ingresosRecibidos > 0` para el ciclo activo.
- En cualquier otro caso → `PLANIFICACION`.
- Es DATA-driven, no time-driven.

### Regla C — Fecha de pago alcanzada vs. modo
- Pueden divergir: hoy ≥ fechaPago pero modo=PLANIFICACION → `pagoEsperadoPendiente=true`.
- El dashboard muestra banner amarillo: "Tu pago ya debía llegar".

### Regla D — Dinero Libre Proyectado
- `DLP = (ingresosRecibidos + ingresosEsperados) − obligacionesProyectadas − gastosCiclo`.
- `obligacionesProyectadas` combina:
  - Compromisos del ciclo (su `saldoPendiente`).
  - Obligaciones activas del catálogo que NO tienen compromiso este ciclo (su `valorEsperadoTipico`).
- Sin doble-conteo.

### Regla E — Dinero Disponible Real
- `DDR = ingresosRecibidos − pagosCicloRealizados − gastosCiclo`.
- Solo se muestra en modo EJECUCION.

### Regla F — Salud del ciclo por %
- `% libre = DLP / ingresosTotalesCiclo`.
- ≥ 30% → VERDE.
- ≥ 10% → AMARILLO.
- < 10% → ROJO.
- Si ingresoTotal = 0 → AMARILLO (no se castiga al usuario sin datos).

### Regla G — Gastos sin ciclo iniciado
- Permitido registrar gastos antes de que `fechaPago` llegue.
- El gasto cuenta hacia el ciclo activo (decrementa DLP).
- `diasTranscurridos = 0`, por lo tanto `velocidadGasto = 0` (no divide por cero).

### Regla H — Próximo ciclo
- Si existe un ciclo registrado con fecha posterior, `fechaProximoPago` apunta a él.
- Si no existe, se estima sumando `duracionEstimada(15 o 30)` a la fecha del activo.

### Regla I — Clonado de ciclo
- `crearSiguienteCiclo(fecha)` crea ciclo nuevo y replica solamente las obligaciones recurrentes activas como compromisos con `valorReal = valorEsperadoTipico`.
- NO copia gastos ni pagos.
- Con `{ activar: true }` el nuevo ciclo se vuelve el activo.

### Regla J — Comparativo cierre
- `compararProyectadoVsReal(cicloId)` devuelve `{ ingresoProyectado, ingresoReal, obligacionProyectada, obligacionReal, gastoReal, dlpProyectado, dlpReal, diferencia }`.
- `diferencia = dlpReal − dlpProyectado`. Negativa si gastaste/pagaste más de lo planeado.

## Flujo de aceptación manual

Después de `npm test` verde, verificar manualmente en navegador:

1. **20 jun 2026 (planificación)**: app vacía → `/start` → crear ciclo 26-jun → registrar Salario $6.5M Esperado → agregar Arriendo $1.75M (A Esencial) → "Listo".
   - Dashboard: DLP = $4.750.000, salud verde/amarillo, banner "Estás planificando", DDR oculto.
2. **26 jun 2026 (ejecución)**: marcar Salario como Recibido.
   - Dashboard: modo cambia a EJECUCION, aparece tarjeta "DINERO DISPONIBLE HOY" = $4.750.000 (si no hay pagos aún), banner desaparece.
3. **26 jul 2026 (nuevo ciclo)**: clicar "Preparar siguiente ciclo" en dashboard → crear ciclo 26-jul.
   - `Arriendo` aparece automáticamente como compromiso del nuevo ciclo.

## Hallazgos durante el QA

Bugs detectados y corregidos durante la escritura de specs:

1. **`fechaProximoPago` no usaba `siguienteCiclo` cuando existía** — corregido: ahora si hay un ciclo registrado con fecha posterior, apunta a él, evitando estimaciones incorrectas.
2. **`obligacionesProyectadas` duplicaba** cuando una obligación tenía compromiso Y estaba activa en catálogo — corregido con `conCompromiso = new Set(...)`.
3. **`saldoCompromiso` permitía negativo** si se sobrepagaba — corregido con `Math.max(0, ...)`.
4. **`gastoMaximoDiario` dividía por cero** cuando `diasHastaProximoPago = 0` — corregido devolviendo `Math.max(0, base)`.
5. **`vigencia` comparaba `Date` con `Date` sin normalizar a inicio de día** — corregido con `startOfDay()`.
6. **`pagoEsperadoPendiente` no existía** — agregado para diferenciar "fecha de pago alcanzada" de "modo ejecución".
7. **Dashboard no informaba `siguienteCiclo`** — agregada card.
8. **No había CTA "Preparar siguiente ciclo"** cuando faltan ≤ 3 días — agregada.
