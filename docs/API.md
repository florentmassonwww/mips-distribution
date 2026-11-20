# API (apps/api)

The v0.1.0 server, rebuilt from its compiled demo (step 1a) and rewritten as strict TypeScript.
Behaviour is identical to the reference except for the intended changes of later steps, listed in
[`tests/characterization/evolutions.mjs`](../tests/characterization/evolutions.mjs): the
characterization suite passes against both, the rebuilt server after those transformations.

```bash
npm run start -w @mips/api          # http://localhost:8788, in-memory database, demo data
npm run test:api                    # 52 characterization scenarios against apps/api (with evolutions)
npm run test:api-unit               # API tests of step 2 and later (tests/api, node:test, in-process)
npm run typecheck
```

Environment variables: `PORT` (8788), `DB_PATH` (`:memory:`), `SESSION_SECRET` and
`WEBHOOK_SECRET` (generated when absent, never logged), `ACCESS_CODE` (optional gate).
Node 22.13+ runs the `.ts` files directly (type stripping); there is no build step.

## Layout

| Path | Content |
|---|---|
| `src/core/` | Database (node:sqlite, transactions, migrations), identifiers, random source, dates, errors, actors, audit, CSV |
| `src/core/modules.ts` | Module catalogue (`distribution`, `club`, in display order) and the company subscriptions (`company_modules`) |
| `src/core/sites.ts` | Sites of a company (store, warehouse, depot): validation, unique code, parent rule, audit |
| `src/modules/distribution/` | Settings, counters, exceptions, catalogue, orders, delivery routes, stock, driver sync, dashboard |
| `src/modules/connectors/` | Connector contracts and simulators: payment providers, notification signature, bank statement, accounting software, gate |
| `src/modules/payments/` | Initiation, status, notifications, settlement, refunds, receipt, API view |
| `src/modules/finance/` | Journal, statements, reconciliation, daily close, accounting entries |
| `src/modules/club/` | Members, dues, charges, allocation, member payments, reminders, portal, gate, bank reconciliation, accounting export |
| `src/seed/` | Fictitious demo data (modules of each company and the depots use fixed identifiers: no random draw) |
| `src/http/` | Hono application: middleware, session, role and module guards, one router per area |
| `migrations/` | SQL schema: `001`–`002` copied verbatim from v0.1.0, then one file per step (`003_modules_sites.sql`) |

## Modules

A company subscribes to business modules (`company_modules`; a row means the module is active).
The v0.1.0 `companies.vertical` column is kept but no longer read or written.

- **Rule.** Every route of a module refuses a signed-in user whose company has not enabled it:
  `403 module_not_enabled`, « Le module Distribution n'est pas activé pour cette entreprise. » (or
  Club). The guard is `session.requireModule(code)`; anonymous and platform users go through it and
  the route's role guard answers them (401, 403 `forbidden`).
- **Order of checks, as in v0.1.0.** Distribution areas (`DISTRIBUTION_PATHS` in `src/http/app.ts`:
  `/api/agent/*`, `/api/centrale/*`, `/api/payments[/*]`, `/api/chain/*`, `/api/invoices/*` and the
  distribution finance routes) check the module first, before authentication and roles. Club routes
  (`/api/club/*`) use `requireModuleRole("club", …roles)`: authentication, role and suspension
  first, then the module.
- **No module.** A company may have none: only administration (`/api/admin/*`) and audit stay open.
  Deactivating a module deletes nothing.
- **Platform.** `GET /api/platform/companies` lists `modules`; `POST` takes `modules` (at least one,
  default `["distribution"]`; the v0.1.0 field `vertical` is still accepted when `modules` is
  absent); `PUT /api/platform/companies/:id/modules` replaces the set (known codes, no duplicates,
  may be empty), audited `company.modules_updated` with `{ before, after }`.
- **Sites.** `GET/POST /api/admin/sites`, `PATCH /api/admin/sites/:id` (company admin only, audited
  `site.created` / `site.updated`).

## Behaviours a refactor can break silently

The suite compares generated identifiers and full responses. These details are what it holds
fixed; they were reported during the rewrite and must be kept (or changed on purpose, with the
change described in `tests/characterization/evolutions.mjs`; the golden files keep recording v0.1.0).

- **Random draws.** Every `newId`, `newToken`, `uuidV4`, `randomBytes` call happens in a fixed
  number and order, including inside loops and conditionals. Examples: `addRouteStop` draws an id
  even when the insert is ignored; `queueErpEntry` draws one even for a duplicate; in order and
  sale loops, an unknown product fails before its line id is drawn; on invoice creation the
  invoice id is drawn before its number; in the club, a member id is drawn before its portal token.
- **Ordering.** `ORDER BY …, rowid` tie-breakers are part of the output. A few queries rely on
  SQLite's natural order (stops rebuilt from `SELECT DISTINCT`, vehicle stock at route close,
  receipt payments by `created_at` only).
- **Derived references.** Simulated provider references are `<PREFIX>-DEMO-` + the first
  10 hex characters of `sha256("<companyId>:<idempotencyKey>")`; refunds `RF-DEMO-…`, accounting
  entries `ERP-DEMO-…`. The refund key is `<paymentId>:<refunded amount before this refund>`.
- **Signatures.** Notifications and gate readers use `t=<unix seconds>,v1=<hex HMAC-SHA256 of
  "<t>.<body>">`, 300 s tolerance; a gate reader secret is `HMAC(sessionSecret, "gate:<deviceId>")`.
- **Session cookies.** `md_session` (HttpOnly, SameSite=Strict, Max-Age 12 h) and `md_gate`
  (SameSite=Lax) are `base64url(JSON)` + `.` + HMAC-SHA256 signature.
- **Route registration order** in `src/http/app.ts` (Hono matches in order; the Distribution module
  guards precede their routes; the `/api/*` catch-all is last).
- **Clock.** Functions default `now` to `new Date()`; the route summary and the seed rely on that
  default. Offline actions more than 120 s old are flagged offline; device times invalid, in the
  future or older than 7 days fall back to `now`.
- **JSON key order.** Some views spread a row then blank a raw column (`details_json`,
  `totals_json`, `returns_json`, `portal_token` set to `undefined`) to keep the v0.1.0 key order.

## v0.1.0 behaviours kept as is, to change in later steps

See [`REFERENCE-V0.1.0.md`](REFERENCE-V0.1.0.md#comportements-de-la-v010-à-revoir-plus-tard).
The default company settings keep a 10-minute payment attempt time; the simulated connectors
themselves have no fee and no delay.

Since step 2 the provider fees are **to be agreed**: `feeBps` is `null` by default (0–1000 once set
by the company admin). While it is null, a payment's expected fee is 0 with
`payments.fee_expected_known = 0` (exposed next to `fee_expected_minor` in the journal, the
reconciliation lines and the order chain), no fee-variance exception is raised, and the demo bank
statements charge no fee. The CSV exports print the expected fee as 0.00 in that case.
