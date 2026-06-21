# 12 — Project Memory

Bitácora del agente y del desarrollador. Registro de **por qué** se tomó cada decisión, no solo qué se hizo. Lectura obligatoria al comenzar cualquier sesión de trabajo en este proyecto para no repetir debates ya cerrados.

## Cómo usar este documento

- Cuando una decisión técnica tenga más de una opción razonable, registrar la decisión + alternativas descartadas + razón.
- Cuando una regla financiera surja de una conversación con el usuario, capturar la regla original (ej. "El usuario dijo: 'el fondo operativo es intocable, no es ahorro'").
- Cuando una versión cierre, capturar lessons learned.

Formato: bloques fechados.

---

## 2026-06-20 — Origen del proyecto

**Contexto:**
Existían dos implementaciones previas del modelo financiero del usuario:

1. `Planeacion_Financiera_Ciclos.xlsx` (Excel V2) — modelo validado con 115 fórmulas, cero errores.
2. Diseño de migración a AppSheet (`APPSHEET_MIGRACION.md` + `MIGRATION_CHECKLIST.md` + `Planeacion_Financiera_AppSheet.xlsx`).

El usuario pidió una tercera implementación PWA Angular porque:
- AppSheet requiere su nube (rompe el principio de privacidad total).
- Excel no es portable a móvil con captura ágil.
- Necesita predicciones y recomendaciones, no solo registro.

**Decisión:** crear un proyecto Angular independiente, en carpeta `pwa-angular/`, sin tocar los dos artefactos previos. Reusar la lógica financiera y los datos de regresión del Excel V2 como fuente de verdad de las fórmulas.

---

## 2026-06-20 — Por qué Signals + Dexie y no NgRx

**Decisión:** estado global ≡ IndexedDB. `Signals + Dexie liveQuery + toSignal` cubre 100% del flujo de datos sin reducers, actions, ni efectos.

**Alternativa descartada:** NgRx. La adopción de NgRx en una app personal de un solo usuario es over-engineering. Suma boilerplate sin beneficio: no hay sync server, no hay optimistic UI, no hay time-travel debugging real.

**Riesgo asumido:** si en futuro se necesita lógica reactiva compleja entre features no relacionadas, podríamos sufrir. Mitigación: cada feature consume `signals` desde servicios de `core/services/`; si en algún punto se requiere coordinación, se introduce un `coordinator.service.ts` específico, no NgRx global.

---

## 2026-06-20 — Por qué Dexie y no idb / idb-keyval / RxDB

**Decisión:** Dexie.

- `idb` (de Jake Archibald): demasiado bajo nivel; requeriría escribir un repository pattern sobre él.
- `idb-keyval`: solo key-value; insuficiente para queries con índices.
- `RxDB`: trae sync engine + esquema declarativo + reactividad nativa. Demasiado pesado para una app sin sync server.
- **Dexie**: API limpia, índices, `liveQuery`, transacciones, migraciones versionadas. Madurez sólida.

---

## 2026-06-20 — Hash routing vs push-state

**Decisión v0.1:** Hash routing (`withHashLocation()`).

**Razón:** GitHub Pages no soporta SPA fallback. Hash routing funciona sin trucos. La URL con `#` es un costo cosmético aceptable para v0.1.

**Revisar en v0.5+:** migrar a push-state con `404.html` duplicado de `index.html`. PR aislado.

---

## 2026-06-20 — Fondo Operativo, no Caja Protegida

**Decisión del usuario:** renombrar `CajaProtegida` a `FondoOperativo` (heredado del Excel V2).

**Razón del usuario:** "el fondo es operativo en el sentido de que sostiene la operación diaria; protegida sonaba a ahorro". Documentado en V2 README.

---

## 2026-06-20 — DLR no resta C/D

**Decisión heredada de Excel V2:** la fórmula de Dinero Libre Real solo descuenta obligaciones de prioridad A (críticas) y B (financieras). Las C (personales) y D (variables) se muestran pero no afectan el cálculo principal.

**Razón:** son ajustables a la realidad. Restarlas inflaría el "compromiso real" del usuario y subestimaría el dinero disponible. Si el usuario quiere un cálculo más conservador, puede subir el `UmbralVerde`.

---

## 2026-06-20 — Tabla PAGOS separada en vez de campo ValorPagado

**Decisión del usuario (en la fase AppSheet, heredada aquí):**
- COMPROMISOS no tiene columna `ValorPagado`.
- DEUDAS no tiene columna `ValorPagado`.
- Existe tabla `Pagos` con historial inmutable; el `valorPagado` se calcula a demanda.

**Beneficios:**
1. Historial auditable (cuándo, cuánto, comentario, método).
2. Múltiples abonos parciales sin ambigüedad.
3. Si se borra un pago por error, el saldo se recalcula solo.

**Costo:** la lectura del saldo es O(N pagos del compromiso/deuda); aceptable para N < ~1000.

---

