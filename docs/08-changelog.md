# 08 — Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [Unreleased]

## [0.3.1-ui-engine] — 2026-06-20

### Added — UI conectada al motor de ciclos
- **Settings** ahora expone una sección "Calendario de pago": `DiaPagoHabitual`, `Pais` (CO / OTRO), `ReglaFinDeSemana` (adelantar / atrasar / mantener).
- **Cycle form** acepta y muestra `fechaInicio` y `fechaFin` como campos opcionales con hints de inferencia.
- **Cycles list** rediseñada como historial financiero: cada tarjeta muestra mes, estado, tipo (auto/manual), fechas de inicio/fin, duración, ingresos, obligaciones, dinero libre y semáforo. Card prominente "Preparar siguiente ciclo" en la parte superior — siempre visible.
- **Dashboard** con barra de acciones permanente: Preparar siguiente / Checklist / Comparativa / Cerrar ciclo.
- **Obligation list** con menú extendido: Finalizar (motivo), Pausar, Reactivar, Distribuir en cuotas.

### Changed — Arquitectura
- **`ProjectionService.crearSiguienteCicloAutomatico` ahora es idempotente**: si ya existe un ciclo cuyo `fechaPago > cicloRef.fechaPago`, devuelve ese sin crear duplicados. Doble click o re-llamada no rompe nada.
- **`CyclesListComponent`** consume directamente `fc.*` (funciones puras) para calcular métricas por cada ciclo, no solo el activo. La arquitectura "todo en signals via cicloViendoId" se conserva para el dashboard; la lista usa snapshot puntual.

## [0.3.0-cycle-engine] — 2026-06-20

### Added — Motor de ciclos
- **Dexie v2** (aditiva): `Ciclo` gana `fechaInicio`, `fechaFin`, `cicloAnteriorId`, `cicloSiguienteId`, `creadoAutomaticamente`, `generadoDesdeConfiguracion`. `Obligacion` gana `fechaFin`, `motivoFinalizacion`, `estadoFinalizacion`, `cuotasTotales`, `cuotasRestantes`. `Compromiso` gana `estadoRapido`. Migración con backfill conservador y siembra de `DiaPagoHabitual`, `ReglaFinDeSemana`, `Pais`.
- **`PaymentCalendarService`** nuevo: festivos Colombia 2024–2030 + reglas `adelantar | atrasar | mantener` cuando una fecha cae fin de semana o festivo. Pluggable por país (`HolidayProvider`).
- **`ProjectionService.crearSiguienteCicloAutomatico`** que clona obligaciones recurrentes activas, procesa cuotas flexibles, vincula ciclos y respeta `estadoFinalizacion`.
- **`ObligationLifecycleService`** nuevo: `finalizar`, `pausar`, `reactivar`, `distribuirEnCuotas`, `marcarRapido` (checklist) y `confirmarRecurrentesDelCiclo`.
- **Selector de ciclo** en el dashboard (`CycleService.cicloViendo`): cambia entre ciclo actual / próximo / históricos sin cambiar de ruta.
- **Card "Hoy es día de pago"** con botones "Sí, lo recibí" (marca todos los Esperado→Recibido) y "Aún no" (sigue planificando).
- **Card "Preparar siguiente ciclo"** conectada a `crearSiguienteCicloAutomatico` cuando faltan ≤ 3 días.
- **Vista checklist** (`/checklist`): cambia `Pendiente/Pagada/Parcial/Omitida` con un clic; "Pagada" registra automáticamente un pago por el saldo restante.
- **Vista comparativa** (`/cycles/:id/comparativa`): proyectado vs real con porcentaje de precisión y causa principal.

### Changed — Fórmulas
- **`gastoMaximoDiario` (FC-21 v2)**: ahora usa `diasRestantesCiclo = fechaFin − hoy` en vez de `diasHastaProximoPago`. Más consistente en planificación y ejecución.
- **`FinancialAnalysisService`**: todas las métricas viajan vía `cicloViendoId` (con fallback a `cicloActivoId`). El dashboard puede mostrar cualquier ciclo del historial reusando todas las computeds.
- **`compararCicloExtendido`**: incluye precisión y causa principal.

### Business Rules tocadas
- **BR-Ciclo (nueva)**: ciclo es un rango (`fechaInicio`, `fechaPago`, `fechaFin`) con vínculos `anterior/siguiente`. Fechas inferidas si no existen.
- **BR-Calendario (nueva)**: día de pago se ajusta según regla configurable + festivos del país.
- **BR-Recurrentes**: solo se clonan en `crearSiguienteCicloAutomatico` si `estadoFinalizacion === 'Activa'` (o ausente).
- **BR-Cuotas**: obligaciones con `cuotasRestantes > 0` se generan una vez por ciclo automáticamente hasta agotarse, y se finalizan solas al llegar a 0.
- **BR-Checklist**: `estadoRapido` no reemplaza `Pago`. `Pagada` rápido emite un `Pago` por el saldo; `Omitida` no.

