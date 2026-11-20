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
npm run test:e2e                      # build, then the browser checks of step 2 (tests/e2e/check.mjs)
```

## Layout

| Path | Content |
|---|---|
| `src/main.tsx` | Entry point: styles, demo reset shim, application |
| `src/shell/` | Routes, role and module guard, area layout and navigation (per role and enabled modules), demo home page, public payment page, access gate |
| `src/i18n/` | French → English table, language storage (`md_lang`), `translate`, `translateCount` |
| `src/shared/` | API client (CSRF header), data hook with polling, formatting, labels, module catalogue (`modules.ts`), offline storage, common components |
| `src/field/` | Driver screen (mobile): routes, stops, delivery and proof, payment collection, receipt, on-the-spot sale, offline queue |
| `src/centrale/` | Dispatch: dashboard, orders, order chain, routes, loading, stock |
| `src/finance/` | Exceptions, journal, invoices, reconciliation and statement import, daily close, accounting entries |
| `src/admin/`, `src/platform/` | Company users, sites (`Sites.tsx`), settings, audit log; platform companies and their modules |
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

## Modules, sites and fees to be agreed (step 2)

- **Modules.** The session carries `user.modules` (catalogue order: `distribution`, `club`). An area
  of a module (`/centrale`, `/finance`, `/terrain` for Distribution; `/club`, `/club/accueil` for
  Club) is guarded by `RequireRole module=…`: a company without the module gets the server's refusal
  text (« Le module … n'est pas activé pour cette entreprise. ») instead of the page, and the page's
  requests are never sent. The navigation (`navigationFor` in `shell/areas.ts`) lists the groups of
  each enabled module, in catalogue order, then the administration for the company administrator;
  a company with both modules shows both. The home of a profile (`homePathFor`) is that of the first
  enabled module serving the role; without any, `/admin/utilisateurs` for the administrator and no
  "resume my area" link for the others. Administration and audit stay open whatever the modules.
- **Names.** The ClubOS brand and the club role names are used in the club area and, outside it, for
  a company that runs the Club module alone (as v0.1.0 did for a club); otherwise MIPS Distribution.
- **Home page.** One badge per enabled module on each company card (« Aucun module » when none).
- **Platform.** Each company row lists its modules and has a « Modules » action: a dialog with one
  checkbox per module (keyboard: focus on the first checkbox, Space toggles, Escape cancels, focus
  back to the button), the change written next to each box (« sera retiré » / « sera activé »), and a
  confirmation when a module is removed (data kept, access closed until it is enabled again). It
  calls `PUT /api/platform/companies/:id/modules`; success or the server's error is toasted. The
  creation form chooses the modules with checkboxes (at least one, Distribution by default) and sends
  `modules`.
- **Sites** (`/admin/etablissements`, « Établissements » in the administration navigation): list,
  creation and edition in one form (type Magasin / Entrepôt / Dépôt, code, name, address, time zone,
  parent site, status), deactivation and reactivation per row. The server's refusals (code taken,
  invalid parent, invalid data) are shown next to the form and toasted.
- **Settings.** The subscription card lists the enabled modules. A fee left empty is « à convenir »
  (`feeBps: null`); a figure is typed in basis points, shown as a percentage.
- **Fees to be agreed.** Wherever an expected fee is shown (journal, order chain, reconciliation
  lines, daily close), a payment with `fee_expected_known = 0` reads « à convenir » instead of an
  amount. The daily close totals do not carry that flag: the screen reads it from the journal for the
  payments confirmed that day.

Intended differences from v0.1.0 for step 2, declared in `tests/visual/divergences.mjs` with the
reason "modules, sites and fees to be agreed (step 2)": the administration link added to every screen
of a company administrator, the platform companies screen, the settings, and the screens where an
expected fee now reads « à convenir ». The Sites screen does not exist in v0.1.0: `tests/e2e/check.mjs`
covers it, with the module access checks, at 1366 and 390 px in English and French (no horizontal
overflow, no console error).
