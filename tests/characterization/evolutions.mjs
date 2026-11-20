// Intended changes of the rebuilt server (apps/api) since v0.1.0, applied to the golden
// transcripts before they are compared with apps/api (`--target=api` only). The golden files keep
// recording v0.1.0 as it is, and `--target=reference` still compares them untransformed.
//
// Each evolution names the scenarios it applies to, the step it belongs to, why the response
// changed, and touches only the fields it names. Anything else must still match v0.1.0 exactly.
//
//   { id, step, scenarios: RegExp, reason, entry(entry) → entry }          one transcript entry
//   { id, step, scenarios: RegExp, reason, transcript(entries) → entries } the whole transcript,
//                                                                          for changes that remove
//                                                                          or renumber items

/** v0.1.0 demonstration fees, in basis points (replaced by "to be agreed" in step 2). */
const V010_FEE_BPS = { paystation: 100, card_tpe: 175, juice: 90, link: 150 };
const MODULE_MESSAGE = {
  distribution: "Le module Distribution n'est pas activé pour cette entreprise.",
  club: "Le module Club n'est pas activé pour cette entreprise.",
};

// ───────── helpers ─────────

const isCall = (entry, method, path) =>
  entry.request?.method === method && (path instanceof RegExp ? path.test(entry.request.path) : entry.request.path === path);

/** Calls `fn(object)` on every object (at any depth) that has the property `key`. */
function eachWithKey(value, key, fn) {
  if (Array.isArray(value)) value.forEach((item) => eachWithKey(item, key, fn));
  else if (value && typeof value === "object") {
    if (Object.hasOwn(value, key)) fn(value);
    Object.values(value).forEach((item) => eachWithKey(item, key, fn));
  }
}

/** Renames `from` to `to` in an object, converting the value. */
function rename(object, from, to, convert) {
  const value = object[from];
  delete object[from];
  object[to] = convert(value);
}

const modulesOfVertical = (vertical) => (vertical ? [vertical] : []);

// ───────── evolutions ─────────

export const EVOLUTIONS = [
  // Step 2: module subscriptions replace the company "vertical".
  {
    id: "session-user-modules",
    step: 2,
    scenarios: /^(session-anonymous|platform-suspend-company)$/,
    reason: "The session user carries the active modules of its company (user.modules) instead of user.vertical.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/session") && entry.response?.user) rename(entry.response.user, "vertical", "modules", modulesOfVertical);
      return entry;
    },
  },
  {
    id: "demo-users-modules",
    step: 2,
    scenarios: /^session-anonymous$/,
    reason: "Demo users show their company's modules (company_modules) instead of company_vertical.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/demo/users")) entry.response.forEach((user) => rename(user, "company_vertical", "company_modules", modulesOfVertical));
      return entry;
    },
  },
  {
    id: "platform-companies-modules",
    step: 2,
    scenarios: /^platform-companies$/,
    reason: "The platform's company list shows each company's modules instead of its vertical.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/platform/companies")) entry.response.forEach((company) => rename(company, "vertical", "modules", modulesOfVertical));
      return entry;
    },
  },
  {
    id: "company-created-audit-modules",
    step: 2,
    scenarios: /^platform-companies$/,
    reason:
      "The company.created audit details record the modules the company starts with. (The v0.1.0 `vertical` field is still accepted on creation, so the requests are unchanged.)",
    entry(entry) {
      if (isCall(entry, "GET", "/api/platform/audit")) {
        entry.response.filter((row) => row.action === "company.created").forEach((row) => rename(row.details, "vertical", "modules", modulesOfVertical));
      }
      return entry;
    },
  },
  {
    id: "admin-subscription-modules",
    step: 2,
    scenarios: /^admin-settings-methods$/,
    reason: "The company's subscription in the settings lists its modules instead of its vertical.",
    entry(entry) {
      if (isCall(entry, "GET", "/api/admin/settings") && entry.response?.subscription) {
        rename(entry.response.subscription, "vertical", "modules", modulesOfVertical);
      }
      return entry;
    },
  },
  {
    id: "module-not-enabled",
    step: 2,
    scenarios: /^verticals-separated$/,
    reason: "A module route called by a company without that module is refused with 403 module_not_enabled (was wrong_vertical).",
    entry(entry) {
      const error = entry.response?.error;
      if (entry.status === 403 && error?.code === "wrong_vertical") {
        const module = error.message.includes("distribution") ? "distribution" : "club";
        entry.response.error = { code: "module_not_enabled", message: MODULE_MESSAGE[module] };
      }
      return entry;
    },
  },
];

/** The evolutions that apply to a scenario, in order. */
export const evolutionsFor = (scenario) => EVOLUTIONS.filter((evolution) => evolution.scenarios.test(scenario));

/** Golden transcript of a scenario as apps/api is expected to answer it (a transformed copy). */
export function evolveTranscript(scenario, transcript) {
  let entries = structuredClone(transcript);
  for (const evolution of evolutionsFor(scenario)) {
    if (evolution.transcript) entries = evolution.transcript(entries);
    if (evolution.entry) entries = entries.map((entry) => evolution.entry(entry));
  }
  return entries;
}

export { V010_FEE_BPS, eachWithKey, isCall };
