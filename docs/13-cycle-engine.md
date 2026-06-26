# 13 — Cycle Engine v0.3.0

Documento de referencia del nuevo motor de ciclos. Léelo junto con `03-business-rules.md` y `05-financial-calculations.md`.

## Visión

Un ciclo ya no es un punto en el tiempo (solo `fechaPago`). Ahora es un **rango con metadatos**:

```
Ciclo
├── fechaInicio          ← fechaPago del ciclo anterior (o inferida)
├── fechaPago            ← día del depósito (ajustado por calendario)
├── fechaFin             ← un día antes del siguiente pago
├── cicloAnteriorId      ← link al anterior
├── cicloSiguienteId     ← link al siguiente
├── creadoAutomaticamente
└── generadoDesdeConfiguracion
```

Todos los campos nuevos son **opcionales** y se rellenan automáticamente vía la migración Dexie v2 (sin tocar datos existentes).

## Componentes del motor

| Pieza | Archivo | Responsabilidad |
|---|---|---|
| `PaymentCalendarService` | `core/services/payment-calendar.service.ts` | Calcula fechas reales de pago aplicando festivos y reglas (adelantar/atrasar/mantener). |
| `ProjectionService.crearSiguienteCicloAutomatico` | `core/services/projection.service.ts` | Crea el próximo ciclo y clona obligaciones recurrentes/cuotas. |
| `ObligationLifecycleService` | `core/services/obligation-lifecycle.service.ts` | Finalizar / pausar / reactivar obligaciones, distribuir en cuotas, checklist rápido. |
| `CycleService.cicloViendo` | `core/services/cycle.service.ts` | Permite al dashboard ver cualquier ciclo (actual / próximo / histórico) sin cambiar de ruta. |
| `financial-calculations.ts` (nuevas funciones) | `core/services/financial-calculations.ts` | `fechaInicioCiclo`, `fechaFinCiclo`, `diasRestantesCiclo`, `gastoMaximoDiarioV2`, `esDiaDePago`, `comparativoExtendido`. |

## Reglas de cálculo nuevas

### Gasto máximo diario (corregido v0.3.0)

```
base = (modo === EJECUCION) ? dineroDisponibleReal : dineroLibreProyectado
gastoMaximoDiario = base / diasRestantesCiclo    si diasRestantesCiclo > 0
                  | base                          en otro caso

diasRestantesCiclo = max(0, fechaFinCiclo - hoy)
fechaFinCiclo      = fechaPago(siguiente ciclo) - 1   si existe
                   | fechaPago + duracionEstimada - 1  en otro caso
```

### Día de pago (signal `esDiaDePago`)

`true` cuando `startOfDay(hoy) === startOfDay(ciclo.fechaPago)`. Activa la card "Hoy es día de pago" en el dashboard.

### Modo EJECUCIÓN

Sin cambios: sigue siendo `ingresosRecibidos > 0`. La intersección con `fechaPagoAlcanzada` (signal `pagoEsperadoPendiente`) sigue mostrando el banner de aviso.

### Calendario de pagos

Configuración en `CONFIG`:

| Parámetro | Default | Función |
|---|---|---|
| `DiaPagoHabitual` | `28` | Día del mes en que normalmente cae el pago. |
| `ReglaFinDeSemana` | `adelantar` | `adelantar` / `atrasar` / `mantener` cuando cae sáb/dom/festivo. |
| `Pais` | `CO` | Código de país para calendario de festivos. Hoy: solo CO poblado. |

Festivos Colombia 2024–2030 incluidos como tablas estáticas (fijos + lunes festivos). Para nuevos países: implementar `HolidayProvider` adicional dentro del mismo archivo.

### Creación automática del siguiente ciclo

`ProjectionService.crearSiguienteCicloAutomatico()`:

1. Carga `PaymentCalendarConfig` desde `CONFIG`.
2. Toma el ciclo activo como referencia (o el último por fecha).
3. Calcula `fechaPagoCruda` con `proximaFechaCrudaSegunFrecuencia` y la **ajusta** según regla.
4. Calcula `fechaInicio = fechaPago(ref)` y `fechaFin = fechaPago(nuevo) − 1`.
5. Clona compromisos para **solo** obligaciones que cumplen:
   - `recurrente=true`
   - `activa=true`
   - `estadoFinalizacion !== 'Finalizada' && !== 'Pausada'`
   - `valorEsperadoTipico > 0`
