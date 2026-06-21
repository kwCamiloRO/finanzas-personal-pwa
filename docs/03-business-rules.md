# 03 — Business Rules

Reglas de negocio. **Cualquier modificación aquí obliga a actualizar `05-financial-calculations.md`, `08-changelog.md` y `12-project-memory.md`.**

## BR-01 — Unidad de tiempo

La unidad de tiempo NO es el mes calendario; es el **ciclo de nómina**. Un ciclo comienza con `Ciclo.fechaPago` y termina cuando se registra el siguiente ciclo (o cuando se cierra manualmente).

## BR-02 — Apertura de ciclo

- Al registrar un ingreso nuevo cuyo `tipo = Salario`, la app sugiere abrir un nuevo ciclo si la `fechaPago` del último ciclo abierto está más de 10 días atrás.
- El ciclo anterior pasa automáticamente a `Cerrado` cuando se abre uno nuevo.
- `Config.CicloActivo` se actualiza al nuevo `CicloID`.

## BR-03 — Cierre de ciclo

Un ciclo se cierra automáticamente al abrir el siguiente. Manualmente solo se permite cerrar si:

- No tiene compromisos con `vigencia=Vencido` y `estado≠Pagado`.
- O el usuario confirma "cerrar con obligaciones vencidas pendientes".

## BR-04 — Vigencia de compromiso (derivado)

```
si saldoPendiente <= 0           → Pagado
si fechaVencimiento < hoy        → Vencido
en otro caso                     → Corriente
```

Si `fechaVencimiento` no está definida, se considera `Corriente`.

## BR-05 — Estado de compromiso (derivado)

```
si saldoPendiente <= 0           → Pagado
si valorPagado > 0               → Parcial
en otro caso                     → Pendiente
```

## BR-06 — Saldo pendiente

```
Compromiso.saldoPendiente = valorReal - sum(Pago.monto WHERE compromisoId = this.id)
Deuda.saldoPendiente      = valorOriginal - sum(Pago.monto WHERE deudaId = this.id)
```

Si el resultado fuera negativo (sobre-pago), se trunca a 0 y el sistema emite un warning en la UI.

## BR-07 — Estado financiero (semáforo)

```
si DineroLibreReal >= UmbralVerde            → VERDE
si DineroLibreReal >= UmbralAmarillo         → AMARILLO
en otro caso                                  → ROJO
```

## BR-08 — Necesidad de Financiamiento

```
NF = MAX(0, -DineroLibreReal)
```

Es decir, si DLR es negativo, NF es la magnitud del faltante. Si DLR ≥ 0, NF = 0.

## BR-09 — Estado de Necesidad de Financiamiento

```
si NF <= UmbralNFModerada                    → SIN_NECESIDAD
si NF <= UmbralNFCritica                     → CUBIERTA_FONDO
en otro caso                                  → REQUIERE_CREDITO
```

## BR-10 — Dinero Libre Real (fórmula central)

```
DLR = IngresosRecibidos
    - FondoOperativo
    - ObligacionesCriticas (prioridad A pendientes)
    - ObligacionesFinancieras (prioridad B pendientes)
    - GastosCiclo
```

**Nota crítica:** las obligaciones de prioridad C y D NO se restan en DLR. Son variables/personales y la app asume que se pueden ajustar a la realidad. Sí se muestran como informativas en el dashboard.

## BR-11 — Capacidad de Endeudamiento

```
CapacidadEndeudamiento = MAX(0, DineroLibreReal - UmbralVerde)
```

Lo que sobra después de mantenerse en zona VERDE. Es la respuesta a "¿puedo asumir una nueva obligación?".

## BR-12 — Dependencia de Crédito

```
DependenciaCredito = ObligacionesFinancieras / IngresosRecibidos    (si IngresosRecibidos > 0)
```

Expresado como porcentaje. Umbrales informativos:

- `< 20%` → Saludable
- `20-35%` → Moderada
- `35-50%` → Alta
- `> 50%` → Crítica

## BR-13 — Cobertura

```
Cobertura = IngresosRecibidos / (ObligacionesCriticas + ObligacionesFinancieras + GastosCiclo + FondoOperativo)
```

Si > 1: los ingresos cubren todo. Si < 1: no alcanza, hay déficit.

## BR-14 — Velocidad de gasto

```
VelocidadGasto = GastosCiclo / DiasTranscurridos
```

Donde `DiasTranscurridos` = días entre `fechaPago` del ciclo activo y hoy (mínimo 1).

## BR-15 — Gasto máximo diario recomendado

