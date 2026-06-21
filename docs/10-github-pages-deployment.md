# 10 — GitHub Pages Deployment

## Topología

```
Repo: github.com/<user>/finanzas-personales
├── main          (código fuente Angular)
└── gh-pages      (build estático servido por GitHub Pages)
```

GitHub Pages sirve un único bundle estático (HTML + JS + CSS + manifest + service worker). No hay servidor de aplicaciones. Una vez instalada como PWA, **internet ya no es necesario**.

## URL del despliegue

`https://<user>.github.io/finanzas-personales/`

El path `/finanzas-personales/` exige configurar `base href` correctamente.

## Routing en GitHub Pages

GitHub Pages NO soporta SPA fallback nativo: si recargas `/dashboard`, devuelve 404. Dos opciones:

### Opción A — Hash routing (recomendado para v0.1)

En `app.config.ts`:

```typescript
import { provideRouter, withHashLocation } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
  ],
};
```

URLs quedan `https://<user>.github.io/finanzas-personales/#/dashboard`. Funciona sin truco; el navegador siempre carga `index.html` y el router resuelve el hash.

### Opción B — Push-state + 404.html (más limpio)

Configurar `base href="/finanzas-personales/"` en `index.html` y crear un `404.html` que copie `index.html`. GitHub Pages devuelve `404.html` para rutas no encontradas, lo cual carga el shell completo de Angular y deja que el router resuelva la URL real.

```bash
# después de build
cp dist/finanzas-personales/browser/index.html dist/finanzas-personales/browser/404.html
```

Para v0.1 usamos Opción A por simplicidad. Si en v0.5+ se quiere migrar a B, hay un PR de migración aislado.

## Configuración del build

`angular.json`:

```jsonc
{
  "projects": {
    "finanzas-personales": {
      "architect": {
        "build": {
          "options": {
            "outputPath": "dist/finanzas-personales",
            "baseHref": "/finanzas-personales/",
            "serviceWorker": "ngsw-config.json",
            "assets": [
              "src/favicon.ico",
              "src/assets",
              "src/manifest.webmanifest"
            ]
          },
          "configurations": {
            "production": {
              "fileReplacements": [
                { "replace": "src/environments/environment.ts", "with": "src/environments/environment.prod.ts" }
              ],
              "optimization": true,
              "outputHashing": "all",
              "extractLicenses": true,
              "buildOptimizer": true,
              "namedChunks": false,
              "vendorChunk": false
            }
          }
        }
      }
    }
  }
}
```

## GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy PWA to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --watch=false --browsers=ChromeHeadless
      - run: npm run build -- --configuration=production
      - name: Copy 404 fallback (Opción B futura)
        run: cp dist/finanzas-personales/browser/index.html dist/finanzas-personales/browser/404.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/finanzas-personales/browser

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Habilitar Pages

1. Settings → Pages.
2. Source: **GitHub Actions** (no "Deploy from a branch").
3. Custom domain: opcional. Si se configura, recordar actualizar `baseHref` a `/`.

## PWA — manifest

`src/manifest.webmanifest`:

```json
{
  "name": "Finanzas Personales",
  "short_name": "Finanzas",
  "theme_color": "#1F4E78",
  "background_color": "#FAFAFA",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/finanzas-personales/",
  "start_url": "/finanzas-personales/",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "assets/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Service worker (ngsw)

`ngsw-config.json`:

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"
        ]
      }
    }
  ],
  "navigationUrls": [
    "/**",
    "!/**/*.*",
    "!/**/*__*",
    "!/**/*__*/**"
  ]
}
```

No hay `dataGroups` porque NO se cachea API ninguna (no hay API).

## Actualización del SW

En `app.component.ts`:

```typescript
constructor(private swUpdate: SwUpdate) {
  if (swUpdate.isEnabled) {
    swUpdate.versionUpdates
      .pipe(filter(e => e.type === 'VERSION_READY'))
      .subscribe(() => {
        if (confirm('Hay una nueva versión. ¿Recargar?')) {
          location.reload();
        }
      });

    // chequear cada 6h
    setInterval(() => swUpdate.checkForUpdate(), 6 * 60 * 60 * 1000);
  }
}
```

## Probar localmente antes del deploy

```bash
npm run build -- --configuration=production
npx http-server dist/finanzas-personales/browser -p 8080 -c-1
```

Abrir `http://localhost:8080/finanzas-personales/` (respeta el `baseHref`).

## Checklist pre-deploy

- [ ] `npm run lint` sin warnings críticos.
- [ ] `npm run test` verde.
- [ ] Build en `--configuration=production` sin errores.
- [ ] Versión del manifest actualizada.
- [ ] CHANGELOG entry escrita.
- [ ] Tag git creado (`git tag v0.X.Y && git push --tags`).
