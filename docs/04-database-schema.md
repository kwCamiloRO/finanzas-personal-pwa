# 04 — Database Schema (Dexie)

IndexedDB vía Dexie. Single database, versionada. Todas las tablas usan `id` como primary key.

## Inicialización

```typescript
// src/app/core/data/finanzas.db.ts
import Dexie, { Table } from 'dexie';
import {
  Config, Ciclo, Ingreso, Obligacion, Compromiso,
  Pago, Gasto, Deuda, Plan, PlanItem, Escenario
} from '../domain';

export class FinanzasDB extends Dexie {
  config!:      Table<Config, string>;          // key: parametro
  ciclos!:      Table<Ciclo, string>;
  ingresos!:    Table<Ingreso, string>;
  obligaciones!: Table<Obligacion, string>;
  compromisos!: Table<Compromiso, string>;
  pagos!:       Table<Pago, string>;
  gastos!:      Table<Gasto, string>;
  deudas!:      Table<Deuda, string>;
  planes!:      Table<Plan, string>;
  planItems!:   Table<PlanItem, string>;
  escenarios!:  Table<Escenario, string>;

  constructor() {
    super('FinanzasDB');

    // Versión 1 (esquema inicial)
    this.version(1).stores({
      config:       'parametro',
      ciclos:       'id, fechaPago, estado',
      ingresos:     'id, cicloId, fecha, tipo, estado',
      obligaciones: 'id, tipo, prioridad, activa',
      compromisos:  'id, obligacionId, periodo, fechaVencimiento',
      pagos:        'id, fecha, fuente, compromisoId, deudaId',
      gastos:       'id, cicloId, fecha, categoria',
      deudas:       'id, persona, prioridad',
      planes:       'id, cicloId, estado',
      planItems:    'id, planId, ordenPago',
      escenarios:   'id, nombre',
    });

    // Hooks para timestamps automáticos
    this.ingresos.hook('creating', (_, obj) => { obj.fecha ??= new Date(); });
    this.gastos.hook('creating', (_, obj) => { obj.fecha ??= new Date(); });
    this.pagos.hook('creating', (_, obj) => { obj.fecha ??= new Date(); });
  }
}

export const db = new FinanzasDB();
```

## Índices

Solo los necesarios para consultas frecuentes. Crear más índices ralentiza las escrituras.

| Tabla | Campos indexados | Justificación |
|---|---|---|
| `ciclos` | `fechaPago`, `estado` | Listar ciclos por fecha; encontrar ciclo activo |
| `ingresos` | `cicloId`, `fecha`, `tipo`, `estado` | Filtrar por ciclo + estado para DLR |
| `obligaciones` | `tipo`, `prioridad`, `activa` | Listar activas, filtrar por prioridad |
| `compromisos` | `obligacionId`, `periodo`, `fechaVencimiento` | Calcular saldos por ciclo + vencidas |
| `pagos` | `fecha`, `fuente`, `compromisoId`, `deudaId` | Cálculo de valorPagado |
| `gastos` | `cicloId`, `fecha`, `categoria` | Sumar gastos del ciclo |
| `deudas` | `persona`, `prioridad` | Búsqueda |
| `planes` | `cicloId`, `estado` | Listar planes del ciclo activo |
| `planItems` | `planId`, `ordenPago` | Ordenamiento dentro del plan |

## Repositorios

Cada tabla tiene un repository que expone CRUD + queries específicas. Solo los repositorios conocen Dexie.

```typescript
// src/app/core/data/compromiso.repository.ts
@Injectable({ providedIn: 'root' })
export class CompromisoRepository {
  list(): Promise<Compromiso[]>      { return db.compromisos.toArray(); }
  porCiclo(cicloId: string): Promise<Compromiso[]> {
    return db.compromisos.where('periodo').equals(cicloId).toArray();
  }
  porObligacion(obligacionId: string): Promise<Compromiso[]> {
    return db.compromisos.where('obligacionId').equals(obligacionId).toArray();
  }
  add(c: Compromiso)    { return db.compromisos.add(c); }
  update(id: string, patch: Partial<Compromiso>) { return db.compromisos.update(id, patch); }
  delete(id: string)    { return db.compromisos.delete(id); }

  live$(cicloId: string) {
    return liveQuery(() => db.compromisos.where('periodo').equals(cicloId).toArray());
  }
}
```

