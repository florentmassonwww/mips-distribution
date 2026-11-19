# Step 1a: readable rewrite of the extracted v0.1.0 server (temporary working notes)

This file is removed when the rewrite is complete.

## Context

The v0.1.0 source code is lost. Its server was extracted mechanically from the compiled demo
(`reference/v0.1.0/app.js`) into `apps/api/src/legacy/*.mjs`: correct but unreadable (minified
names `e`, `t`, `ud`, `_d`…). The characterization suite (`tests/characterization`, 52 scenarios,
706 API calls) proves that `apps/api` behaves exactly like the reference:

```bash
node --no-warnings tests/characterization/run.mjs --target=api           # must print 52/52
node --no-warnings tests/characterization/run.mjs --target=api --only=club   # a subset while working
npx tsc -p apps/api                                                       # must be clean
```

The golden files in `tests/characterization/golden/` are the specification. **Never modify them,
never modify the scenarios or the test harness.**

## Rules for rewriting a legacy module

1. **Behaviour identical, byte for byte.** Same SQL semantics (including `ORDER BY` and ties),
   same JSON keys and values, same HTTP statuses, same error codes, same user-facing messages
   (French, character for character, including non-breaking spaces and typographic quotes), same
   CSV output.
2. **Same random draws, in the same order.** Every `newId(...)`, `newToken()`, `uuidV4()`,
   `randomBytes(n)` call (legacy `Fe`, `M`, `_e`, `ge`) must happen in the same number and order as
   in the legacy code: the suite compares generated identifiers. Do not add, remove, or reorder
   them, not even inside a loop or a conditional.
3. **Same clock semantics.** Keep `now: Date = new Date()` defaults where the legacy code has them
   and pass `now` exactly where the legacy code does.
4. **Readable TypeScript.** Strict mode, meaningful names, small functions where the legacy
   function mixes concerns, explicit row/input types, short English comments explaining *why*
   (business rules), not *what*. ES modules, `.ts` extensions in imports, only erasable syntax
   (no enums, namespaces or parameter properties). Node runs the `.ts` files directly.
5. **Libraries**: import `z` from `"zod"` (4.6.6) and `Hono` / `hono/cookie` from `"hono"` directly.
   The core helpers are in `apps/api/src/core/*.ts` (`db.ts`: `all`, `get`, `run`, `transaction`;
   `ids.ts`, `time.ts`, `errors.ts`, `audit.ts`, `format.ts`, `actor.ts`, `random.ts`); use them,
   never the legacy names. `node:crypto` for `createHash` / `createHmac` / `timingSafeEqual`.
6. **Compatibility while others work in parallel.** Other legacy modules still import your
   module's functions under their compiled names. When you are done, replace your
   `legacy/<module>.mjs` with a re-export of the names listed in your brief, e.g.
   `export { createOrder as ud, … } from "../modules/distribution/orders.ts";`.
   Your new code may import functions of *other* modules from `../../legacy/<other>.mjs` under
   their compiled names (they are being rewritten by someone else; the names are fixed).
7. Commit on your branch when the suite is 52/52 and the typecheck is clean. Small commits are
   fine; the last one must be green.
