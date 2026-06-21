# 06 — UI/UX Decisions

## Principios

1. **Mobile/iPhone First.** Diseño primero para 390×844 px (iPhone 14), después tablet/desktop.
2. **Una mano, un pulgar.** Acciones primarias en zona inferior; nada crítico en el área superior.
3. **Captura en ≤3 toques.** Gasto, ingreso o pago deben registrarse en menos de tres taps desde el dashboard.
4. **Pantallas que responden, no que cuentan.** El dashboard responde a "¿cómo estoy?". No muestra tablas; muestra estado.
5. **Cero estados vacíos huérfanos.** Si no hay datos, hay onboarding o un CTA.
6. **Densidad calibrada.** Una métrica grande > tres métricas medianas > diez números pequeños.

## Sistema de diseño

Angular Material como base + tokens propios.

### Tokens de color (semáforos)

```scss
// styles/_tokens.scss
$verde-50:  #E8F5E9;
$verde-500: #2E7D32;
$amar-50:   #FFF8E1;
$amar-500:  #F57F17;
$rojo-50:   #FFEBEE;
$rojo-500:  #C62828;

$bg-light:  #FAFAFA;
$bg-dark:   #121212;

// Spacing escalado
$sp-1: 4px;
$sp-2: 8px;
$sp-3: 12px;
$sp-4: 16px;
$sp-6: 24px;
$sp-8: 32px;
```

### Tipografía

- `Inter` (default web font del sistema) + fallback a `-apple-system, BlinkMacSystemFont`.
- Escala compacta:
  - Display: 36/40
  - Title L: 24/28
  - Title M: 18/22
  - Body: 16/22
  - Caption: 12/16

### Componentes recurrentes

- **MetricCard**: tarjeta con label arriba, número grande en el centro, delta + icono debajo. Variantes verde/amarillo/rojo/neutro.
- **TrafficLight**: indicador circular con texto. Usa los tres colores semáforo.
- **CurrencyInput**: campo numérico con formato COP en vivo, parseo flexible.
- **QuickCaptureFab**: FAB inferior derecho que abre un bottom-sheet con tres botones: Gasto / Ingreso / Pago.
- **CyclePicker**: selector horizontal scrollable de ciclos, con el activo en el centro.
- **EmptyState**: mensaje + ilustración + CTA.

## Navegación

### Bottom navigation (siempre visible salvo en onboarding/modales)

5 ítems:

```
🏠 Inicio   |   💰 Gastos   |   ✚ Capturar   |   📅 Ciclos   |   ⚙ Más
```

- **Inicio**: Dashboard.
- **Gastos**: lista de gastos del ciclo (filtros rápidos).
- **Capturar**: FAB central elevado → bottom sheet con 3 opciones.
- **Ciclos**: lista de ciclos + métricas históricas.
- **Más**: drawer con Obligaciones, Compromisos, Pagos, Deudas, Planes, Escenarios, Proyecciones, Reportes, Configuración.

### Sin tabs en lugares donde se necesite atención

El dashboard NO tiene tabs internos. Es scroll vertical con secciones autocontenidas.

## Dashboard — layout

Mobile (390 ancho):

```
┌─────────────────────────────────────────┐
│ Buen día, [nombre]   Ciclo C002 · día 5 │
│ ────────────────────────────────────── │
│                                         │
│   DINERO LIBRE REAL                     │
│   $3.244.200             🟢 VERDE      │
│   Tendencia: ↗ MEJORANDO               │
│                                         │
│ ────────────────────────────────────── │
│ HOY                                     │
│ Puedes gastar ~$324.420                 │
│ Vas en $200.000 (62% del límite)        │
│ ────────────────────────────────────── │
│ PRÓXIMO PAGO  · 10 días                 │
│ Salario esperado $6.776.200             │
│ ────────────────────────────────────── │
│ ⚠ 2 OBLIGACIONES VENCIDAS  $695.000     │
│   [Cubrir ahora]                        │
│ ────────────────────────────────────── │
│ COMPROMISOS CORRIENTES (4)              │
│   Lista de cards con saldo y vencimiento│
│ ────────────────────────────────────── │
│ RECOMENDACIONES DEL SISTEMA (3)         │
│   Cards con acción sugerida + impacto   │
│ ────────────────────────────────────── │
│ INDICADORES                             │
│   Cobertura · Dependencia · Riesgo      │
└─────────────────────────────────────────┘
       [Bottom nav fija]
```

Tablet/desktop: grid de 2-3 columnas con las mismas cards.

## Captura rápida

FAB central → bottom sheet:

```
┌─────────────────────┐
│                     │
│   ¿Qué registras?   │
│                     │
│  💸 Gasto           │
│  💵 Ingreso         │
│  ✅ Pago             │
│                     │
└─────────────────────┘
```

