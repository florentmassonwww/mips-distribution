// Visual comparison of the rebuilt interface (apps/web + apps/api) with the v0.1.0 reference.
//   node tests/visual/run.mjs                       every screen, 4 widths, EN and FR
//   node tests/visual/run.mjs --only=centrale       screens whose name contains "centrale"
//   node tests/visual/run.mjs --widths=1366         one width
// Requires the built interface: npm run build -w @mips/web.
// Both sides run with the same frozen clock and the same demo data. A screen passes when the two
// full-page screenshots have the same size and no differing pixel (colour tolerance 0.05 on
// pixelmatch's scale, which absorbs anti-aliasing noise only). Differences are written to
// tests/visual/output/ (ignored by git): reference, rebuilt and diff images.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import FakeTimers from "@sinonjs/fake-timers";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import crypto from "node:crypto";
import { SCREENS } from "./screens.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const outDir = path.join(here, "output");
// Reference screenshots never change while reference/v0.1.0 and the screen definition do not:
// they are cached (key: reference bundle hash + screen definition + language + width).
const cacheDir = path.join(here, ".reference-cache");
const referenceHash = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "reference/v0.1.0/app.js"))).digest("hex").slice(0, 16);
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const widths = (args.find((a) => a.startsWith("--widths="))?.slice(9) ?? "1280,1366,1920,390").split(",").map(Number);
const langs = (args.find((a) => a.startsWith("--langs="))?.slice(8) ?? "en,fr").split(",");
const HEIGHT = { 1280: 720, 1366: 768, 1920: 1080, 390: 844 };
const T0 = "2026-10-17T04:00:00.000Z";
const SEED = 20261017;

const webDist = path.join(root, "apps", "web", "dist");
if (!fs.existsSync(path.join(webDist, "index.html"))) throw new Error("build the interface first: npm run build -w @mips/web");

// ── Rebuilt side: apps/api in this process, Date frozen at T0, seeded random (same draws as the reference page).
function seeded(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, fill: (buf) => { for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(next() * 256); return buf; } };
}
const clock = FakeTimers.install({ now: new Date(T0), toFake: ["Date"] });
const { setRandomGenerator, randomBytes } = await import(pathToFileURL(path.join(root, "apps/api/src/core/random.ts")).href);
const { createInstance } = await import(pathToFileURL(path.join(root, "apps/api/src/app.ts")).href);
const { serve } = await import("@hono/node-server");
const { serveStatic } = await import("@hono/node-server/serve-static");
const { Hono } = await import("hono");
setRandomGenerator(seeded(SEED).fill);
randomBytes(3 + 1024); // draws made by the reference page before its server starts (see the characterization client)
const instance = await createInstance();
randomBytes(1);
const site = new Hono();
site.all("/api/*", (c) => instance.app.fetch(c.req.raw));
site.use("/*", serveStatic({ root: path.relative(process.cwd(), webDist) || "." }));
const server = await new Promise((resolve) => {
  const s = serve({ fetch: site.fetch, port: 0 }, () => resolve(s));
});
const rebuiltUrl = `http://localhost:${server.address().port}/`;
const referenceUrl = pathToFileURL(path.join(root, "reference/v0.1.0/index.html")).href;

// Same page-side determinism on both sides: frozen clock and seeded Math.random / crypto.
const pageSeed = (seed) => {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = next;
  Object.defineProperty(crypto, "getRandomValues", {
    value: (a) => { const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = 0; i < b.length; i++) b[i] = Math.floor(next() * 256); return a; },
    configurable: true,
  });
};

const browser = await chromium.launch();

/** Advances the page clock, and the server clock on the rebuilt side, by the same amount. */
async function advance(page, baseUrl, ms) {
  // The reference serves its API inside the page, after the page clock has moved: move the
  // server clock first so the rebuilt side answers with the same time.
  if (baseUrl === rebuiltUrl) clock.tick(ms);
  await page.clock.runFor(ms);
}