```
DiasHastaProximoPago = DuracionCicloEstimada - DiasTranscurridos
GastoMaximoDiario = DineroLibreReal / DiasHastaProximoPago    (si DiasHastaProximoPago > 0)
```

Donde `DuracionCicloEstimada` es la media de duraciones de los últimos 3 ciclos cerrados (default 15 días si no hay historial).

## BR-16 — Proyección fin de ciclo

```
ProyeccionFinCiclo = DineroLibreReal - (VelocidadGasto * DiasRestantesCiclo)
```

Esperado al cerrar el ciclo si el patrón de gasto se mantiene. Útil para alertas tempranas.

## BR-17 — Tendencia

Comparar `DLR` (o cualquier indicador) entre el ciclo actual y los 3 últimos ciclos cerrados:

```
si DLR_actual > avg(DLR_últimos3) * 1.05     → MEJORANDO
si DLR_actual < avg(DLR_últimos3) * 0.95     → EMPEORANDO
en otro caso                                  → ESTABLE
```

Umbral del 5% para evitar volatilidad espuria.

## BR-18 — Score de riesgo (0-100, mayor = peor)

Suma ponderada de factores:

| Factor | Peso |
|---|---|
| `NF > 0` | 30 |
| Hay obligaciones vencidas | 25 |
| `DependenciaCredito > 35%` | 20 |
| `Cobertura < 1` | 15 |
| `Tendencia = EMPEORANDO` | 10 |

Resultado:

- `0-25` → BAJO
- `26-50` → MEDIO
- `51-75` → ALTO
- `76-100` → CRÍTICO

## BR-19 — Pago: validación pre-guardado

Antes de aceptar un `Pago`:

1. `monto > 0`.
2. Si `fuente=Compromiso`: el compromiso debe existir y el monto no exceder `saldoPendiente` actual (+10% de tolerancia para sobrepagos justificados).
3. Si `fuente=Deuda`: idem con la deuda.
4. La `fecha` no puede ser futura (> hoy + 1 día).

## BR-20 — Plan: EsEjecutable de un item

Un item de plan es **ejecutable** si:

1. `pagoPropuesto > 0`
2. `pagoPropuesto ≤ saldoActual`
3. `acumuladoHastaItem ≤ DineroLibreReal` (del ciclo del plan)

Donde `acumuladoHastaItem = sum(pagoPropuesto donde ordenPago ≤ thisItem.ordenPago)`.

## BR-21 — Recomendaciones automáticas

`RecommendationService` genera sugerencias priorizadas por impacto:

1. Si hay **vencidas**: "Cubre primero {nombre} ({monto}) — vence hace {días} días". Impacto: cuántos puntos baja el score de riesgo.
2. Si `VelocidadGasto > GastoMaximoDiario`: "Estás gastando {x}/día. Tu límite es {y}/día. Reduce ~{z}/día para llegar bien al fin de ciclo".
3. Si `DLR < UmbralAmarillo` y hay ingresos `Esperado`: "Confirma {tipo} de {monto} — sin esto te quedas en ROJO".
4. Si `DependenciaCredito > 35%`: "Tu dependencia de crédito está en {x}%. Saldar {compromisoSugerido} la baja a {y}%".
5. Si `Tendencia = EMPEORANDO`: "Tu DLR cayó {x}% en los últimos 3 ciclos. Revisa categorías que crecieron: {top3}".

## BR-22 — Inactividad

Si el usuario no abre la app por más de 7 días: al volver, el dashboard incluye un banner con resumen ("Mientras no estuviste: vencieron 2 compromisos, tu DLR bajó X").

## BR-23 — Modo Onboarding

Hasta que `Config.OnboardingCompletado = true`, todas las rutas redirigen a `/onboarding`. No se muestran las features.

## BR-24 — Modo simple vs completo

`Config.Modo`:

- `SIMPLE`: solo Gastos + Ingresos + Dashboard. Obligaciones/Compromisos/Pagos/Planes ocultos en la nav.
- `COMPLETO`: todas las features visibles.

El usuario puede cambiar de modo desde Configuración. No se borran datos al cambiar.

## BR-25 — Backup automático en memoria

Al cerrar la app (visibilitychange = hidden), Dexie persiste un snapshot en `localStorage` con clave `lastBackupAutoJson`, sin valor que requiera permisos. Solo lectura/escritura local; nada de red.

## BR-26 — PIN

- Si `Config.PinHabilitado = true`, al abrir la app pide PIN.
- Tres intentos fallidos → bloqueo de 30 segundos antes del siguiente intento.
- El PIN se almacena como `PBKDF2(pin, salt, 100000 iters)` en `Config.PinHash`.
- Recovery: solo importando un backup JSON con un nuevo PIN.
