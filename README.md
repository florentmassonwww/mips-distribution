# MIPS Business Suite

Multi-company platform that adds business modules to MIPS merchants, connected to the my.mips.mu back office. First module: **Distribution** (route delivery and collection on delivery), with the **Club** module carried over from v0.1.0.

Demo only: no real connector, no real payment.

The work is delivered step by step, one branch and one pull request per step.

## Repository

| Path | Content |
|---|---|
| `reference/v0.1.0/` | Compiled v0.1.0 demo, kept as the behaviour reference (its source code is lost). See [`reference/README.md`](reference/README.md). |
| `tests/characterization/` | 52 scenarios replayed against the reference; recorded responses in `golden/`. See [`docs/REFERENCE-V0.1.0.md`](docs/REFERENCE-V0.1.0.md). |

## Run the tests

Node 22.13 or later.

```bash
npm ci
npx playwright install chromium
npm test
```
