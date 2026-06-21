# 02 — Domain Model

Las entidades se conservan del Excel V2 + extensiones para predicción.

## Diagrama lógico

```
Config (clave-valor)
   │
   │   CicloActivo, IngresoBase, FondoOperativo, Umbrales
   │
Ciclo ──────────────► Ingreso (CicloID)
   │             ┌──► Gasto   (CicloID)
   │             │
   │             └──► Compromiso (Periodo = CicloID)
   │                       │
   │                       │ ObligacionID
   │                       ▼
   │                  Obligacion (catálogo)
   │
   │                  Compromiso ◄──── Pago (CompromisoID o DeudaID)
   │                                     ▲
   │                  Deuda  ────────────┘
   │
   └────► Plan ────► PlanItem ──► (Compromiso | Deuda)

Escenario (independiente)
```

## Entidades

### `Config` (key-value)

| Parametro | Tipo | Default | Notas |
|---|---|---|---|
| `IngresoBase` | number | — | Salario neto |
| `FondoOperativo` | number | 1500000 | Reserva intocable |
| `CicloActivo` | string | null | CicloID en curso |
| `MonedaSimbolo` | string | "COP" | |
| `UmbralVerde` | number | 1500000 | DLR ≥ este → VERDE |
| `UmbralAmarillo` | number | 500000 | DLR ≥ este → AMARILLO |
| `UmbralNFModerada` | number | 0 | NF ≤ este → Sin Necesidad |
| `UmbralNFCritica` | number | 1500000 | NF > este → Requiere Crédito |
| `PinHabilitado` | boolean | false | |
| `PinHash` | string | "" | Hash PBKDF2 del PIN |
| `BiometricoHabilitado` | boolean | false | Para v2 |
| `Modo` | enum | "SIMPLE" | "SIMPLE" \| "COMPLETO" — modo de onboarding |
| `FrecuenciaPago` | enum | "QUINCENAL" | "QUINCENAL" \| "MENSUAL" \| "VARIABLE" |
| `Tema` | enum | "AUTO" | "CLARO" \| "OSCURO" \| "AUTO" |

### `Ciclo`

```typescript
export interface Ciclo {
  id: string;                  // C001, C002, ... o UUID
  fechaPago: Date;
  estado: 'Abierto' | 'Cerrado';
  notas?: string;
  // No persistir fechaFin: se deriva del siguiente ciclo
}
```

### `Ingreso`

```typescript
export interface Ingreso {
  id: string;
  fecha: Date;
  tipo: 'Salario' | 'Prima' | 'Vacaciones' | 'Bonificacion' | 'Extraordinario' | 'Otro';
  valor: number;
  estado: 'Esperado' | 'Confirmado' | 'Recibido' | 'Cancelado';
  cicloId: string;
  observaciones?: string;
}
```

### `Obligacion` (catálogo maestro)

```typescript
export interface Obligacion {
  id: string;
  nombre: string;
  tipo: 'Arriendo' | 'ServicioPublico' | 'TarjetaCredito' | 'CreditoVehiculo'
       | 'PrestamoPersona' | 'Mascotas' | 'Alimentacion' | 'Otro';
  prioridad: 'A' | 'B' | 'C' | 'D';
  recurrente: boolean;
  activa: boolean;
  valorEsperadoTipico?: number;     // hint para crear próximo compromiso
}
```

### `Compromiso` (instancia de obligación por ciclo)

```typescript
export interface Compromiso {
  id: string;
  obligacionId: string;
  periodo: string;                  // CicloID
  valorProyectado: number;
  valorReal: number;
  fechaVencimiento: Date;
  // Derivados (NO persistidos; calculados en runtime)
  // valorPagado = sum(pagos where compromisoId)
  // saldoPendiente = valorReal - valorPagado
  // vigencia = Pagado | Vencido | Corriente
  // estado = Pagado | Parcial | Pendiente
}
```

### `Pago` (movimiento — historial inmutable)

```typescript
export interface Pago {
  id: string;
  fecha: Date;
  fuente: 'Compromiso' | 'Deuda';
  compromisoId?: string;            // si fuente=Compromiso
  deudaId?: string;                 // si fuente=Deuda
  monto: number;
  metodoPago?: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro';
  comentario?: string;
}
```

### `Gasto` (consumo del ciclo)

```typescript
export interface Gasto {
  id: string;
  fecha: Date;
  categoria: 'Mercado' | 'Gasolina' | 'Restaurante' | 'Efectivo'
            | 'Mascotas' | 'Transporte' | 'Salud' | 'Otro';
  valor: number;
  comentario?: string;
  cicloId: string;
}
```

### `Deuda` (préstamo personal)

```typescript
export interface Deuda {
  id: string;
  persona: string;
  valorOriginal: number;
  prioridad: 'A' | 'B' | 'C' | 'D';
  observaciones?: string;
  // Derivados:
  // valorPagado = sum(pagos where deudaId)
  // saldoPendiente = valorOriginal - valorPagado
}
```

### `Plan` (cabecera de plan de acción)

```typescript
export interface Plan {
  id: string;
  nombre: string;
  cicloId: string;
  fechaCreacion: Date;
  objetivo?: 'LIQUIDEZ' | 'REDUCIR_DEUDA' | 'CUBRIR_VENCIDAS' | 'PERSONALIZADO';
  estado: 'Borrador' | 'Aplicado' | 'Descartado';
}
```

### `PlanItem` (item dentro de un plan)

```typescript
export interface PlanItem {
  id: string;
  planId: string;
  ordenPago: number;
  fuente: 'Compromiso' | 'Deuda';
  compromisoId?: string;
  deudaId?: string;
  pagoPropuesto: number;
  // Derivados:
  // saldoActual, saldoResultante, acumulado, dlrSiSeEjecuta, esEjecutable
}
```

### `Escenario`

```typescript
export interface Escenario {
  id: string;
  nombre: string;
  ingresoEstimado: number;
  asunciones?: {
    recibirPrima?: boolean;
    recibirVacaciones?: boolean;
    ajusteGastos?: number;     // %
  };
  observaciones?: string;
}
```

## Invariantes

1. Un `Pago` siempre referencia exactamente UNO de `compromisoId` o `deudaId`, no ambos ni ninguno.
2. Un `Compromiso` siempre pertenece a un único `Ciclo` (no se mueve entre ciclos; si cambias de mes, se crea nuevo Compromiso).
3. `Pago.monto > 0`.
4. `sum(Pago.monto where compromisoId=X) ≤ Compromiso.valorReal` — el sistema valida antes de guardar.
5. `sum(Pago.monto where deudaId=Y) ≤ Deuda.valorOriginal`.
6. Un `Ciclo` solo puede estar `Abierto` si todos los ciclos con fecha posterior están `Abierto` o no existen.
7. `Config.CicloActivo` debe apuntar a un Ciclo existente en estado `Abierto`.

## Eventos del dominio (para auditoría futura)

No persistir aún, pero la arquitectura los contempla:

- `CicloAbierto`, `CicloCerrado`
- `IngresoRecibido`, `IngresoCancelado`
- `CompromisoCreado`, `CompromisoPagado`, `CompromisoVencido`
- `PagoRegistrado`
- `PlanAplicado`, `PlanDescartado`

## Cardinalidades

```
Ciclo 1──N Ingreso
Ciclo 1──N Gasto
Ciclo 1──N Compromiso
Ciclo 1──N Plan

Obligacion 1──N Compromiso
Compromiso 1──N Pago
Deuda      1──N Pago
Plan       1──N PlanItem
```
