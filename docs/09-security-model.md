# 09 — Security Model

## Principio

Los datos financieros NUNCA salen del dispositivo. La app es offline-first; los servidores (GitHub Pages) sirven solo HTML/JS/CSS estáticos. Cualquier feature que requiera red está vetada.

## Superficie de ataque

| Riesgo | Mitigación |
|---|---|
| Otro usuario del dispositivo abre la app | PIN local opcional (BR-26) |
| App comprometida vía XSS | Angular escapa por defecto; no usar `[innerHTML]` salvo en sanitizers explícitos |
| Robo del dispositivo desbloqueado | PIN + futuro WebAuthn/FaceID |
| Backup JSON expuesto | El backup contiene datos sensibles; el usuario decide dónde guardarlo (la app no lo sube a ningún lado) |
| Inspección de IndexedDB en DevTools | Asumido — el dispositivo del usuario es de confianza física |
| Service worker stale | Estrategia de update con versionado del manifest |
| Inyección en imports JSON | Validación estricta de esquema antes de aceptar import |

## Datos sensibles

Todo lo que vive en IndexedDB es sensible:
- Salario, primas, fechas de pago.
- Lista de obligaciones (revela vivienda, vehículo, hábitos).
- Deudas personales (revela red familiar).
- Categorías y montos de gasto.

## PIN local

### Diseño

```typescript
// src/app/core/infra/pin.service.ts
@Injectable({ providedIn: 'root' })
export class PinService {
  private readonly autenticado = signal(false);
  estaAutenticado = computed(() => this.autenticado());

  async habilitarPin(pin: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await this.derive(pin, salt);
    await this.configRepo.set('PinSalt', this.toHex(salt));
    await this.configRepo.set('PinHash', this.toHex(hash));
    await this.configRepo.set('PinHabilitado', 'true');
  }

  async validar(pin: string): Promise<boolean> {
    const saltHex = await this.configRepo.get('PinSalt');
    const hashHex = await this.configRepo.get('PinHash');
    if (!saltHex || !hashHex) return false;
    const salt = this.fromHex(saltHex);
    const computed = await this.derive(pin, salt);
    const ok = this.constantTimeEqual(computed, this.fromHex(hashHex));
    if (ok) this.autenticado.set(true);
    return ok;
  }

  private async derive(pin: string, salt: Uint8Array): Promise<Uint8Array> {
    const enc = new TextEncoder().encode(pin);
    const keyMat = await crypto.subtle.importKey(
      'raw', enc, 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      keyMat, 256
    );
    return new Uint8Array(bits);
  }

  private constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  // toHex / fromHex omitidos
}
```

### Política de intentos

Tres intentos fallidos → cooldown de 30 segundos (visible en UI). Diez intentos consecutivos fallidos → 5 minutos. Sin reset por el momento; la única recuperación es **importar un backup JSON** en una instalación limpia.

### NO usar para datos en reposo

El PIN protege el **acceso a la UI**, no la base de datos. IndexedDB es accesible vía DevTools del navegador. Para el alcance personal del producto eso es aceptable. Si en el futuro el riesgo cambia, se evalúa cifrar el contenido de IndexedDB en reposo con una clave derivada del PIN.

## Biometría (WebAuthn)

Roadmap, no MVP. Diseño preparado:

```typescript
@Injectable({ providedIn: 'root' })
export class BiometricService {
  // v1: solo expone disponibilidad y stub
  esSoportado(): boolean {
    return typeof window !== 'undefined' && 'PublicKeyCredential' in window;
  }

  // v2: registrar credencial vinculada al PIN
  async registrar(): Promise<void> { /* TODO */ }
  async autenticar(): Promise<boolean> { /* TODO */ }
}
```

La biometría desbloquea el PIN guardado de forma envuelta. Implementación queda para v1.1+.

## Sanitización de imports

Cuando el usuario importa un backup JSON, validar estrictamente:

```typescript
import { z } from 'zod'; // o validador propio liviano

const PagoSchema = z.object({
  id: z.string(),
  fecha: z.string().datetime(),
  fuente: z.enum(['Compromiso', 'Deuda']),
  compromisoId: z.string().optional(),
  deudaId: z.string().optional(),
  monto: z.number().int().nonnegative(),
  metodoPago: z.string().optional(),
  comentario: z.string().optional(),
});

const BackupSchema = z.object({
  version: z.number().int().positive(),
  generadoEn: z.string().datetime(),
  datos: z.object({
    config: z.array(z.object({/*…*/})),
    ciclos: z.array(z.object({/*…*/})),
    pagos:  z.array(PagoSchema),
    // …
  }),
});
```

Rechazar import si falla cualquier validación. Mostrar el error de forma legible.

## Política CSP

`index.html` incluye:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; manifest-src 'self'">
```

`connect-src 'self'` evita que cualquier fetch accidental salga del dominio. Si la app intenta llamar a un servidor externo (por error), falla silenciosamente — visible en consola pero no envía datos.

## No telemetría

Cero analytics, cero Sentry, cero pixel de rastreo, cero CDN externo de fonts. Las fuentes (Inter, Material Symbols) se sirven desde el bundle.

## Permisos del navegador

La app solicita:

- **Persistent Storage** (`navigator.storage.persist()`) para evitar que el navegador evicte IndexedDB.
- **Notificaciones locales** (cuando se implemente v1.x).
- **WebAuthn** (v1.x).

No solicita: geolocalización, contactos, cámara, micrófono (aunque podríamos en futuro para captura por voz).

## Auditoría futura

Para v1.0+, considerar:

- Bloqueo automático tras N minutos de inactividad.
- Cifrado en reposo de IndexedDB con `SubtleCrypto` (clave derivada del PIN, datos cifrados por campo).
- Backup cifrado opcional (passphrase distinta del PIN).
- Modo "incógnito": esconde montos en pantalla con un toggle.

## Modelo de amenaza explícito

Asumido como aceptado:

- Dispositivo del usuario es de confianza física en uso normal.
- Sistema operativo no está rooteado/jailbreakeado para uso malicioso.
- El usuario tiene su backup en lugar seguro si lo exporta.

Rechazado (la app no protege contra):

- Forensia avanzada de dispositivo robado y desbloqueado.
- Sistema operativo comprometido a nivel kernel.
- Keylogger del propio dispositivo.
