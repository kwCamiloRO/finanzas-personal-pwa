# Arquitectura — Finanzas Personales PWA

## Principio rector

**Las reglas financieras nunca viven en componentes.** Toda regla está en un servicio. Los componentes consumen `signals` derivados de esos servicios y disparan acciones. El estado de UI (qué pantalla, qué modal) sí puede vivir en componentes.

## Capas

```
┌──────────────────────────────────────────────┐
│  features/   (pantallas: lógica de UI)       │
├──────────────────────────────────────────────┤
│  shared/     (componentes reutilizables UI)  │
├──────────────────────────────────────────────┤
│  core/                                       │
│    ├── domain/     (modelos TypeScript)      │
│    ├── services/   (lógica financiera)       │
│    ├── data/       (Dexie repositorios)      │
│    └── infra/      (PWA, backup, PIN, etc.)  │
└──────────────────────────────────────────────┘
        ▲                                ▲
        │                                │
   IndexedDB (Dexie)            Web APIs (crypto, FS)
```

## Estructura de carpetas

```
src/
├── app/
│   ├── core/
│   │   ├── domain/
│   │   │   ├── ciclo.model.ts
│   │   │   ├── ingreso.model.ts
│   │   │   ├── obligacion.model.ts
│   │   │   ├── compromiso.model.ts
│   │   │   ├── pago.model.ts
│   │   │   ├── gasto.model.ts
│   │   │   ├── deuda.model.ts
│   │   │   ├── plan.model.ts
│   │   │   ├── escenario.model.ts
│   │   │   ├── config.model.ts
│   │   │   └── enums.ts
│   │   ├── data/
│   │   │   ├── finanzas.db.ts                 ← Dexie database class
│   │   │   ├── ciclo.repository.ts
│   │   │   ├── ingreso.repository.ts
│   │   │   ├── obligacion.repository.ts
│   │   │   ├── compromiso.repository.ts
│   │   │   ├── pago.repository.ts
│   │   │   ├── gasto.repository.ts
│   │   │   ├── deuda.repository.ts
│   │   │   ├── plan.repository.ts
│   │   │   ├── escenario.repository.ts
│   │   │   └── config.repository.ts
│   │   ├── services/
│   │   │   ├── financial-analysis.service.ts  ← métricas del ciclo activo
│   │   │   ├── projection.service.ts          ← motor de proyecciones
│   │   │   ├── risk.service.ts                ← scoring de riesgo
│   │   │   ├── cycle.service.ts               ← apertura/cierre de ciclos
│   │   │   ├── debt-strategy.service.ts       ← prioridad de pago de deudas
│   │   │   ├── cash-flow.service.ts           ← flujo de caja diario
│   │   │   ├── plan-engine.service.ts         ← simulación de planes
│   │   │   ├── recommendation.service.ts      ← sugerencias automáticas
│   │   │   └── financial-state.service.ts     ← señal global del estado
│   │   ├── infra/
│   │   │   ├── backup.service.ts              ← export/import JSON
│   │   │   ├── pin.service.ts                 ← PIN local + scrypt
│   │   │   ├── biometric.service.ts           ← stub FaceID (WebAuthn)
│   │   │   ├── pwa.service.ts                 ← install prompt + update
│   │   │   └── clock.service.ts               ← TODAY() inyectable (testable)
│   │   └── core.routes.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── metric-card/
│   │   │   ├── traffic-light/
│   │   │   ├── currency-input/
│   │   │   ├── quick-capture-fab/
│   │   │   ├── cycle-picker/
│   │   │   └── empty-state/
│   │   ├── directives/
│   │   ├── pipes/
│   │   │   ├── cop.pipe.ts                    ← formato COP
│   │   │   └── days-until.pipe.ts
│   │   └── shared.module.ts                   (opcional si usas standalone)
│   │
│   ├── features/
│   │   ├── dashboard/
│   │   ├── ingresos/
│   │   ├── gastos/
│   │   ├── obligaciones/
│   │   ├── compromisos/
│   │   ├── pagos/
│   │   ├── deudas/
│   │   ├── ciclos/
│   │   ├── proyecciones/
│   │   ├── planes/                            ← plan de acción
│   │   ├── escenarios/
│   │   ├── reportes/
│   │   ├── onboarding/                        ← 7 pasos
│   │   └── configuracion/
│   │
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
│
├── assets/
├── styles/
│   ├── _tokens.scss                           ← colores semáforo, spacing
│   ├── _typography.scss
│   └── styles.scss
├── manifest.webmanifest
├── index.html
└── main.ts
```

