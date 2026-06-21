# Índice de documentación

| Doc | Tema | Cuándo consultarlo |
|---|---|---|
| [01](./01-product-vision.md) | Product Vision | Antes de tomar cualquier decisión de producto o features |
| [02](./02-domain-model.md) | Domain Model | Cuando trabajes con cualquier entidad financiera |
| [03](./03-business-rules.md) | Business Rules | Antes de implementar o modificar lógica de negocio |
| [04](./04-database-schema.md) | Database Schema (Dexie) | Para añadir/migrar tablas o índices |
| [05](./05-financial-calculations.md) | Financial Calculations | Cuando vayas a implementar o testear una fórmula |
| [06](./06-ui-ux-decisions.md) | UI/UX Decisions | Antes de diseñar una pantalla o componente |
| [07](./07-roadmap.md) | Roadmap | Para entender qué entra en MVP vs evolución |
| [08](./08-changelog.md) | Changelog | Al cerrar cada PR/release |
| [09](./09-security-model.md) | Security Model | Para todo lo relacionado a PIN, biometría, datos privados |
| [10](./10-github-pages-deployment.md) | GitHub Pages Deployment | Para CI/CD y deploy |
| [11](./11-backup-restore.md) | Backup & Restore | Para implementar export/import JSON |
| [12](./12-project-memory.md) | Project Memory | Bitácora del agente: por qué se decidió cada cosa |

## Regla de oro

Cada vez que toques lógica financiera, antes de commit:

```
- [ ] Actualizar docs/03-business-rules.md
- [ ] Actualizar docs/05-financial-calculations.md
- [ ] Anotar en docs/08-changelog.md
- [ ] Registrar decisión en docs/12-project-memory.md
```
