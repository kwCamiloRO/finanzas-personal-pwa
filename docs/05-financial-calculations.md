# 05 — Financial Calculations

Cada fórmula está identificada por un código (`FC-NN`) referenciado desde `03-business-rules.md` y desde los tests.

## Convenciones

- `Ca` = ciclo activo (`Config.CicloActivo`).
- `Hoy` = `ClockService.today()` — inyectable, mockeable en tests.
- Todos los montos en COP, enteros.
- Sumas vacías → 0.

## FC-01 — IngresosRecibidos

```
IngresosRecibidos(Ca) = Σ Ingreso.valor
                      donde Ingreso.cicloId = Ca
                      y     Ingreso.estado = 'Recibido'
```

## FC-02 — IngresosEsperados

```
IngresosEsperados(Ca) = Σ Ingreso.valor
                      donde Ingreso.cicloId = Ca
                      y     Ingreso.estado ∈ {'Esperado', 'Confirmado'}
```

## FC-03 — ValorPagado de un compromiso

```
ValorPagado(c) = Σ Pago.monto
              donde Pago.fuente = 'Compromiso'
              y     Pago.compromisoId = c.id
```

## FC-04 — ValorPagado de una deuda

```
ValorPagado(d) = Σ Pago.monto
              donde Pago.fuente = 'Deuda'
              y     Pago.deudaId = d.id
```

## FC-05 — SaldoPendiente

```
SaldoPendiente(compromiso) = MAX(0, compromiso.valorReal - ValorPagado(compromiso))
SaldoPendiente(deuda)      = MAX(0, deuda.valorOriginal  - ValorPagado(deuda))
```

## FC-06 — Vigencia

```
Vigencia(c) =
  | 'Pagado'    si SaldoPendiente(c) <= 0
  | 'Vencido'   si SaldoPendiente(c) > 0 y c.fechaVencimiento < Hoy
  | 'Corriente' en otro caso
```

## FC-07 — Obligaciones pendientes por prioridad

```
ObligacionesPorPrioridad(Ca, P) = Σ SaldoPendiente(c)
                                  donde c.periodo = Ca
                                  y     Obligacion(c.obligacionId).prioridad = P
                                  y     SaldoPendiente(c) > 0

ObligacionesCriticas(Ca)     = ObligacionesPorPrioridad(Ca, 'A')
ObligacionesFinancieras(Ca)  = ObligacionesPorPrioridad(Ca, 'B')
ObligacionesPersonales(Ca)   = ObligacionesPorPrioridad(Ca, 'C') + ObligacionesPorPrioridad(Ca, 'D')
```

## FC-08 — Obligaciones por vigencia

```
ObligacionesVencidas(Ca)   = Σ SaldoPendiente(c) donde c.periodo = Ca y Vigencia(c) = 'Vencido'
ObligacionesCorrientes(Ca) = Σ SaldoPendiente(c) donde c.periodo = Ca y Vigencia(c) = 'Corriente'
```

## FC-09 — GastosCiclo

```
GastosCiclo(Ca) = Σ Gasto.valor donde Gasto.cicloId = Ca
```

## FC-10 — Dinero Libre Real

```
DLR(Ca) = IngresosRecibidos(Ca)
        - FondoOperativo
        - ObligacionesCriticas(Ca)
        - ObligacionesFinancieras(Ca)
        - GastosCiclo(Ca)
```

> **Nota:** las obligaciones C/D NO se restan. Ver `03-business-rules.md` BR-10.

## FC-11 — Estado Financiero

```
EstadoFinanciero(Ca) =
  | 'VERDE'    si DLR(Ca) >= UmbralVerde
  | 'AMARILLO' si DLR(Ca) >= UmbralAmarillo
  | 'ROJO'     en otro caso
```

## FC-12 — Necesidad de Financiamiento

```
NF(Ca) = MAX(0, -DLR(Ca))
```

## FC-13 — Estado NF

```
EstadoNF(Ca) =
  | 'SIN_NECESIDAD'    si NF(Ca) <= UmbralNFModerada
  | 'CUBIERTA_FONDO'   si NF(Ca) <= UmbralNFCritica
  | 'REQUIERE_CREDITO' en otro caso
```

## FC-14 — Cobertura

```
Denominador = ObligacionesCriticas(Ca) + ObligacionesFinancieras(Ca) + GastosCiclo(Ca) + FondoOperativo
Cobertura(Ca) = IngresosRecibidos(Ca) / Denominador    si Denominador > 0
              | 0                                       en otro caso
```

## FC-15 — Dependencia de Crédito

```
DependenciaCredito(Ca) = ObligacionesFinancieras(Ca) / IngresosRecibidos(Ca)   si IngresosRecibidos > 0
                       | 0                                                       en otro caso
```

Salida en `[0, 1+]`. Formatear como porcentaje en UI.

## FC-16 — Capacidad de Endeudamiento

```
CapacidadEndeudamiento(Ca) = MAX(0, DLR(Ca) - UmbralVerde)
```

## FC-17 — Días transcurridos del ciclo

```
DiasTranscurridos(Ca) = MAX(1, DAYS_BETWEEN(Hoy, Ciclo(Ca).fechaPago))
```

## FC-18 — Duración estimada del ciclo

Promedio simple de los últimos 3 ciclos cerrados. Si hay menos, usar `FrecuenciaPago`:

```
si hay ≥ 3 ciclos cerrados:
   DuracionEstimada = avg(diff(Ciclo[i].fechaPago, Ciclo[i+1].fechaPago) para últimos 3 pares)
en otro caso:
   DuracionEstimada =
     | 15  si FrecuenciaPago = 'QUINCENAL'
     | 30  si FrecuenciaPago = 'MENSUAL'
     | 15  default
```