## Contratos clave (interfaces, no implementación)

### `FinancialAnalysisService`

Expone métricas del ciclo activo como `Signal<...>`. Reactivo a cambios en cualquier tabla.

```typescript
@Injectable({ providedIn: 'root' })
export class FinancialAnalysisService {
  // Estado base
  cicloActivoId: Signal<string | null>;

  // Métricas calculadas en vivo (computed signals)
  ingresosRecibidos: Signal<number>;
  ingresosEsperados: Signal<number>;
  obligacionesCriticas: Signal<number>;
  obligacionesFinancieras: Signal<number>;
  obligacionesVencidas: Signal<number>;
  obligacionesCorrientes: Signal<number>;
  gastosCiclo: Signal<number>;
  fondoOperativo: Signal<number>;
  dineroLibreReal: Signal<number>;
  estadoFinanciero: Signal<'VERDE' | 'AMARILLO' | 'ROJO'>;
  necesidadFinanciamiento: Signal<number>;
  estadoNF: Signal<'SIN_NECESIDAD' | 'CUBIERTA_FONDO' | 'REQUIERE_CREDITO'>;

  // Predictivos
  diasHastaProximoPago: Signal<number>;
  gastoMaximoDiarioRecomendado: Signal<number>;
  velocidadDeGasto: Signal<number>;          // COP/día observado
  consumoDiarioPromedio: Signal<number>;
  proyeccionFinCiclo: Signal<number>;        // DLR esperado al cierre
}
```

### `ProjectionService`

Motor de proyecciones. Sin estado mutable; cada llamada es pura.

```typescript
@Injectable({ providedIn: 'root' })
export class ProjectionService {
  proximoCiclo(asunciones?: Partial<Asunciones>): Promise<Proyeccion>;
  horizonte(meses: 1 | 3 | 6 | 12, asunciones?: Partial<Asunciones>): Promise<ProyeccionMensual[]>;
  simularCambio(cambio: CambioFinanciero): Promise<ImpactoFinanciero>;
}

export interface Asunciones {
  recibirPrima: boolean;
  recibirVacaciones: boolean;
  ingresosExtra: number;
  ajusteGastos: number;          // +/- %
  pagarDeudas: string[];          // IDs de deudas a saldar
}
```

### `RiskService`

```typescript
@Injectable({ providedIn: 'root' })
export class RiskService {
  scoreRiesgo: Signal<number>;                 // 0-100, mayor = peor
  nivelRiesgo: Signal<'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'>;
  factoresRiesgo: Signal<FactorRiesgo[]>;     // explicabilidad
  dependenciaCredito: Signal<number>;          // %
  capacidadEndeudamiento: Signal<number>;     // COP disponibles para nueva obligación
  cobertura: Signal<number>;                   // ratio ingresos / (obligaciones + gastos)
  tendencia: Signal<'MEJORANDO' | 'ESTABLE' | 'EMPEORANDO'>;
}
```

### `CycleService`

```typescript
@Injectable({ providedIn: 'root' })
export class CycleService {
  ciclos: Signal<Ciclo[]>;
  cicloActivo: Signal<Ciclo | null>;

  abrirCiclo(fechaPago: Date, ingresoInicial?: Ingreso): Promise<Ciclo>;
  cerrarCiclo(cicloId: string): Promise<void>;
  setActivo(cicloId: string): Promise<void>;
  duracionCicloActual(): number;               // días
}
```

### `DebtStrategyService`

```typescript
@Injectable({ providedIn: 'root' })
export class DebtStrategyService {
  estrategiaSugerida: Signal<'AVALANCHE' | 'SNOWBALL' | 'CRITICAS_PRIMERO'>;
  ordenPagoSugerido: Signal<OrdenPagoItem[]>;

  simularEstrategia(estrategia: EstrategiaDeuda, mesesObjetivo?: number): Promise<ResultadoEstrategia>;
}
```

### `PlanEngineService`

```typescript
@Injectable({ providedIn: 'root' })
export class PlanEngineService {
  evaluarItem(item: PlanItem, plan: Plan): { saldoActual: number; saldoResultante: number; acumulado: number; dlrSiSeEjecuta: number; esEjecutable: boolean };
  evaluarPlan(planId: string): Promise<EvaluacionPlan>;
  recomendarPlanAutomatico(objetivo: 'LIQUIDEZ' | 'REDUCIR_DEUDA' | 'CUBRIR_VENCIDAS'): Promise<Plan>;
}
```

