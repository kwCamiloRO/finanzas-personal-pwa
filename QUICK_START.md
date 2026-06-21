# Quick Start

## Pre-requisitos

- Node.js 20+
- npm 10+

## Correr localmente

```bash
cd pwa-angular
npm install
npm start
```

Abre `http://localhost:4200` en el navegador. La app arranca con el seed inicial (parámetros vacíos, sin ciclo activo). Primer paso desde la app:

1. Ir a **Configuración** (icono ⚙ arriba a la derecha) → poner Ingreso base, Fondo Operativo, frecuencia de pago, umbrales.
2. Ir a **Ciclos** → crear el primer ciclo con fecha de pago y marcarlo como activo.
3. Registrar un **Ingreso** tipo `Salario` con estado `Recibido` para ese ciclo.
4. (Opcional) Agregar **Obligaciones** del catálogo.
5. Empezar a capturar **Gastos** rápidos desde el FAB.

El Dashboard recalcula todos los indicadores en vivo.

## Probar como PWA (instalable)

```bash
npm run build:prod
npx http-server dist/finanzas-personales/browser -p 8080
```

Abre `http://localhost:8080/finanzas-personales/` en Chrome/Safari/Edge móvil → menú → "Agregar a inicio". La app queda instalada y funciona sin conexión.

## Tests en iPhone (LAN)

```bash
npm start
```

En la misma red WiFi, abre `http://<IP-PC>:4200` desde Safari del iPhone. Para que iOS permita "Agregar a inicio" con SW activo necesitas servir por HTTPS (no en dev). Usa el flujo de producción local de arriba con un túnel HTTPS si quieres probar instalación:

```bash
npx serve -s dist/finanzas-personales/browser -l 8443 --ssl-cert ... --ssl-key ...
```

O, más simple, despliega a GitHub Pages (HTTPS automático) y prueba desde ahí.

## Deploy a GitHub Pages

1. Push el código a un repo en GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Push a `main` dispara el workflow `.github/workflows/deploy.yml` y publica en `https://<usuario>.github.io/<repo>/`.
4. Actualiza `angular.json` `baseHref` si el nombre del repo cambia.

## Estructura

```
pwa-angular/
├── docs/                  ← documentación oficial (12 archivos)
├── src/
│   ├── app/
│   │   ├── core/          ← dominio, data (Dexie), servicios, infra
│   │   ├── shared/        ← pipes, componentes reutilizables
│   │   ├── features/      ← dashboard, cycles, incomes, expenses, obligations, settings
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   └── app.component.{ts,html,scss}
│   ├── environments/
│   ├── styles.scss
│   ├── manifest.webmanifest
│   ├── index.html
│   └── main.ts
├── ngsw-config.json       ← service worker
├── angular.json
├── package.json
├── tsconfig*.json
└── .github/workflows/deploy.yml
```

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm start` | Dev server con HMR en localhost:4200 |
| `npm run build` | Build de producción (default config) |
| `npm run build:prod` | Idem, explícito |
| `npm run watch` | Build incremental sin servidor |
| `npm test` | Tests con Karma (cuando los agregues) |
| `npm run ng -- generate component ...` | Generador de Angular CLI |

## Reset rápido

Si quieres limpiar IndexedDB y volver al estado inicial: Configuración → "Borrar todo".

## Si algo no compila

- Verifica que tienes Node ≥ 20: `node -v`.
- Borra `node_modules` y `package-lock.json`, vuelve a `npm install`.
- Si Angular CLI no se encuentra: `npm i -g @angular/cli@18`.