## Migraciones

Cada vez que el esquema cambie, **agregar un `this.version(N+1)`**. NUNCA modificar una versión ya publicada.

```typescript
this.version(2).stores({
  pagos: 'id, fecha, fuente, compromisoId, deudaId, metodoPago',
}).upgrade(tx => {
  return tx.table('pagos').toCollection().modify(p => {
    p.metodoPago ??= 'Otro';
  });
});
```

Documentar cada migración en `docs/08-changelog.md`.

## Seeds — datos iniciales

Al instalar la app por primera vez (`Config` está vacío), se siembra:

```typescript
async function seed(): Promise<void> {
  const existe = await db.config.count();
  if (existe > 0) return;

  await db.config.bulkAdd([
    { parametro: 'IngresoBase',      valor: '0',       descripcion: 'Salario base mensual' },
    { parametro: 'FondoOperativo',   valor: '0',       descripcion: 'Reserva intocable' },
    { parametro: 'CicloActivo',      valor: '',        descripcion: 'CicloID en curso' },
    { parametro: 'UmbralVerde',      valor: '1500000', descripcion: 'DLR ≥ → VERDE' },
    { parametro: 'UmbralAmarillo',   valor: '500000',  descripcion: 'DLR ≥ → AMARILLO' },
    { parametro: 'UmbralNFModerada', valor: '0',       descripcion: 'NF ≤ → Sin Necesidad' },
    { parametro: 'UmbralNFCritica',  valor: '1500000', descripcion: 'NF > → Requiere Crédito' },
    { parametro: 'OnboardingCompletado', valor: 'false', descripcion: 'Marcador de onboarding' },
    { parametro: 'Modo',             valor: 'SIMPLE',  descripcion: 'SIMPLE | COMPLETO' },
    { parametro: 'FrecuenciaPago',   valor: 'QUINCENAL', descripcion: 'QUINCENAL | MENSUAL | VARIABLE' },
  ]);
}
```

Los demos de Excel V2 **no** se siembran — la app inicia en blanco y el onboarding guía el primer ingreso.

## Transacciones

Operaciones que tocan múltiples tablas se hacen en `db.transaction`:

```typescript
await db.transaction('rw', db.ciclos, db.config, async () => {
  await db.ciclos.put(nuevoCiclo);
  await db.config.update('CicloActivo', { valor: nuevoCiclo.id });
  // Cerrar ciclo anterior si existe
  if (cicloAnteriorId) {
    await db.ciclos.update(cicloAnteriorId, { estado: 'Cerrado' });
  }
});
```

## Borrado lógico vs físico

- `Obligacion.activa = false` → soft delete (oculta del catálogo pero conserva historial).
- `Gasto`, `Pago`, `Ingreso` se borran físicamente con confirmación doble (es el flujo "deshacer captura errónea").
- Borrar un `Compromiso` con `pagos` asociados → bloqueado; primero borrar los pagos.
- Borrar un `Plan` → cascada a sus `PlanItem` (siempre que el plan esté en estado Borrador).

## Storage estimado

Para un usuario de 5 años:
- ~120 ciclos × 30 KB = 3.6 MB
- ~5000 gastos × 200 B = 1 MB
- ~2000 pagos × 200 B = 400 KB
- Total: < 10 MB, muy debajo del límite de IndexedDB (varios GB en móvil moderno).

## Importar / Exportar

Ver `docs/11-backup-restore.md`. El formato es JSON con todas las tablas anidadas + versión de esquema.