### Form de Gasto (1 pantalla)

```
┌─────────────────────────────┐
│ Gasto rápido           ✕   │
│                             │
│ Monto                       │
│ $ [   4.000   ]             │
│                             │
│ Categoría                   │
│ [Mercado] [Gasolina] [Café] │
│ [Otros chips...]            │
│                             │
│ Nota (opcional)             │
│ [                       ]   │
│                             │
│      [ Guardar ]            │
└─────────────────────────────┘
```

- Tres taps: FAB → "Gasto" → "Guardar" (con valor y categoría tocados en medio).
- Por defecto: Fecha = hoy, Ciclo = activo.

### Form de Pago

Mismo patrón. Pre-selecciona compromiso/deuda si se entró desde el contexto correspondiente.

## Onboarding (7 pasos)

Cada paso = una pantalla full-screen con progress bar arriba. Las respuestas pueden saltarse (excepto pasos 1 y 2).

### Paso 1 — Modo

```
¿Qué necesitas hoy?
( ) Solo gastos
( ) Control financiero completo
(•) Comenzar simple y crecer después
   ↳ Equivale a "Solo gastos" y desbloquea funciones gradualmente.

  [Continuar]
```

### Paso 2 — Ingreso base

```
¿Cuál es tu ingreso típico por pago?
$ [   6.776.200   ]

Esto no se comparte ni sube a internet.

  [Continuar]
```

### Paso 3 — Frecuencia

```
¿Cada cuánto recibes pago?
( ) Mensual
(•) Quincenal
( ) Variable
   ↳ La app aprenderá del patrón observado.

  [Continuar] [Omitir]
```

### Paso 4 — Obligaciones recurrentes

Lista con sugerencias clickables (Arriendo, Servicios, Internet, Tarjeta, Vehículo). Tap para agregar; cada una pide nombre + valor típico + prioridad.

```
  [+ Agregar otra]
  [Continuar]   [Omitir y agregar después]
```

### Paso 5 — Deudas

Igual que paso 4 pero para Deudas personales.

### Paso 6 — Fondo operativo

```
¿Cuánto necesitas reservar siempre intocable?
$ [   1.500.000   ]
Esto es lo que dejas para alimentación, gasolina, imprevistos.
  [Continuar]
```

### Paso 7 — Diagnóstico inicial

Pantalla que calcula DLR estimado con los datos ingresados y muestra el primer Estado Financiero. Botón "Entrar a mi dashboard".

## Estados vacíos

Cuando un módulo no tiene datos:

- **Compromisos sin datos**: "Aún no has registrado compromisos para este ciclo. [Agregar el primero]"
- **Gastos sin datos**: "Tu ciclo está limpio. [Registrar un gasto]"
- **Deudas sin datos**: "Sin deudas registradas. ¡Bien por ti! [Agregar si tienes alguna]"
- **Reportes sin historial**: "Necesitas cerrar al menos 1 ciclo para ver tendencias."

## Animaciones y feedback

- Transiciones de 200ms cubic-bezier(0.4, 0.0, 0.2, 1).
- Al guardar un gasto: vibración corta (si soporta), toast "Gasto guardado", DLR del dashboard se anima al nuevo valor.
- Al pasar de VERDE → AMARILLO: notificación visual no intrusiva ("Tu estado cambió a AMARILLO").
- Pull-to-refresh en dashboard: recalcula y muestra timestamp del último recálculo.

## Accesibilidad

- Targets touch ≥ 44×44 px.
- Color no es la única señal: cada semáforo incluye texto y/o ícono.
- Contraste mínimo 4.5:1 para texto, 3:1 para iconos.
- Soporte `prefers-color-scheme` para tema automático.
- Soporte `prefers-reduced-motion` para animaciones.

## Modo oscuro

Por defecto sigue el sistema. Override en Configuración. Paleta oscura mantiene los tres semáforos pero con saturación reducida.

## Densidad responsive

| Breakpoint | Layout | Bottom nav |
|---|---|---|
| < 600px | 1 columna | visible |
| 600–960px | 2 columnas, dashboard en grid | visible |
| ≥ 960px | sidebar a la izquierda + 2 columnas | oculto, drawer permanente |

## iconografía

Material Symbols (variable font). Subset: arrow_upward, arrow_downward, add, edit, delete, warning, check_circle, error, account_balance, payments, savings, trending_up, trending_down, calendar_today.

## Errores de UX a evitar

- ❌ Mostrar tablas vacías al usuario nuevo.
- ❌ Pedir más de 4 datos en una sola pantalla de captura.
- ❌ Esconder el indicador de estado financiero principal.
- ❌ Usar diálogos modales para confirmaciones triviales.
- ❌ Tabs dentro del dashboard.