6. Procesa obligaciones con **cuotas restantes** (distribución flexible), decrementa, y al llegar a 0 marca `estadoFinalizacion='Finalizada'`.
7. Enlaza `cicloAnteriorId`/`cicloSiguienteId` en ambos.
8. **No activa** el nuevo ciclo automáticamente; el usuario lo activa cuando llega su día de pago.

### Distribución de obligaciones flexibles

`ObligationLifecycleService.distribuirEnCuotas(obligacionId, montoTotal, cuotas)`:

- Sobrescribe `valorEsperadoTipico = monto/cuotas`.
- Setea `cuotasTotales` y `cuotasRestantes = cuotas`.
- Marca la obligación como **no recurrente** (no se replica perpetuamente).
- En cada `crearSiguienteCicloAutomatico` se descuenta una cuota.
- Cuando `cuotasRestantes === 0`, la obligación queda `estadoFinalizacion='Finalizada'`.

### Checklist de ejecución

Compromiso ahora tiene `estadoRapido: 'Pendiente' | 'Pagada' | 'Parcial' | 'Omitida'`.

`ObligationLifecycleService.marcarRapido(compromisoId, estado)`:

- `Pagada` → marca estado **y** registra un `Pago` por el saldo pendiente actual.
- `Parcial` → solo marca estado (el usuario abre el form para indicar el monto exacto).
- `Omitida` → solo marca estado, el saldo se mantiene (informa "no la pagaré este ciclo").
- `Pendiente` → resetea al estado neutro.

### Finalización de obligaciones

`ObligationLifecycleService.finalizar(id, motivo)`:

- Setea `activa=false`, `estadoFinalizacion='Finalizada'`, `motivoFinalizacion`, `fechaFin`.
- Los ciclos anteriores **no se modifican** (sus compromisos ya están en BD).
- A partir de su finalización, no aparece en futuros `crearSiguienteCicloAutomatico`.

### Selector de ciclo (dashboard)

`CycleService.setCicloViendo(id)` cambia el ciclo que el dashboard renderiza sin cambiar de ruta. Todas las métricas del `FinancialAnalysisService` se recalculan automáticamente para el ciclo elegido. La signal `viendoCicloActivo` permite mostrar/ocultar acciones (ej. "Preparar siguiente ciclo" solo aparece en el ciclo activo).

### Comparativa proyectado vs real (extendida)

`projection.compararCicloExtendido(snap, cicloId)` devuelve, además de la comparativa básica:

- `diffIngreso`, `diffObligacion`
- `porcentajePrecision` (0–1, dónde 1 = clavado)
- `causaPrincipal` (`'ingreso' | 'obligacion' | 'gasto' | 'ninguna'`)

Renderizado en la vista `/cycles/:id/comparativa`.

## Migración Dexie v1 → v2

- **Aditiva**: solo agrega campos opcionales e índices nuevos.
- Backfill conservador:
  - `Ciclo`: inferir `fechaInicio` desde el anterior, `fechaFin` desde el siguiente − 1, enlazar `cicloAnteriorId/cicloSiguienteId`.
  - `Obligacion`: si tiene `activa=false` y no tiene `estadoFinalizacion`, marcar `'Finalizada'`; si `activa=true`, marcar `'Activa'`.
  - `Config`: sembrar `DiaPagoHabitual=28`, `ReglaFinDeSemana=adelantar`, `Pais=CO` solo si no existen.
- **No** borra, **no** sobrescribe.

## Reglas de oro para el siguiente cambio

1. Toda nueva regla de negocio se documenta aquí + en `03` + en `05`.
2. Toda migración Dexie debe ser aditiva (`version(N+1)` con `.upgrade()`).
3. Lógica financiera solo en `financial-calculations.ts` (puras) o servicios `core/services/*` (signals/Dexie). Nunca en componentes.
4. Tests Jasmine para cada nueva fórmula con un valor concreto esperado.
5. El selector de ciclo es la fuente única de verdad sobre "qué ciclo se está viendo"; nunca pasarlo por route params.
