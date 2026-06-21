# 11 — Backup & Restore

## Principio

Los datos son del usuario. Debe poder llevárselos, archivarlos, restaurarlos. La app no los almacena fuera del dispositivo, pero **facilita** que el usuario haga su propio respaldo.

## Formato

JSON único, versionado, con todas las tablas anidadas. Sin compresión (debugabilidad > tamaño; backup completo de 5 años pesa < 5 MB).

```json
{
  "version": 1,
  "appVersion": "0.1.0",
  "generadoEn": "2026-06-20T14:30:00.000Z",
  "dispositivoOrigen": "iPhone Safari 18.4",
  "datos": {
    "config": [ ... ],
    "ciclos": [ ... ],
    "ingresos": [ ... ],
    "obligaciones": [ ... ],
    "compromisos": [ ... ],
    "pagos": [ ... ],
    "gastos": [ ... ],
    "deudas": [ ... ],
    "planes": [ ... ],
    "planItems": [ ... ],
    "escenarios": [ ... ]
  }
}
```

## Servicio

```typescript
// src/app/core/infra/backup.service.ts
@Injectable({ providedIn: 'root' })
export class BackupService {
  constructor(
    private configRepo: ConfigRepository,
    private cicloRepo: CicloRepository,
    // ... etc
  ) {}

  async exportar(): Promise<BackupBundle> {
    const bundle: BackupBundle = {
      version: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      generadoEn: new Date().toISOString(),
      dispositivoOrigen: this.detectarDispositivo(),
      datos: {
        config:       await this.configRepo.list(),
        ciclos:       await this.cicloRepo.list(),
        ingresos:     await this.ingresoRepo.list(),
        obligaciones: await this.obligacionRepo.list(),
        compromisos:  await this.compromisoRepo.list(),
        pagos:        await this.pagoRepo.list(),
        gastos:       await this.gastoRepo.list(),
        deudas:       await this.deudaRepo.list(),
        planes:       await this.planRepo.list(),
        planItems:    await this.planItemRepo.list(),
        escenarios:   await this.escenarioRepo.list(),
      }
    };
    return bundle;
  }

  async descargar(): Promise<void> {
    const bundle = await this.exportar();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-backup-${this.timestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importar(bundle: unknown, modo: 'REEMPLAZAR' | 'FUSIONAR' = 'REEMPLAZAR'): Promise<ImportResult> {
    const validacion = this.validar(bundle);
    if (!validacion.ok) {
      return { ok: false, errores: validacion.errores };
    }
    const valido = bundle as BackupBundle;

    // Migrar si la versión es vieja
    const migrado = await this.migrarBackupSiNecesario(valido);

    if (modo === 'REEMPLAZAR') {
      await this.borrarTodo();
      await this.cargar(migrado.datos);
    } else {
      await this.fusionar(migrado.datos);
    }

    return {
      ok: true,
      contadores: this.contar(migrado.datos),
    };
  }

  private validar(bundle: unknown): { ok: true } | { ok: false, errores: string[] } {
    const errores: string[] = [];
    if (typeof bundle !== 'object' || !bundle) errores.push('No es un objeto JSON.');
    const b = bundle as Partial<BackupBundle>;
    if (typeof b.version !== 'number') errores.push('Falta `version`.');
    if (!b.datos) errores.push('Falta `datos`.');
    // ...validaciones por tabla con Zod o equivalente.
    return errores.length ? { ok: false, errores } : { ok: true };
  }
}
```

## Modos de import

- **REEMPLAZAR**: borra todo y carga el bundle. Caso típico: migración a un nuevo dispositivo.
- **FUSIONAR**: aplica heurística por tabla:
  - `config`: el bundle gana (sobreescribe).
  - `ciclos`: por `id` — si no existe, agregar; si existe, conservar el local (warning).
  - `ingresos/gastos/pagos`: por `id` — agregar si no existe.
  - `obligaciones`: por `id` — fusiona, conservando `activa` del local.
  - `deudas`, `planes`, `planItems`, `escenarios`: igual que ingresos.

El modo FUSIONAR es complejo y se entrega en v0.9; el modo REEMPLAZAR es suficiente para MVP (v0.1).

## Migración de bundles entre versiones de esquema

```typescript
private async migrarBackupSiNecesario(bundle: BackupBundle): Promise<BackupBundle> {
  let actual = bundle;
  while (actual.version < SCHEMA_VERSION) {
    actual = await this.aplicarMigracion(actual.version, actual);
  }
  return actual;
}

private async aplicarMigracion(desde: number, bundle: BackupBundle): Promise<BackupBundle> {
  switch (desde) {
    case 1:
      // Ejemplo: v1 → v2 agregó campo metodoPago en pagos
      bundle.datos.pagos = bundle.datos.pagos.map(p => ({ ...p, metodoPago: p.metodoPago ?? 'Otro' }));
      return { ...bundle, version: 2 };
    default:
      throw new Error(`No hay migración desde versión ${desde}`);
  }
}
```

## Backup automático en `localStorage`

Al evento `visibilitychange = hidden`, guarda un snapshot reciente:

```typescript
@HostListener('document:visibilitychange')
async onVisibilityChange(): Promise<void> {
  if (document.visibilityState === 'hidden') {
    const bundle = await this.backupService.exportar();
    try {
      localStorage.setItem('lastAutoBackup', JSON.stringify(bundle));
      localStorage.setItem('lastAutoBackupAt', new Date().toISOString());
    } catch (e) {
      // localStorage lleno o navegador privado; ignorar
    }
  }
}
```

Si IndexedDB sufre corrupción, el último backup automático sobrevive en `localStorage`. La app detecta IndexedDB vacía + localStorage con backup y ofrece restaurar.

## UI de Backup

`/configuracion/backup`:

```
Respaldo

  Último respaldo manual: 20 jun 2026 (hace 2 días)
  Último respaldo automático: hoy

  [ Descargar respaldo ahora ]

Restaurar

  [ Seleccionar archivo JSON ]
  Modo:  (•) Reemplazar todo
         ( ) Fusionar (avanzado)
```

Al seleccionar archivo: parseo, validación, confirmación con resumen ("Importarás 3 ciclos, 12 obligaciones, 230 pagos... continuar?").

## iCloud / Google Drive (futuro)

La app NUNCA sube datos directamente. Para sincronizar entre dispositivos:

1. Usuario descarga JSON manualmente.
2. Lo deja en su iCloud/Drive personal.
3. En el otro dispositivo lo selecciona desde el picker nativo.

Eso preserva el principio "datos solo en el dispositivo" — la nube es del usuario, no de la app.

## Privacidad del backup

- El JSON está en claro. Si el usuario lo sube a un servicio en nube, asume el riesgo.
- v1.x evaluará cifrado opcional con passphrase (AES-GCM, clave derivada con PBKDF2). UI: checkbox "Cifrar respaldo" + 2 campos passphrase.

## Pruebas de regresión

Cada vez que cambie el esquema:

1. Cargar un bundle de la versión anterior.
2. Aplicar migración.
3. Verificar que la app funciona normal.
4. Verificar que los reportes históricos son idénticos antes y después.
