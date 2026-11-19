// Drives the rebuilt server (apps/api) in-process, with the same determinism as the reference:
// Date frozen at T0 and advanced by the runner, random bytes from the same seeded generator.
import FakeTimers from "@sinonjs/fake-timers";
import { T0 } from "./reference-client.mjs";

const ORIGIN = "http://offline.local";

/** Same byte generator as the reference harness (mulberry32, one byte per draw). */
function seeded(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (buf) => {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(next() * 256);
    return buf;
  };
}

export async function launchApi() {
  const { createInstance } = await import("../../../apps/api/src/app.mjs");
  const { randomBytes, setRandomGenerator } = await import("../../../apps/api/src/core/random.ts");
  const random = { bytes: randomBytes, setGenerator: setRandomGenerator };
  return {
    async open(seed) {
      const clock = FakeTimers.install({ now: new Date(T0), toFake: ["Date"] });
      random.setGenerator(seeded(seed));
      // Keep both random sequences aligned with the reference page, which shares one seeded generator
      // between crypto.getRandomValues and Math.random: React and the SQLite wrapper call
      // Math.random 3 times at load, the SQLite WebAssembly engine then draws 1024 bytes, and the
      // page calls Math.random once more after every request that changed the database (to stamp
      // its local save), including the initial seed. These draws do not affect the server under test.
      random.bytes(3 + 1024);
      const instance = await createInstance();
      const totalChanges = () => Number(instance.db.prepare("SELECT total_changes() AS n").get().n);
      random.bytes(1);
      let baseline = totalChanges();
      const jar = new Map();
      return {
        errors: [],
        async request(method, url, body, headers) {
          const h = new Headers(headers);
          if (body !== undefined && typeof body !== "string") h.set("Content-Type", "application/json");
          if (jar.size) h.set("Cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
          const res = await instance.app.fetch(
            new Request(ORIGIN + url, { method, headers: h, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) }),
          );
          for (const c of res.headers.getSetCookie()) {
            const [pair, ...attrs] = c.split(";");
            const i = pair.indexOf("=");
            const name = pair.slice(0, i).trim();
            const value = pair.slice(i + 1).trim();
            const expired = attrs.some((a) => /max-age=0/i.test(a.trim()) || (/^expires=/i.test(a.trim()) && new Date(a.split("=")[1]) <= new Date()));
            if (!value || expired) jar.delete(name);
            else jar.set(name, value);
          }
          const changes = totalChanges();
          if (changes !== baseline) {
            random.bytes(1);
            baseline = changes;
          }
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
        async advance(ms) {
          clock.tick(ms);
        },
        async close() {
          instance.db.close();
          random.setGenerator(null);
          clock.uninstall();
        },
      };
    },
    close: async () => {},
  };
}