### Migration notes
- Dexie v1 → v2 ejecuta `.upgrade()` automáticamente la primera vez que el usuario abre la app nueva. Datos existentes intactos.

## [0.2.1-qa] — 2026-06-20

### Added (QA + correcciones de reglas)
- **`financial-calculations.ts`** — todas las fórmulas extraídas a funciones puras, sin dependencia de Angular ni Dexie, testables sin TestBed.
- **`ProjectionService`** con:
  - `proyectarProximoCiclo(asunciones)` basado en obligaciones recurrentes + promedio histórico de gastos.
  - `crearSiguienteCiclo(fechaPago)` clona obligaciones recurrentes como compromisos del nuevo ciclo (sin copiar gastos ni pagos).
  - `simularImpacto(snap, cicloId, cambio)` para "¿qué pasa si...?" sin persistir.
  - `compararCiclo(snap, cicloId)` para Escenario 10 (cierre).
- **`PaymentService`** con `registrarPagoCompromiso` y `registrarPagoDeuda`.
- **Tests Jasmine** completos para los 10 escenarios del plan:
  - `financial-calculations.spec.ts` (~22 tests).
  - `cycle.service.spec.ts` (CRUD + invariantes).
  - `projection.service.spec.ts` (impacto, comparativo, clonado).
- **`docs/TEST_PLAN_CICLOS.md`** documentando los 10 escenarios, reglas validadas y hallazgos.

### Fixed (bugs encontrados durante QA)
- `fechaProximoPago` ahora usa `siguienteCiclo` si existe (antes siempre estimaba +15d).
- `obligacionesProyectadas` ya no duplica obligaciones que tienen compromiso.
- `saldoCompromiso` y `saldoDeuda` se truncan a 0 si hay sobrepago.
- `gastoMaximoDiario` no divide por cero cuando `dias = 0`.
- `vigencia` normaliza fechas a inicio de día antes de comparar.

### Added (UX para Escenarios 4 y 6)
- Banner en dashboard: "Estás planificando tu próximo pago" en modo planificación con fecha futura.
- Banner: "Tu pago ya debía llegar" cuando `fechaPagoAlcanzada=true` y `modo=PLANIFICACION` (signal `pagoEsperadoPendiente`).
- Card "Próximo ciclo registrado" cuando existe un ciclo posterior.
- Card "Tu próximo pago está cerca · Preparar" cuando `diasHastaProximoPago ≤ 3` y no hay siguiente ciclo creado.

### Business Rules tocadas
- **BR-Salud (Regla F)**: explícitamente `% libre` (30/10) en `saludCiclo`. Reemplaza la lógica anterior basada en umbrales COP.
- **BR-Vencidos (Regla C+G)**: distinción entre `modo` (data-driven) y `fechaPagoAlcanzada` (time-driven). `pagoEsperadoPendiente` es la intersección.
- **BR-ClonadoCiclo (Regla I)**: solo obligaciones recurrentes se clonan automáticamente.

## [0.2.0-decisional] — 2026-06-20

### Changed (rediseño UX)
- App reposicionada de "registro" a "planificación por ciclos de nómina".
- Dashboard rediseñado con 6 secciones orientadas a decisiones:
  1. "Hoy estás aquí" (próximo pago, días, modo).
  2. **Dinero Libre Proyectado** (métrica principal, hero card con gradiente semáforo).
  3. **Dinero Disponible Real** (solo en modo EJECUCIÓN).
  4. **Salud del Ciclo** (verde/amarillo/rojo basado en % libre).
  5. **Gasto Máximo Diario** (DLP ÷ días restantes).
  6. **Confiabilidad de la Proyección** (checklist con CTAs).
- Onboarding guiado: `/start` → `/cycles/new?onboarding=1` → `/incomes/new?onboarding=1` → `/obligations/new?onboarding=1` → `/dashboard`.
- Redirect inteligente: si no hay ciclo activo, el dashboard te lleva a `/start` en vez de mostrar un vacío hostil.

### Added
- Tipo `ModoCiclo = 'PLANIFICACION' | 'EJECUCION'` y signal derivado en `FinancialAnalysisService`.
- Signal `dineroLibreProyectado` = Ingresos Esperados + Recibidos − Obligaciones proyectadas − Gastos del ciclo.
- Signal `dineroDisponibleReal` = Recibidos − Pagos − Gastos.
- Signal `obligacionesProyectadas` que combina compromisos del ciclo + obligaciones activas del catálogo sin compromiso aún.
- Signal `saludCiclo` y `porcentajeLibreRestante`.
- Signal `confiabilidad` con checklist de 5 items + porcentaje + mensaje + CTAs por item.
- Signal `pagosCicloRealizados`.
- Signal `fechaProximoPago` (estima la siguiente fecha cuando el ciclo ya pasó).
- `WelcomeComponent` en `/start` con explicación + 3 pasos + CTA.

