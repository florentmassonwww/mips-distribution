// Characterization suite of v0.1.0.
//   node tests/characterization/run.mjs                 compare every scenario with its golden file
//   node tests/characterization/run.mjs --update        (re)record golden files from the reference
//   node tests/characterization/run.mjs --only=<name>   run matching scenarios only
//   node tests/characterization/run.mjs --print         print transcripts instead of comparing
//   node tests/characterization/run.mjs --target=api    run against the rebuilt server (apps/api)
// The target is the compiled v0.1.0 reference (reference/v0.1.0). The rebuilt server is a second
// target: it is compared with the same golden files, after the intended changes listed in
// evolutions.mjs are applied to them (the golden files themselves are never modified).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { launchReference } from "./lib/reference-client.mjs";
import { launchApi } from "./lib/api-client.mjs";
import { createApi } from "./lib/api.mjs";
import { scenarios } from "./scenarios/index.mjs";
import { evolutionsFor, evolveTranscript } from "./evolutions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const goldenDir = path.join(here, "golden");
const args = process.argv.slice(2);
const update = args.includes("--update");
const print = args.includes("--print");
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const target = args.find((a) => a.startsWith("--target="))?.slice(9) ?? "reference";
if (!["reference", "api"].includes(target)) throw new Error(`unknown target: ${target}`);
if (update && target !== "reference") throw new Error("golden files are recorded from the reference only");

const names = new Set();
for (const s of scenarios) {
  if (names.has(s.name)) throw new Error(`duplicate scenario name: ${s.name}`);
  names.add(s.name);
}
const selected = scenarios.filter((s) => !only || s.name.includes(only));

const seedOf = (name) => [...name].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** First difference between two JSON values, as a readable path. */
function firstDiff(a, b, at = "$") {
  if (isDeepStrictEqual(a, b)) return null;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || a === null || b === null || typeof a !== "object")
    return `${at}: expected ${JSON.stringify(b)?.slice(0, 200)}, got ${JSON.stringify(a)?.slice(0, 200)}`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = firstDiff(a[k], b[k], Array.isArray(a) ? `${at}[${k}]` : `${at}.${k}`);
    if (d) return d;
  }
  return `${at}: differs`;
}

const ref = target === "api" ? await launchApi() : await launchReference();
console.log(`target: ${target === "api" ? "rebuilt server (apps/api)" : "v0.1.0 reference (reference/v0.1.0)"}`);
let failed = 0;
const started = Date.now();
try {
  for (const s of selected) {
    const inst = await ref.open(seedOf(s.name));
    const api = createApi(inst);
    let error = null;
    try {
      await s.run(api);
    } catch (e) {
      error = e;
    }
    await inst.close();
    const file = path.join(goldenDir, `${s.name}.json`);
    const record = { scenario: s.name, description: s.description, transcript: api.transcript };
    if (error) {
      failed++;
      console.log(`✗ ${s.name}\n    ${error.message}`);
      continue;
    }
    if (inst.errors.length) {
      failed++;
      console.log(`✗ ${s.name}\n    page errors: ${inst.errors.join(" | ")}`);
      continue;
    }
    if (print) {
      console.log(JSON.stringify(record, null, 2));
      continue;
    }
    if (update) {
      fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n");
      console.log(`● ${s.name} (${api.transcript.length} steps recorded)`);
      continue;
    }
    if (!fs.existsSync(file)) {
      failed++;
      console.log(`✗ ${s.name}\n    no golden file: run with --update`);
      continue;
    }
    const golden = JSON.parse(fs.readFileSync(file, "utf8"));
    const evolutions = target === "api" ? evolutionsFor(s.name) : [];
    if (evolutions.length) golden.transcript = evolveTranscript(s.name, golden.transcript);
    const diff = firstDiff(record, golden);
    const note = evolutions.length ? `, evolutions: ${evolutions.map((e) => e.id).join(", ")}` : "";
    if (diff) {
      failed++;
      console.log(`✗ ${s.name}${note}\n    ${diff}`);
    } else console.log(`✓ ${s.name} (${api.transcript.length} steps${note})`);
  }
} finally {
  await ref.close();
}
const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${selected.length - failed}/${selected.length} scenarios passed in ${secs}s`);
process.exitCode = failed ? 1 : 0;