## FC-19 — Días hasta próximo pago

```
DiasHastaProximoPago(Ca) = MAX(0, DuracionEstimada(Ca) - DiasTranscurridos(Ca))
```

## FC-20 — Velocidad de gasto

```
VelocidadGasto(Ca) = GastosCiclo(Ca) / DiasTranscurridos(Ca)
```

## FC-21 — Gasto máximo diario recomendado

```
GastoMaximoDiario(Ca) = DLR(Ca) / DiasHastaProximoPago(Ca)   si DiasHastaProximoPago > 0
                      | DLR(Ca)                              en otro caso
```

## FC-22 — Proyección fin de ciclo

```
ProyeccionFinCiclo(Ca) = DLR(Ca) - VelocidadGasto(Ca) * DiasHastaProximoPago(Ca)
```

## FC-23 — Tendencia

Calcula `DLR` (al cierre) para los últimos 3 ciclos cerrados; promedio = `μ`. Comparar con DLR del ciclo activo:

```
Tendencia(Ca) =
  | 'MEJORANDO'  si DLR(Ca) > μ * 1.05
  | 'EMPEORANDO' si DLR(Ca) < μ * 0.95
  | 'ESTABLE'    en otro caso
```

## FC-24 — Score de riesgo

```
score = 0
si NF(Ca) > 0:                       score += 30
si ObligacionesVencidas(Ca) > 0:     score += 25
si DependenciaCredito(Ca) > 0.35:    score += 20
si Cobertura(Ca) < 1:                score += 15
si Tendencia(Ca) = 'EMPEORANDO':     score += 10
ScoreRiesgo(Ca) = MIN(100, score)
```

```
NivelRiesgo =
  | 'BAJO'     si score <= 25
  | 'MEDIO'    si score <= 50
  | 'ALTO'     si score <= 75
  | 'CRITICO'  en otro caso
```

## FC-25 — Item de plan: AcumuladoPagado

```
AcumuladoPagado(item, plan) = Σ otro.pagoPropuesto
                              donde otro.planId = plan.id
                              y     otro.ordenPago <= item.ordenPago
```

## FC-26 — Item de plan: EsEjecutable

```
EsEjecutable(item) =
  | true   si item.pagoPropuesto > 0
           y item.pagoPropuesto <= SaldoActual(item)
           y AcumuladoPagado(item) <= DLR(Ca del plan)
  | false  en otro caso
```

## FC-27 — DineroLibreProyectado de un escenario

```
DLR_Escenario(e, Ca) = e.ingresoEstimado
                      - FondoOperativo
                      - ObligacionesCriticas(Ca)
                      - ObligacionesFinancieras(Ca)
                      - GastosCiclo(Ca)
```

## FC-28 — Proyección próximo ciclo

Asume:
- Mismo ingreso base que el ciclo activo (o asunciones del usuario).
- Misma estructura de obligaciones recurrentes.
- Velocidad de gasto = promedio de los 3 últimos ciclos cerrados.

```
IngresoProyectado = IngresoBase + (asunciones.ingresosExtra ?? 0)
ObligacionesProyectadas = Σ (Obligacion activa.valorEsperadoTipico ?? últimoCompromiso.valorReal)
GastosProyectados = avg(GastosCiclo de últimos 3 ciclos cerrados) * (1 + asunciones.ajusteGastos)
DLRProyectado = IngresoProyectado - FondoOperativo - ObligacionesProyectadas - GastosProyectados
```

## FC-29 — Proyección a N ciclos

Aplicar FC-28 iterativamente. Cada ciclo `k+1` toma el `DLRProyectado` del ciclo `k` como remanente potencial (acumulado, sin gastarlo, mostrando solo el flujo).

## FC-30 — Impacto de un cambio (simulador)

Para un cambio C (ej. "agregar pago de $500.000 a Pablo"):

```
DLR_antes = DLR(Ca)
DLR_despues = DLR(Ca) considerando el cambio
ImpactoDLR = DLR_despues - DLR_antes

EstadoFinanciero_antes  = EstadoFinanciero(Ca)
EstadoFinanciero_despues = EstadoFinanciero(Ca con cambio)
ImpactoEstado = (antes, despues)

ScoreRiesgo_antes / despues / delta
```

## Tests obligatorios

Cada fórmula `FC-NN` debe tener un test unitario que:
1. Carga datos del Excel V2 (mediante un seed equivalente).
2. Calcula con el servicio Angular.
3. Verifica que el resultado coincide con el valor del Excel.

Valores de regresión esperados (Ciclo C002 del Excel V2):

| FC | Resultado esperado |
|---|---|
| FC-01 IngresosRecibidos | 6.776.200 |
| FC-02 IngresosEsperados | 6.388.100 |
| FC-07 Críticas | 297.000 |
| FC-07 Financieras | 1.020.000 |
| FC-08 Vencidas | 695.000 |
| FC-08 Corrientes | 942.000 |
| FC-09 GastosCiclo | 715.000 |
| FC-10 DLR | 3.244.200 |
| FC-11 EstadoFinanciero | VERDE |
| FC-12 NF | 0 |
| FC-13 EstadoNF | SIN_NECESIDAD |
| FC-14 Cobertura | ~1.92 |
| FC-15 DependenciaCredito | ~0.15 (15%) |
| FC-16 CapacidadEndeudamiento | 1.744.200 |