### Business Rules tocadas
- **BR-10 → FC reescrita** Se mantiene como "DLR legacy" (compatibilidad Excel V2) pero ya NO es la métrica del dashboard.
- **Nueva FC: Dinero Libre Proyectado** — la métrica primaria, suma ingresos esperados Y recibidos, resta obligaciones proyectadas (no solo A+B) y gastos.
- **Nueva FC: Dinero Disponible Real** — sustituye al DLR del MVP para responder "¿cuánto tengo hoy en la mano?".
- **Nueva FC: Salud del Ciclo** — usa % libre, no umbrales absolutos COP.
- **Nueva FC: Confiabilidad** — checklist booleano de 5 hitos.
- **Renombre de prioridades**:
  - A "Crítica" → **Esencial**
  - B "Financiera" → **Financiero**
  - C "Personal" → **Importante**
  - D "Variable" → **Flexible**
  - Cada una con `descripcion` y `ejemplos` para guiar la elección en el form.

### UI/UX
- Form de obligación: selector de prioridad con tarjetas radio que muestran descripción + ejemplos.
- Form de obligación: en modo onboarding, banner "Paso 3 de 3" + botón "Guardar y agregar otra" para cargar el catálogo seguido.
- Cycle / Income forms encadenan redirects con `?onboarding=1` para no perder al usuario en listas vacías.

## [0.1.0-mvp] — 2026-06-20

### Added (MVP funcional)
- Proyecto Angular 18 standalone con Signals, Material, SCSS, PWA.
- Persistencia real con Dexie v1: tablas `config`, `ciclos`, `ingresos`, `obligaciones`, `compromisos`, `pagos`, `gastos`, `deudas`.
- Servicios financieros con cálculos en vivo: `FinancialAnalysisService` (FC-01 a FC-22), `CycleService`, `IncomeService`, `ExpenseService`, `ObligationService`, `CashFlowService`, `ClockService`, `SeedService`.
- Dashboard con tarjetas reactivas: DLR, Estado Financiero, Gasto máximo diario, Velocidad de gasto, Vencidas, Corrientes, Cobertura, Dependencia de Crédito, Necesidad de Financiamiento.
- CRUD funcional de: ciclos (con marcar activo/cerrar), ingresos (con tipos y estados), gastos (captura rápida con chips de categoría), obligaciones (con prioridad y recurrencia).
- Configuración: ingreso base, fondo operativo, frecuencia de pago, umbrales semáforo, export JSON, borrar todo.
- Routing con hash location (compatible con GitHub Pages).
- Manifest + Service Worker (ngsw) para instalación PWA.
- GitHub Actions workflow `.github/workflows/deploy.yml` para deploy automático.

### Documentación inicial (sesión previa)
- Documentación completa en `/docs` (01-12).
- Diseño de arquitectura Angular con Signals + Dexie.
- Reglas de negocio numeradas (BR-01 a BR-26).
- Fórmulas financieras numeradas (FC-01 a FC-30).
- Roadmap por versiones (v0.1 a v1.0).

### Plan de versiones
- v0.1 — MVP "¿Cuánto puedo gastar hoy?": Gastos + Dashboard + PWA.
- v0.2 — Obligaciones, Compromisos, Pagos.
- v0.3 — Deudas personales.
- v0.4 — Planes de acción.
- v0.5 — Proyecciones a 1 ciclo.
- v0.6 — Riesgo + recomendaciones.
- v0.7 — Reportes.
- v0.8 — Seguridad / PIN.
- v0.9 — Backup / Restore.
- v1.0 — Pulido + modo SIMPLE/COMPLETO.

---

## Template para nuevas entradas

```markdown
## [vX.Y.Z] — YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Deprecated
- ...

### Removed
- ...

### Fixed
- ...

### Security
- ...

### Business Rules tocadas
- BR-NN — descripción del cambio
- FC-NN — descripción del cambio

### Migration notes
- Dexie v(N) → v(N+1): ...
```

---

## Reglas de actualización

1. Cualquier PR que toque lógica financiera **debe** incluir entrada en este changelog.
2. Cuando una entrada toca una regla `BR-NN` o fórmula `FC-NN`, hacer cross-reference: actualizar también `03-business-rules.md` y/o `05-financial-calculations.md`.
3. Versionar antes de cada deploy a GitHub Pages. Tagear el commit (`git tag v0.1.0`) y registrar el hash aquí.
4. Migraciones de Dexie llevan nota explícita con la versión origen y destino y un test que verifica el upgrade.
