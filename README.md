# Finanzas Personales Predictivas — PWA Offline First

Asistente financiero personal, no un registrador de gastos. La app responde día a día: ¿cuánto me queda?, ¿cuánto puedo gastar hoy?, ¿qué obligaciones están en riesgo?, ¿puedo asumir una nueva?, ¿estoy mejorando o empeorando?

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular (latest stable, ≥18) + TypeScript + Angular Material |
| Reactividad | Signals + RxJS donde aplique |
| Persistencia local | IndexedDB vía Dexie.js |
| Distribución | PWA instalable, alojada en GitHub Pages |
| Backend | **Ninguno**. Todos los datos viven en el dispositivo. |

## Filosofía

1. **Offline First.** Internet solo se usa para descargar la app. Después funciona 100% sin conexión.
2. **Privacidad por diseño.** Los datos financieros NUNCA salen del dispositivo. GitHub aloja solo el código compilado.
3. **Decisiones, no registros.** La UI prioriza responder preguntas, no llenar formularios.
4. **Captura en segundos.** Registrar un gasto debe tomar menos de 3 segundos desde la pantalla principal.
5. **Mobile/iPhone First.** Diseñada para una mano y notch.

## Qué hay en este repositorio

```
pwa-angular/
├── README.md                ← este archivo
├── ARCHITECTURE.md          ← estructura Angular, capas, contratos
├── docs/
│   ├── 00-index.md
│   ├── 01-product-vision.md
│   ├── 02-domain-model.md
│   ├── 03-business-rules.md
│   ├── 04-database-schema.md           (Dexie)
│   ├── 05-financial-calculations.md    (fórmulas)
│   ├── 06-ui-ux-decisions.md
│   ├── 07-roadmap.md
│   ├── 08-changelog.md
│   ├── 09-security-model.md
│   ├── 10-github-pages-deployment.md
│   ├── 11-backup-restore.md
│   └── 12-project-memory.md            (memoria del agente)
```

## Cómo arrancar el proyecto real

Cuando vayas a crear el código:

```bash
ng new finanzas-personales --routing --style=scss --standalone --ssr=false
cd finanzas-personales
ng add @angular/material
ng add @angular/pwa
npm install dexie
```

Luego sigue `ARCHITECTURE.md` para crear la estructura de carpetas y `docs/04-database-schema.md` para inicializar Dexie.

## Documentación obligatoria

Cada vez que se agregue o modifique una regla financiera, actualizar:

- `docs/03-business-rules.md`
- `docs/05-financial-calculations.md`
- `docs/08-changelog.md`
- `docs/12-project-memory.md`

La documentación debe permanecer sincronizada con el código. Ver `docs/12-project-memory.md` para el protocolo de actualización.

## Continuidad con el modelo existente

La lógica financiera ya está validada en el Excel V2 (`../Planeacion_Financiera_Ciclos.xlsx`) y diseñada para AppSheet (`../APPSHEET_MIGRACION.md`). Esta PWA es la **tercera implementación** del mismo modelo, con tres ventajas que las anteriores no tienen:

1. **Predictivo**: proyecciones a 1, 3, 6, 12 meses.
2. **Decisional**: motor de simulación de planes de acción.
3. **Privado**: datos solo en el dispositivo, sin nube.
