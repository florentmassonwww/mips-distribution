# API (apps/api)

The v0.1.0 server, rebuilt from its compiled demo (step 1a) and rewritten as strict TypeScript.
Behaviour is identical to the reference: the characterization suite passes against both.

```bash
npm run start -w @mips/api          # http://localhost:8788, in-memory database, demo data
npm run test:api                    # 52 characterization scenarios against apps/api
npm run typecheck
```

Environment variables: `PORT` (8788), `DB_PATH` (`:memory:`), `SESSION_SECRET` and
`WEBHOOK_SECRET` (generated when absent, never logged), `ACCESS_CODE` (optional gate).
Node 22.13+ runs the `.ts` files directly (type stripping); there is no build step.

## Layout

| Path | Content |
|---|---|
| `src/core/` | Database (node:sqlite, transactions, migrations), identifiers, random source, dates, errors, actors, audit, CSV |
| `src/modules/distribution/` | Settings, counters, exceptions, catalogue, orders, delivery routes, stock, driver sync, dashboard |
| `src/modules/connectors/` | Connector contracts and simulators: payment providers, notification signature, bank statement, accounting software, gate |
| `src/modules/payments/` | Initiation, status, notifications, settlement, refunds, receipt, API view |
| `src/modules/finance/` | Journal, statements, reconciliation, daily close, accounting entries |
| `src/modules/club/` | Members, dues, charges, allocation, member payments, reminders, portal, gate, bank reconciliation, accounting export |
| `src/seed/` | Fictitious demo data |
| `src/http/` | Hono application: middleware, session, guards, one router per area |
| `migrations/` | SQL schema, copied verbatim from v0.1.0 |

## Behaviours a refactor can break silently

The suite compares generated identifiers and full responses. These details are what it holds
fixed; they were reported during the rewrite and must be kept (or changed on purpose, with the
golden files re-recorded and the change explained).

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
- **Route registration order** in `src/http/app.ts` (Hono matches in order; the distribution-only
  and club-only guards precede their routes; the `/api/*` catch-all is last).
- **Clock.** Functions default `now` to `new Date()`; the route summary and the seed rely on that
  default. Offline actions more than 120 s old are flagged offline; device times invalid, in the
  future or older than 7 days fall back to `now`.
- **JSON key order.** Some views spread a row then blank a raw column (`details_json`,
  `totals_json`, `returns_json`, `portal_token` set to `undefined`) to keep the v0.1.0 key order.

## v0.1.0 behaviours kept as is, to change in later steps

See [`REFERENCE-V0.1.0.md`](REFERENCE-V0.1.0.md#comportements-de-la-v010-à-revoir-plus-tard).
The default company settings hard-code demo fees (100, 175, 90, 150 basis points) and a 10-minute
payment attempt time; the simulated connectors themselves have no fee and no delay.
