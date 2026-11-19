// Replaces generated identifiers and tokens by stable placeholders, numbered by first appearance
// in a scenario, so that two implementations generating different random values can be compared.
// Fixed demo identifiers (co_bd, u_bd_agent1, …) and all business values are kept as they are.

const PATTERNS = [
  // Public links: the reference rewrites them to its own page URL ("…/reference-harness.html#/payer/<token>"),
  // a server answers with its origin ("http://host:port/payer/<token>"). Both become "<origin>/payer/<token#n>".
  { re: /(?:file:\/\/\S*?\.html#|https?:\/\/[a-z0-9.:-]+)\/(payer|membre)\/([A-Za-z0-9_-]{16,})/g, kind: () => "link", replace: (m, p) => `<origin>/${m[1]}/${p("token", m[2])}` },
  // Prefixed identifiers: `${prefix}_${20 hex}` (ord_…, rte_…, pay_…, usr_…).
  { re: /\b([a-z]{1,8})_[0-9a-f]{20}\b/g, kind: (m) => m[1] },
  // UUID v4.
  { re: /\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/g, kind: () => "uuid" },
  // Simulated provider references: PS-DEMO-1A2B3C4D5E, LNK-DEMO-…, JC-DEMO-….
  { re: /\b([A-Z]{2,5})-DEMO-[0-9A-F]{6,}\b/g, kind: (m) => `ref-${m[1]}` },
  // Hexadecimal signatures and secrets (64 hex).
  { re: /\b[0-9a-f]{64}\b/g, kind: () => "hex" },
];

// Keys whose values are random tokens without a recognisable shape.
const TOKEN_KEYS = new Set(["link_token", "linkToken", "portal_token", "portalToken", "token"]);

export function createNormalizer() {
  const seen = new Map();
  const counters = new Map();
  const placeholder = (kind, raw) => {
    const key = `${kind}:${raw}`;
    if (!seen.has(key)) {
      const n = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, n);
      seen.set(key, `<${kind}#${n}>`);
    }
    return seen.get(key);
  };
  const tokens = new Map();
  const tokenOf = (kind, raw) => {
    if (!tokens.has(raw)) tokens.set(raw, placeholder(kind, raw));
    return tokens.get(raw);
  };
  const str = (s) => {
    const apply = (out, { re, kind, replace }) =>
      out.replace(re, (...args) => {
        const m = args.slice(0, -2);
        if (replace) return replace(m, (k, raw) => tokenOf(k, raw));
        return placeholder(kind(m), m[0]);
      });
    // Links first (they carry the page URL), then known tokens, then identifiers.
    let out = apply(s, PATTERNS[0]);
    for (const t of tokens.keys()) if (out.includes(t)) out = out.split(t).join(tokens.get(t));
    for (const p of PATTERNS.slice(1)) out = apply(out, p);
    return out;
  };
  const walk = (v, key) => {
    if (typeof v === "string") {
      if (TOKEN_KEYS.has(key) && v.length >= 12) {
        return tokenOf("token", v);
      }
      return str(v);
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") {
      // First pass registers tokens so they are also replaced inside URLs and messages.
      for (const [k, x] of Object.entries(v)) if (TOKEN_KEYS.has(k) && typeof x === "string" && x.length >= 12) walk(x, k);
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    }
    return v;
  };
  return { value: (v) => walk(v, null), path: (p) => str(p) };
}
