# 07 — Roadmap

## Filosofía

Entregar valor en oleadas. El MVP debe contestar **una sola pregunta** mejor que cualquier alternativa: "¿cuánto puedo gastar hoy sin sobregirarme?". Lo demás llega después.

## Versiones

### v0.1 — MVP "¿Cuánto puedo gastar hoy?"

Objetivo: usable como app diaria de bolsillo en 4 semanas de trabajo a tiempo parcial.

**Incluye:**

- Onboarding 3 pasos (modo, ingreso base, frecuencia).
- Captura rápida de Gastos (FAB + bottom sheet + form).
- Cálculo de:
  - DLR (FC-10)
  - Estado Financiero (FC-11)
  - Gasto máximo diario (FC-21)
  - Velocidad de gasto (FC-20)
- Dashboard con: DLR, Estado, "puedes gastar hoy", próximo pago.
- Persistencia Dexie (config, ciclos, ingresos, gastos).
- PWA instalable.
- Tema claro/oscuro.

**NO incluye:**

- Obligaciones, Compromisos, Pagos.
- Deudas personales.
- Planes de acción.
- Proyecciones a múltiples ciclos.
- Reportes/gráficos.
- PIN.

### v0.2 — Obligaciones y vencimientos

- CRUD de Obligaciones (catálogo).
- CRUD de Compromisos (por ciclo).
- Tabla Pagos con historial.
- Cálculo de SaldoPendiente (FC-05).
- Vigencia (FC-06): semáforo Pagado/Corriente/Vencido.
- Indicadores: ObligacionesCriticas, ObligacionesVencidas (FC-07, FC-08).
- Card "Obligaciones vencidas" en dashboard con acción "cubrir ahora".
- Onboarding paso 4 (obligaciones recurrentes).

### v0.3 — Deudas personales

- CRUD de Deudas.
- Pagos vinculados a Deudas.
- Indicador TotalDeudasPersonales.
- Onboarding paso 5 (deudas).

### v0.4 — Plan de acción

- CRUD de Planes y PlanItems.
- Cálculo de EsEjecutable (FC-26).
- Vista de detalle de plan con simulación.
- Acción "aplicar plan": convierte items en pagos reales.

### v0.5 — Proyecciones

- Motor de proyecciones (FC-28, FC-29).
- Vista "Próximo ciclo".
- Asunciones: prima, vacaciones, ingresos extra, ajuste de gastos.
- Tendencia (FC-23).

### v0.6 — Riesgo y recomendaciones

- Score de riesgo (FC-24).
- Card "Riesgo" en dashboard.
- Servicio de recomendaciones (BR-21).
- Banner "Mientras no estuviste" (BR-22).

### v0.7 — Reportes

- Gráficos: evolución DLR, gastos por categoría, comparativo entre ciclos.
- Vista de Reportes con filtros.
- Export PDF de un reporte (opcional).

### v0.8 — Seguridad

- PIN local con PBKDF2 (BR-26).
- Stub de WebAuthn (FaceID) — solo arquitectura, sin activarlo todavía.
- Backup automático en background.

### v0.9 — Backup/Restore manual

- Export JSON completo.
- Import JSON con validación de versión.
- Modos "reemplazar" / "fusionar".

### v1.0 — Pulido

- Modo SIMPLE vs COMPLETO funcional.
- Onboarding completo (7 pasos).
- Documentación final.
- Pruebas de regresión contra datos del Excel V2.
- Deploy estable en GitHub Pages.

## Futuro (post-1.0)

- **Notificaciones locales:** "Vence mañana CM05".
- **Modo familiar/multi-perfil** (en un mismo dispositivo, sin sync).
- **Análisis predictivo con ML local** (TensorFlow.js): detectar gastos inusuales.
- **Integración voz:** "Hey, registra $10.000 en gasolina" (Web Speech API).
- **Widget iOS/Android:** muestra DLR sin abrir la app (requiere wrap nativo).

## Estimaciones de esfuerzo (referencia, no compromiso)

| Versión | Semanas |
|---|---|
| v0.1 MVP | 4 |
| v0.2 Obligaciones | 2 |
| v0.3 Deudas | 1 |
| v0.4 Plan | 2 |
| v0.5 Proyecciones | 2 |
| v0.6 Riesgo | 1 |
| v0.7 Reportes | 2 |
| v0.8 PIN | 1 |
| v0.9 Backup | 1 |
| v1.0 Pulido | 1 |
| **Total a 1.0** | **17** |

## Criterios para pasar entre versiones

- Cada versión debe estar **deployed a GitHub Pages** antes de empezar la siguiente.
- Cada versión que toque lógica financiera actualiza `business-rules.md`, `financial-calculations.md`, `changelog.md`, `project-memory.md`.
- Si una versión introduce migración Dexie, debe haber un script de migración + test que cargue datos de la versión anterior.
