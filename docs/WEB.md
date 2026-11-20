# Interface (apps/web)

The v0.1.0 interface (React 19, React Router 7, hash routes), rebuilt from its compiled demo
(step 1b) and rewritten as strict TSX. It renders exactly like the reference: the visual comparison
checks every route at 1280, 1366, 1920 and 390 px, in English and French, pixel for pixel.

```bash
npm run build                         # builds apps/web/dist
npm run start -w @mips/api            # http://localhost:8788 serves the API and the built interface
npm run dev -w @mips/web              # development server on :5173, /api proxied to :8788
npm run test:visual                   # build, then the 288-screenshot comparison with the reference
```

## Layout

| Path | Content |
|---|---|
| `src/main.tsx` | Entry point: styles, demo reset shim, application |
| `src/shell/` | Routes, role guard, area layout and navigation, demo home page, public payment page, access gate |
| `src/i18n/` | French → English table, language storage (`md_lang`), `translate`, `translateCount` |
| `src/shared/` | API client (CSRF header), data hook with polling, formatting, labels, offline storage, common components |
| `src/field/` | Driver screen (mobile): routes, stops, delivery and proof, payment collection, receipt, on-the-spot sale, offline queue |
| `src/centrale/` | Dispatch: dashboard, orders, order chain, routes, loading, stock |
| `src/finance/` | Exceptions, journal, invoices, reconciliation and statement import, daily close, accounting entries |
| `src/admin/`, `src/platform/` | Company users, settings, audit log; platform companies |
| `src/club/` | Club dashboard, members, dues, reminders, payments, reconciliation, export, gate, front desk, member portal, demo banner |
| `src/style.css` | Stylesheet, unchanged from v0.1.0 |

## Behaviours a refactor can break silently

Reported during the rewrite; the visual comparison and the API calls hold them fixed.

- **Texts.** User-facing texts are French in the code and go through `translate`; the English table
  is keyed by the exact French string. Label tables are translated once at module load (the language
  switch reloads the page). JSX text nodes and separators (`" · "`) are written to produce the same DOM.
  Counts use `translateCount(count, oneFr, otherFr, ...args)`: French takes the singular for 0 and 1,
  English only for 1; both French forms are keys of the table. `npm run test:i18n` fails when a text
  passed to `translate`/`translateCount` has no entry, or an entry is no longer used.
- **Class names** used by the stylesheet, including trailing spaces in `badge ${kind}`.
- **API client.** Every call sends `X-Requested-With: mips-distribution` (CSRF guard of the API).
- **Offline storage** (JSON in `localStorage`): `md_queue_<userId>` (queued actions, key order part
  of the sent payload), `md_bundle_<routeId>`, `md_route_<userId>`, `md_force_offline` (and the
  `md-network` window event), `md_lang`. The demo reset forgets every `md_*` key except `md_lang`.
- **Driver screen.** Sync immediately and every 20 s while online; receipt polled every 2.5 s in the
  payment panel; payment idempotency key `<attempt id>-<method>`, renewed only after an accepted
  attempt; signature sent as a PNG data URL.
- **Routes** in `shell/AppRoutes.tsx` keep the v0.1.0 order (`/club/accueil` before `/club/*`).

## v0.1.0 behaviours kept for parity, to change in later steps

- At 390 px the back-office screens overflow horizontally (about 850 px in English, 1,160 px in
  French), as in v0.1.0. The requirement is no horizontal scrolling at 390 px.
- The demo banner says "Offline demo · data stays in this browser": true of the v0.1.0 offline demo,
  not of the served application.
- The banner's Reset button (`POST /api/offline/reset`, demo mode only, rate-limited) restores the
  demo data for every user of the server, where v0.1.0 reset only the visitor's browser.