## 2026-06-20 — Multi-plan paralelos

**Decisión del usuario:** PLANES y PLAN_ACCION (items) son tablas separadas. Permite simular varios planes alternativos al mismo tiempo sin destruir el anterior.

**Razón del usuario:** "necesito simular en paralelo — pagar Pablo vs pagar Duver vs reducir gasto vs escenario con prima".

---

## 2026-06-20 — Modelo de riesgo simple

**Decisión inicial:** scoring lineal con 5 factores ponderados (BR-18, FC-24). No usar ML.

**Razón:** explicabilidad. El usuario debe poder responder "¿por qué mi riesgo es ALTO?" mirando los 5 factores. Un modelo entrenado con ML local sería más preciso pero opaco.

**Revisar en v1.x:** evaluar TensorFlow.js si el usuario quiere detección automática de gastos inusuales (no para score, para alerts).

---

## 2026-06-20 — Implementación MVP v0.1

**Decisión:** entregar Angular 18 standalone, no esperar v19/v20.

**Razón:** Angular 18 es la última versión LTS estable conocida que combina Signals, control flow `@if`/`@for`, `provideAppInitializer`, y soporte oficial PWA. Versiones más nuevas pueden tener cambios menores; 18 da estabilidad y compatibilidad con el ecosystem actual de Material 18.

**Costo:** si en el futuro queremos upgradear, hay que correr `ng update @angular/core @angular/cli`.

---

## 2026-06-20 — Estado como derivado, no persistido

**Decisión:** en `COMPROMISOS` no se persiste `valorPagado`, `saldoPendiente`, `vigencia`, `estado`, `prioridad`, `tipo`, `nombre`. Todos se derivan en `FinancialAnalysisService` desde la fuente (`Pagos` + `Obligaciones`).

**Razón:** mantiene IndexedDB como fuente única de verdad. Cualquier mutación de un pago se refleja automáticamente vía `liveQuery` → `toSignal` → `computed`.

**Costo:** lecturas son O(N pagos) por cada cálculo. Aceptable para escala personal.

---

## 2026-06-20 — Captura rápida sin modal

**Decisión:** la captura de gasto es una pantalla completa (`/expenses/new`), no un modal sobre el dashboard.

**Razón:** modales en iPhone tienen comportamientos inconsistentes (teclado, scroll). Una pantalla full-screen es más predecible y se siente nativa.

**Trade-off:** un click extra para volver al dashboard. Lo compensamos con: input grande y autofocus, chips de categoría (no dropdown), opciones avanzadas colapsadas, "Guardar" prominente.

---

## 2026-06-20 — Pivote: de registrador a planificador

**Contexto:** test de usabilidad real reveló que el MVP se sentía como una hoja de cálculo CRUD. El usuario no entendía qué responder con la app.

**Cambio fundamental:** la métrica primaria ya no es "Dinero Libre Real" (Excel V2). Es "**Dinero Libre Proyectado**":

```
DLP = (Ingresos Esperados + Ingresos Recibidos) − Obligaciones proyectadas − Gastos del ciclo
```

Donde **Obligaciones proyectadas** = compromisos reales del ciclo + obligaciones activas del catálogo que aún no tienen compromiso (usando `valorEsperadoTipico`).

**Por qué:** el caso real del usuario era: tengo ingreso ESPERADO $6.5M, obligación arriendo $1.75M en el catálogo, sin compromiso del ciclo aún. El MVP mostraba $0 porque solo contaba ingresos `Recibido`. El usuario espera ver una **proyección**: $6.5M − $1.75M = $4.75M.

El DLR legacy del Excel V2 se conserva como `dineroLibreReal` para regression tests, pero ya no se muestra en el dashboard.

---

## 2026-06-20 — Dos modos: Planificación vs Ejecución

**Decisión:** la app opera en dos modos derivados, no configurables:

- **PLANIFICACION** cuando `ingresosRecibidos === 0` (aún no han pagado este ciclo).
- **EJECUCION** cuando `ingresosRecibidos > 0`.

En PLANIFICACION, la tarjeta hero es DLP. En EJECUCION, se agrega una segunda tarjeta hero "Dinero Disponible Real" (recibido − pagado − gastado), que responde "¿cuánto tengo realmente en la mano?".

**Costo:** la lógica del dashboard tiene un `@if (fa.modo() === 'EJECUCION')`. Aceptable porque el modo es derivado de un solo dato y se actualiza solo.

---

## 2026-06-20 — Onboarding como chain de redirects

**Decisión:** no construir un wizard component aparte. Cada formulario respeta `?onboarding=1` y redirige al siguiente paso en lugar de a su lista.

**Razón:** mantiene los componentes de formulario reutilizables (uno para onboarding y uso normal). Sin estado extra: query string es la única fuente de verdad del "estoy en onboarding".

