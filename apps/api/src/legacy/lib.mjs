// Library bindings used by the extracted v0.1.0 code (step 1a, stage 2).
/* eslint-disable */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import { random } from "../runtime.mjs";

// node:crypto in place of the bundled pure-JS SHA-256 / HMAC.
const me = (alg) => createHash(alg);
const he = (alg, key) => createHmac(alg, key);
// Random bytes go through the runtime source (crypto.getRandomValues, seedable in tests).
const ge = (n) => random.bytes(n);
const ve = (a, b) => timingSafeEqual(a, b);
// node:sqlite in place of the bundled SQLite WebAssembly build.
function je(file) {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  return db;
}
// Hono and its cookie helpers.
const Zt = Hono;
const re = (c, name) => getCookie(c, name);
const ie = (c, name, value, opts) => setCookie(c, name, value, opts);
const ae = (c, name, opts) => deleteCookie(c, name, opts);
// Zod 4 builders, under the names the compiled code uses.
const V = (p) => z.string(p);
const H = (shape, p) => z.object(shape ?? {}, p);
const Ql = (p) => z.number(p);
const yu = (e, p) => z.enum(e, p);
const cu = (e, p) => z.array(e, p);
const nu = (p) => z.boolean(p);
const jl = (p) => z.email(p);
const iu = () => z.unknown();
const du = (o, p) => z.union(o, p);
const xu = (v, p) => z.literal(v, p);
const _u = (a, b, p) => (!b || !b._zod ? z.record(z.string(), a, b) : z.record(a, b, p));
const Fl = (p) => z.url(p);
const hu = (items, rest, p) => z.tuple(items, rest, p);
const ol = z.ZodError;

export { me, he, ge, ve, je, Zt, re, ie, ae, V, H, Ql, yu, cu, nu, jl, iu, du, xu, _u, Fl, hu, ol };
