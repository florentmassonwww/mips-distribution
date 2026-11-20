# Interface (apps/web)

The v0.1.0 interface (React 19, React Router 7, hash routes), rebuilt from its compiled demo
(step 1b) and rewritten as strict TSX. It renders exactly like the reference: the visual comparison
checks every route at 1280, 1366, 1920 and 390 px, in English and French, pixel for pixel, except
the intended differences listed in `tests/visual/divergences.mjs` (the back office at 390 px: no
horizontal scrolling, the area navigation wraps, wide tables scroll inside their card).

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
| `src/style.css` | Stylesheet of v0.1.0 (minified line), followed by the narrow-screen rules added since |

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

## Intended differences from v0.1.0 (step 1c)

Listed one by one in `tests/visual/divergences.mjs`; every other capture stays identical to v0.1.0.

- **390 px**: the back-office screens no longer scroll sideways (the page column is held to the
  viewport, the area navigation wraps, wide tables scroll inside their card). Desktop is unchanged.
- **Texts**: counts read naturally in both languages (`translateCount`: French singular for 0 and 1,
  English for exactly 1) instead of "(s)" forms, and every text goes through the translation table
  (`npm run test:i18n` fails on a missing or unused entry).
- **Demo banner**: it states a shared demo server whose data is common to every visitor, and has no
  reset button. Resetting stays a platform administrator action (Platform area), stated as applying
  to every user of the server; the browser then forgets its `md_*` keys.