**Flujo:** `/start` → `/cycles/new?onboarding=1` → `/incomes/new?onboarding=1` → `/obligations/new?onboarding=1` → `/dashboard`. El form de obligación además tiene "Guardar y agregar otra" para no salir del flujo cuando el usuario va a cargar varias.

---

## 2026-06-20 — Prioridades semánticas

**Decisión:** los códigos A/B/C/D persisten en IndexedDB (no hay migración) pero los labels y descripciones cambian:

| Antes | Ahora |
|---|---|
| A Crítica | A Esencial |
| B Financiera | B Financiero |
| C Personal | C Importante |
| D Variable | D Flexible |

Más cada una con `descripción` y `ejemplos`. El form de obligación muestra estos como tarjetas radio con badge de color y texto explicativo. Cero cambio de schema, máximo cambio de comprensión.

---

## 2026-06-20 — Salud por porcentaje, no por umbrales COP

**Decisión:** el semáforo del dashboard YA NO usa `UmbralVerde`/`UmbralAmarillo` en COP absolutos. Usa **% libre del ciclo**:

- ≥ 30% libre → VERDE
- ≥ 10% libre → AMARILLO
- < 10%      → ROJO

**Razón:** los umbrales en COP no escalan entre usuarios con diferentes ingresos. Un usuario con $3M de ingreso y otro con $15M tienen umbrales razonables muy distintos. El % es universal.

Los umbrales COP siguen en `CONFIG` por compatibilidad y para futuras métricas, pero no manejan el semáforo principal.

---

## 2026-06-20 — Cálculos como funciones puras

**Decisión:** la lógica financiera vive en `financial-calculations.ts` (puro, sin Angular). El servicio Angular `FinancialAnalysisService` la envuelve en signals.

**Razón:** durante el QA encontré que los tests del servicio requerían TestBed + repositorios mock + signals → ruido enorme para probar una fórmula. Con funciones puras: pasas `DataSnap` + `ConfigSnap`, obtienes número. Cero infraestructura.

**Costo:** dos archivos en vez de uno. Beneficio: 22+ tests del módulo de cálculos corren en milisegundos sin Karma especial.

---

## 2026-06-20 — Modo (data-driven) vs Fecha de pago alcanzada (time-driven)

**Decisión:** mantener `modo` derivado solo de `ingresosRecibidos > 0`, NO de la fecha. Agregar `fechaPagoAlcanzada` y `pagoEsperadoPendiente` como signals separados.

**Razón:** la fecha llegando no significa que el dinero está en la cuenta. El usuario es quien sabe cuándo marcar el ingreso como "Recibido". Pero el sistema sí puede señalar "tu pago debió llegar, ¿lo confirmas?".

Implicación: el dashboard tiene un banner explícito para esa intersección.

---

## 2026-06-20 — Bugs encontrados durante QA (corregidos)

1. `fechaProximoPago` siempre estimaba; ahora prefiere un ciclo posterior registrado.
2. `obligacionesProyectadas` duplicaba si una obligación tenía compromiso Y estaba activa.
3. `saldo*` permitía negativos por sobrepago; corregido con `Math.max(0, ...)`.
4. `gastoMaximoDiario` dividía por 0 al alcanzar la fecha de pago.
5. `vigencia` comparaba Date sin normalizar a 00:00, dando "vencido" falso por offset de hora.

Todos cubiertos por specs nuevas.

---

## 2026-06-20 — Clonado de ciclos: solo recurrentes

**Decisión:** `ProjectionService.crearSiguienteCiclo` replica como compromisos solamente las obligaciones `recurrente=true && activa=true`. Las puntuales (recurrente=false) no se copian.

**Razón:** una obligación no-recurrente representa un evento único que ya pasó (préstamo concreto, gasto eventual). Copiarla al siguiente ciclo es ruido. El usuario puede agregarla manualmente si corresponde.

---

## Decisiones pendientes (TODO)

- [ ] Versión exacta de Angular en `package.json` (latest LTS al momento del MVP).
- [ ] Si usar Material Design 3 (en v3+) o quedarse en MD2.
- [ ] Lib de gráficos para v0.7: Chart.js vs ECharts vs ApexCharts. Criterio: bundle size + soporte de animaciones suaves en móvil.
- [ ] Si proveer un Web Share Target para que otras apps puedan "compartir" un monto y abrir el form de gasto pre-llenado.

---

## Lessons learned (capturar al cerrar cada versión)

### v0.1 MVP
- (pendiente)

### v0.2 Obligaciones
- (pendiente)

---

## Protocolo de actualización

Cuando termines una sesión de trabajo significativa:

1. Agregar bloque con fecha + decisión.
2. Si tocaste reglas/fórmulas: cross-reference a `03-business-rules.md` / `05-financial-calculations.md`.
3. Agregar entrada a `08-changelog.md`.

Cuando empieces una nueva sesión:

1. Leer las últimas 3-5 entradas de este archivo.
2. Revisar `08-changelog.md` para ver qué cambió desde la última vez.
3. Solo entonces empezar a codear.
