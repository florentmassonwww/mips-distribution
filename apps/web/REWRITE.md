# Step 1b: readable rewrite of the extracted v0.1.0 interface (temporary working notes)

This file is removed when the rewrite is complete.

## Context

The v0.1.0 interface was extracted mechanically from the compiled demo into
`apps/web/src/legacy/*.js`: correct but unreadable (minified names, `q.jsx(...)` calls instead of
JSX). The visual comparison (`tests/visual`) proves that the rebuilt interface renders exactly like
the reference: every route, at 1280, 1366, 1920 and 390 px, in English and French, pixel for pixel.

```bash
npm run build -w @mips/web                                        # required before each visual run
node --no-warnings tests/visual/run.mjs --only=centrale --widths=1366,390   # a subset while working
node --no-warnings tests/visual/run.mjs                           # everything (288 screenshots)
npx tsc -p apps/web                                               # must be clean
```

Reference screenshots are cached in `tests/visual/.reference-cache/` (shared, read-mostly): a run
only re-captures the rebuilt side. Differences are written to `tests/visual/output/` (reference,
rebuilt and diff images): look at them, they show exactly what changed.

`tests/visual`, `reference/` and `apps/api` are out of scope: never modify them. The visual
comparison is the specification.

## Rules for rewriting a legacy module

1. **Rendering identical, pixel for pixel**: same DOM structure where it affects layout, same CSS
   class names (the stylesheet `src/style.css` is unchanged), same texts, same element order, same
   attributes that affect rendering or accessibility (`aria-*`, `role`, `title`, `alt`, `type`).
2. **Behaviour identical**: same API calls (method, URL, body, headers), same state transitions,
   same keyboard handling, same `localStorage` keys and formats (`md_*`), same timers and polling
   intervals.
3. **Translations**: user-facing texts stay in French in the code and go through the translation
   function (legacy `K(...)`); the French → English table is `legacy/i18n.js` (`D_`). Do not
   rephrase any text: identical strings, including punctuation, spaces and quotes.
4. **Readable TSX**: function components with props interfaces, meaningful names, JSX instead of
   `q.jsx(...)`, hooks named `useXxx`, small components where the legacy one mixes concerns, short
   English comments on *why* (business rules, accessibility), strict TypeScript (no `any`, no
   `@ts-ignore`). Imports use `.ts`/`.tsx` extensions.
5. **Libraries**: `react`, `react-router-dom` (`HashRouter`, `Routes`, `Route`, `Link`, `NavLink`,
   `Navigate`, `useNavigate`, `useParams`, `useSearchParams`), `qrcode` directly; never through
   `legacy/lib.js`.
6. **Compatibility while others work in parallel.** Other legacy modules still import your
   module's exports under their compiled names. When you are done, replace your
   `legacy/<module>.js` with a re-export of the names listed in your brief, e.g.
   `export { Badge as Q } from "../shared/Badge.tsx";`. Your new code may import from other
   legacy modules under their compiled names (they are being rewritten by someone else).
7. Commit on your branch when the visual comparison of your screens is identical and the
   typecheck is clean; run the full comparison (all screens) once before your last commit.
