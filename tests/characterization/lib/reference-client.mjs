// Drives the compiled v0.1.0 reference through its own API, inside a headless Chromium page.
// Determinism: the clock is frozen at a fixed instant and only moves when the runner advances it,
// and crypto.getRandomValues / Math.random are replaced by a seeded generator, so identifiers,
// tokens and timestamps are identical from one run to the next.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const HARNESS = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "reference-harness.html")).href;

/** Demo-day instant used by every scenario: Saturday 17 October 2026, 08:00 in Mauritius. */
export const T0 = "2026-10-17T04:00:00.000Z";

// Seeded PRNG installed before the bundle runs. The seed changes per scenario.
const seedScript = (seed) => {
  let s = seed >>> 0;
  const next = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = next;
  const fill = (arr) => {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(next() * 256);
    return arr;
  };
  Object.defineProperty(crypto, "getRandomValues", { value: fill, configurable: true });
  Object.defineProperty(crypto, "randomUUID", {
    value: () => {
      const b = fill(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64;
      b[8] = (b[8] & 63) | 128;
      const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    },
    configurable: true,
  });
};

export async function launchReference() {
  const browser = await chromium.launch();
  return {
    browser,
    /** Opens a fresh, isolated reference instance (new storage, freshly seeded database). */
    async open(seed) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => {
        // The UI mount is expected to fail: the harness page has no #root element.
        if (!/createRoot|Target container is not a DOM element|React error #299/i.test(e.message)) errors.push(e.message);
      });
      await page.clock.install({ time: new Date(T0) });
      await page.clock.pauseAt(new Date(T0));
      await page.addInitScript(seedScript, seed);
      await page.goto(HARNESS);
      await page.waitForFunction(() => typeof window.fetch === "function" && window.fetch.toString().includes("api"), null, {
        timeout: 30000,
      });
      return {
        errors,
        async request(method, url, body, headers) {
          return page.evaluate(
            async ({ method, url, body, headers }) => {
              const init = { method, headers: { ...headers } };
              if (body !== undefined) {
                init.body = typeof body === "string" ? body : JSON.stringify(body);
                if (typeof body !== "string") init.headers["Content-Type"] = "application/json";
              }
              const res = await fetch(url, init);
              const type = res.headers.get("content-type") ?? "";
              const text = await res.text();
              let data = text;
              if (type.includes("json")) {
                try {
                  data = JSON.parse(text);
                } catch {
                  /* keep text */
                }
              }
              return { status: res.status, type: type.split(";")[0], data };
            },
            { method, url, body, headers },
          );
        },
        async advance(ms) {
          await page.clock.runFor(ms);
        },
        async close() {
          await context.close();
        },
      };
    },
    close: () => browser.close(),
  };
}
