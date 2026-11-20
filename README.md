# MIPS Business Suite

Multi-company platform that adds business modules to MIPS merchants, connected to the my.mips.mu back office. First module: **Distribution** (route delivery and collection on delivery), with the **Club** module carried over from v0.1.0.

Demo only: no real connector, no real payment.

The work is delivered step by step, one branch and one pull request per step.

## Repository

| Path | Content |
|---|---|
| `reference/v0.1.0/` | Compiled v0.1.0 demo, kept as the behaviour reference (its source code is lost). See [`reference/README.md`](reference/README.md). |
| `apps/api/` | API rebuilt from v0.1.0 in TypeScript (Hono, SQLite). See [`docs/API.md`](docs/API.md). |
| `apps/web/` | Interface rebuilt from v0.1.0 in TSX (React, Vite): back office and driver screen. See [`docs/WEB.md`](docs/WEB.md). |
| `packages/core/` | Business rules as pure functions (`@mips/core`), applied by `apps/api`; 30 acceptance scenarios in `test/`. See [`docs/ETAPE-3-CORE.md`](docs/ETAPE-3-CORE.md) and [`docs/CAHIER-DE-RECETTE.md`](docs/CAHIER-DE-RECETTE.md). |
| `packages/connectors/`, `packages/ui/` | Created empty, filled in later steps. |
| `tests/visual/` | Pixel comparison of every screen with the reference (4 widths, English and French). |
| `tests/characterization/` | 52 scenarios replayed against the reference and against `apps/api`; recorded responses in `golden/`. See [`docs/REFERENCE-V0.1.0.md`](docs/REFERENCE-V0.1.0.md). |

## Run the tests

Node 22.13 or later.

```bash
npm ci
npx playwright install chromium
npm test           # typecheck, translations, acceptance scenarios, the suite against the reference and apps/api, API and browser tests
```