### `RecommendationService`

```typescript
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  recomendaciones: Signal<Recomendacion[]>;   // top-N en cada momento

  // Ejemplos generados:
  // "Cubre primero CM02 (Energía vencida) — impacto: estado RIESGO → AMARILLO"
  // "Reduce gasto diario en $5.000 — proyección fin de ciclo mejora $150.000"
}
```

### `BackupService`

```typescript
@Injectable({ providedIn: 'root' })
export class BackupService {
  exportar(): Promise<BackupBundle>;                 // genera JSON
  descargarBackup(): Promise<void>;                  // dispara File Save
  importar(bundle: BackupBundle, modo: 'REEMPLAZAR' | 'FUSIONAR'): Promise<ImportResult>;
  validar(bundle: unknown): bundle is BackupBundle;
}

export interface BackupBundle {
  version: number;
  generadoEn: string;            // ISO
  datos: {
    config: ConfigRow[];
    ciclos: Ciclo[];
    ingresos: Ingreso[];
    obligaciones: Obligacion[];
    compromisos: Compromiso[];
    pagos: Pago[];
    gastos: Gasto[];
    deudas: Deuda[];
    planes: Plan[];
    planItems: PlanItem[];
    escenarios: Escenario[];
  };
}
```

## Flujo de datos

```
Usuario interactúa con feature/  ──► Acción (ej. addPago(payload))
                                       │
                                       ▼
                                  Repository (Dexie)
                                       │
                                       ▼
                                  IndexedDB
                                       │
                                       ▼
                          Repository emite cambio (liveQuery)
                                       │
                                       ▼
                       Signal en el servicio se recomputa
                                       │
                                       ▼
                        Componente re-renderiza automáticamente
```

Dexie ofrece `liveQuery()` que se integra perfectamente con `toSignal()` de Angular:

```typescript
import { liveQuery } from 'dexie';
import { toSignal } from '@angular/core/rxjs-interop';

const pagos$ = liveQuery(() => db.pagos.toArray());
readonly pagos = toSignal(from(pagos$), { initialValue: [] });
```

Así cualquier mutación en IndexedDB se propaga sin código manual de notificación.

## Rutas (high-level)

```
/                    → redirect a /dashboard si hay ciclo, /onboarding si no
/onboarding          → onboarding (7 pasos, lazy)
/dashboard           → vista principal
/capturar/gasto      → modal/full-screen captura rápida
/capturar/ingreso    → idem
/capturar/pago       → idem
/obligaciones        → lista catálogo + pendientes
/compromisos         → lista del ciclo activo, filtrable
/deudas              → lista deudas personales
/ciclos              → administración de ciclos
/proyecciones        → motor de proyecciones (1m, 3m, 6m, 12m)
/planes              → planes de acción
/planes/:id          → detalle + simulación
/escenarios          → simulador de escenarios de ingreso
/reportes            → gráficos
/configuracion       → parámetros + backup + PIN
```

Todas standalone, lazy-loaded por feature.

## Estado global

No usar NgRx ni Akita. La fuente única de verdad es **IndexedDB**, y los `computed signals` derivan métricas de ahí. Lo único que necesita memoria global es:

- `cicloActivoId` — se persiste en `config` (Dexie), se expone como signal desde `CycleService`.
- `usuarioAutenticado` — bool, en `PinService` (memory only, se borra al cerrar la app).
- Tema (claro/oscuro), idioma — en `config`.

## Reglas de codificación

1. Nunca importar Dexie directamente desde un componente o servicio de features. Solo los `repository.ts` conocen Dexie.
2. Los servicios financieros (`FinancialAnalysisService`, etc.) no leen IndexedDB directamente; consumen repositorios.
3. Los componentes solo consumen signals; nunca usan `subscribe` manual.
4. Sin `Date.now()` en lógica financiera — usar `ClockService` (inyectable, mockeable).
5. Toda fórmula financiera tiene un test unitario que la replica con datos del Excel V2 (regression suite).
6. Cualquier nueva regla financiera obliga a actualizar `docs/03-business-rules.md`, `docs/05-financial-calculations.md`, `docs/08-changelog.md`.

## Decisiones técnicas pendientes (documentadas en cada doc)

- Versión exacta de Angular (ver `docs/07-roadmap.md`).
- Estrategia de routing: hash-based para GitHub Pages vs. push-state con fallback 404 (ver `docs/10-github-pages-deployment.md`).
- Estrategia de PIN: PBKDF2 vs. scrypt (ver `docs/09-security-model.md`).