async function capture(baseUrl, screen, width, lang) {
  if (baseUrl === rebuiltUrl) clock.setSystemTime(new Date(T0));
  const context = await browser.newContext({ viewport: { width, height: HEIGHT[width] ?? 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.clock.install({ time: new Date(T0) });
  await page.clock.pauseAt(new Date(T0));
  await page.addInitScript(pageSeed, SEED);
  await page.addInitScript((l) => localStorage.setItem("md_lang", l), lang);
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.querySelector("#root")?.children.length > 0, null, { timeout: 30000 });
  const ctx = await screen.prepare?.(page) ?? {};
  const signIn = async () => {
    if (!screen.as) return;
    const r = await page.evaluate(async (userId) => {
      const res = await fetch("/api/demo/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Requested-With": "mips-distribution" }, body: JSON.stringify({ userId }) });
      return res.status;
    }, screen.as);
    if (r !== 200) throw new Error(`login ${screen.as}: ${r}`);
  };
  await signIn();
  const hash = typeof screen.path === "function" ? await screen.path(page, ctx) : screen.path;
  // Reload so the app reads the new session, wait for the home page to show it, then navigate
  // inside the app as a user would (a cold load on a guarded route can race the session check).
  const needsSession = screen.as && !hash.startsWith("/membre/") && !hash.startsWith("/payer/");
  for (let attempt = 1; ; attempt++) {
    await page.reload();
    await page.waitForFunction(() => document.querySelector("#root")?.children.length > 0, null, { timeout: 30000 });
    await advance(page, baseUrl, 2000);
    if (!needsSession) break;
    const signedIn = await page
      .waitForFunction(() => /Signed in|Connecté/.test(document.body.innerText), null, { timeout: 30000 })
      .then(() => true, () => false);
    if (signedIn) break;
    // The reference keeps its session cookie in localStorage and occasionally loses it on reload.
    await signIn();
    if (attempt === 3) { const dbg = await page.evaluate(async () => ({ s: (await (await fetch("/api/session")).json()).user?.id, hash: location.hash, text: document.body.innerText.slice(0, 600) })); throw new Error(`${screen.name}: session not shown after 3 reloads (${baseUrl.slice(0, 16)}) ${JSON.stringify(dbg)}`); }
  }
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForFunction((h) => location.hash === `#${h}`, hash);
  // Wait until no loading placeholder is left and the page height is stable.
  await page.waitForFunction(() => !/Chargement…|Loading…/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  // Stable when height and text are unchanged over three consecutive checks.
  let last = "", stable = 0;
  for (let i = 0; i < 60 && stable < 3; i++) {
    await page.waitForTimeout(200);
    const h = await page.evaluate(() => document.documentElement.scrollHeight + ":" + document.body.innerText);
    stable = h === last ? stable + 1 : 0;
    last = h;
  }
  if (screen.act) await screen.act(page);
  const png = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await context.close();
  return { png: PNG.sync.read(png), errors, overflow };
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const selected = SCREENS.filter((s) => !only || s.name.includes(only));
let failed = 0, total = 0;
const notes = [];
try {
  for (const screen of selected) {
    for (const lang of langs) {
      for (const width of widths) {
        total++;
        const id = `${screen.name}.${lang}.${width}`;
        const key = crypto.createHash("sha256").update([referenceHash, screen.name, String(screen.as), String(screen.path), String(screen.act ?? ""), lang, width].join("|")).digest("hex").slice(0, 20);
        const cached = path.join(cacheDir, `${id}.${key}.json`);
        let ref;
        if (fs.existsSync(cached)) {
          const c = JSON.parse(fs.readFileSync(cached, "utf8"));
          ref = { png: PNG.sync.read(Buffer.from(c.png, "base64")), errors: c.errors, overflow: c.overflow };
        } else {
          ref = await capture(referenceUrl, screen, width, lang);
          fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(cached, JSON.stringify({ png: PNG.sync.write(ref.png).toString("base64"), errors: ref.errors, overflow: ref.overflow }));
        }
        // Compare; on a difference, capture the rebuilt side once more: Chromium occasionally
        // renders a few pixels differently in the overflowing area of a page (seen at 390 px).
        const compare = (neu) => {
          const problems = [];
          if (neu.errors.length) problems.push(`console errors: ${neu.errors.join(" | ").slice(0, 200)}`);
          if (ref.png.width !== neu.png.width || ref.png.height !== neu.png.height) {
            problems.push(`size ${neu.png.width}×${neu.png.height}, reference ${ref.png.width}×${ref.png.height}`);
            return { problems, diff: null };
          }
          const diff = new PNG({ width: ref.png.width, height: ref.png.height });
          const n = pixelmatch(ref.png.data, neu.png.data, diff.data, ref.png.width, ref.png.height, { threshold: 0.05 });
          if (n) problems.push(`${n} differing pixels`);
          return { problems, diff: n ? diff : null };
        };
        let neu = await capture(rebuiltUrl, screen, width, lang);
        let { problems, diff } = compare(neu);
        if (problems.length) {
          neu = await capture(rebuiltUrl, screen, width, lang);
          ({ problems, diff } = compare(neu));
        }
        if (diff) fs.writeFileSync(path.join(outDir, `${id}.diff.png`), PNG.sync.write(diff));
        if (neu.overflow > 0) notes.push(`${id}: horizontal overflow ${neu.overflow}px (reference: ${ref.overflow}px)`);
        if (problems.length) {
          failed++;
          fs.writeFileSync(path.join(outDir, `${id}.reference.png`), PNG.sync.write(ref.png));
          fs.writeFileSync(path.join(outDir, `${id}.rebuilt.png`), PNG.sync.write(neu.png));
          console.log(`✗ ${id}: ${problems.join("; ")}`);
        } else console.log(`✓ ${id}`);
      }
    }
  }
} finally {
  await browser.close();
  server.close();
  clock.uninstall();
}
if (notes.length) console.log("\nNotes:\n" + notes.map((n) => "  " + n).join("\n"));
console.log(`\n${total - failed}/${total} screenshots identical`);
process.exitCode = failed ? 1 : 0;
