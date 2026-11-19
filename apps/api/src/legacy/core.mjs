// GENERATED (step 1a, stage 2): v0.1.0 "core" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TypeScript in the following commits.
/* eslint-disable */
import { ge } from "./lib.mjs";

function _e() {
  let e = ge(16);
  e[6] = e[6] & 15 | 64, e[8] = e[8] & 63 | 128;
  let t = e.toString(`hex`);
  return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`;
}
var ye = `-- MIPS Distribution : schéma initial. Tous les montants sont en cents (entiers). Toute table métier porte company_id.

CREATE TABLE companies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  currency TEXT NOT NULL DEFAULT 'MUR',
  plan TEXT NOT NULL DEFAULT 'pilote', subscription_status TEXT NOT NULL DEFAULT 'essai', subscription_renews_at TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id), name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('platform_admin','company_admin','dispatcher','finance','agent')),
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);

CREATE TABLE counters (company_id TEXT NOT NULL, name TEXT NOT NULL, value INTEGER NOT NULL, PRIMARY KEY (company_id, name));

-- ───────── Référentiel ─────────
CREATE TABLE price_lists (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL);
CREATE TABLE customers (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), code TEXT NOT NULL, name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '', zone TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
  price_list_id TEXT REFERENCES price_lists(id), active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE products (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), sku TEXT NOT NULL, name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'casier', price_minor INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE price_list_items (
  price_list_id TEXT NOT NULL REFERENCES price_lists(id), product_id TEXT NOT NULL REFERENCES products(id), price_minor INTEGER NOT NULL,
  PRIMARY KEY (price_list_id, product_id)
);

-- ───────── Tournées et stocks ─────────
CREATE TABLE routes (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL, day TEXT NOT NULL,
  agent_id TEXT REFERENCES users(id), vehicle TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','loaded','in_progress','closed')),
  started_at TEXT, closed_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE route_stops (
  id TEXT PRIMARY KEY, route_id TEXT NOT NULL REFERENCES routes(id), company_id TEXT NOT NULL, customer_id TEXT NOT NULL REFERENCES customers(id),
  seq INTEGER NOT NULL, UNIQUE (route_id, customer_id)
);
CREATE TABLE warehouse_stock (company_id TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id), qty INTEGER NOT NULL, PRIMARY KEY (company_id, product_id));
CREATE TABLE vehicle_stock (
  route_id TEXT NOT NULL REFERENCES routes(id), product_id TEXT NOT NULL REFERENCES products(id), company_id TEXT NOT NULL,
  loaded_qty INTEGER NOT NULL DEFAULT 0, qty INTEGER NOT NULL DEFAULT 0, returned_qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, product_id)
);
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, product_id TEXT NOT NULL, route_id TEXT,
  type TEXT NOT NULL, qty INTEGER NOT NULL, ref TEXT, note TEXT, actor TEXT NOT NULL, at TEXT NOT NULL
);
CREATE INDEX idx_movements ON stock_movements (company_id, at);

-- ───────── Commandes, livraisons, factures ─────────
CREATE TABLE orders (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), number TEXT NOT NULL, customer_id TEXT NOT NULL REFERENCES customers(id),
  route_id TEXT REFERENCES routes(id), kind TEXT NOT NULL CHECK (kind IN ('preorder','route_sale')),
  status TEXT NOT NULL CHECK (status IN ('confirmed','prepared','loaded','delivered','partially_delivered','refused','cancelled')),
  note TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL, delivered_at TEXT,
  UNIQUE (company_id, number)
);
CREATE TABLE order_lines (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), company_id TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id),
  qty_ordered INTEGER NOT NULL, qty_delivered INTEGER NOT NULL DEFAULT 0, unit_price_minor INTEGER NOT NULL
);
CREATE TABLE deliveries (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id), route_id TEXT NOT NULL, agent_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('full','partial','refused')), reason TEXT NOT NULL DEFAULT '',
  returns_json TEXT NOT NULL DEFAULT '[]', returns_minor INTEGER NOT NULL DEFAULT 0,
  pod_name TEXT NOT NULL DEFAULT '', pod_signature TEXT, pod_note TEXT NOT NULL DEFAULT '',
  at TEXT NOT NULL, synced_at TEXT NOT NULL, offline INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE invoices (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), number TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  customer_id TEXT NOT NULL, route_id TEXT, agent_id TEXT, currency TEXT NOT NULL,
  amount_minor INTEGER NOT NULL, paid_minor INTEGER NOT NULL DEFAULT 0, refunded_minor INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','pending','to_verify','partially_paid','paid','failed','refunded')),
  issued_at TEXT NOT NULL, UNIQUE (company_id, number)
);

-- ───────── Paiements ─────────
-- Une ligne par tentative. « confirmed » = confirmé par le prestataire ; le règlement en banque est suivi à part (settlement_status).
-- Aucune donnée de carte n'est stockée : seule la référence du prestataire l'est.
CREATE TABLE payments (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), invoice_id TEXT NOT NULL REFERENCES invoices(id), order_id TEXT NOT NULL,
  agent_id TEXT, method TEXT NOT NULL CHECK (method IN ('paystation','card_tpe','juice','link')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','to_verify','confirmed','failed','refunded')),
  refunded_minor INTEGER NOT NULL DEFAULT 0, provider_ref TEXT, idempotency_key TEXT NOT NULL, link_token TEXT UNIQUE,
  presentation_json TEXT NOT NULL DEFAULT '{}', failure_reason TEXT, verify_reason TEXT,
  fee_expected_minor INTEGER NOT NULL DEFAULT 0, fee_actual_minor INTEGER,
  settlement_status TEXT NOT NULL DEFAULT 'unsettled' CHECK (settlement_status IN ('unsettled','settled')), settled_at TEXT, bank_line_id TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT, confirmed_at TEXT, confirmed_via TEXT,
  UNIQUE (company_id, idempotency_key)
);
CREATE UNIQUE INDEX idx_payments_ref ON payments (method, provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX idx_payments_invoice ON payments (invoice_id);

-- Notifications reçues des prestataires : la clé (provider, event_id) rend le traitement idempotent.
CREATE TABLE payment_events (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_id TEXT NOT NULL, company_id TEXT, payment_id TEXT, type TEXT NOT NULL,
  payload_json TEXT NOT NULL, result TEXT NOT NULL, received_at TEXT NOT NULL, UNIQUE (provider, event_id)
);

-- État interne des prestataires SIMULÉS (adaptateurs de démonstration uniquement).
CREATE TABLE demo_provider_tx (
  provider_ref TEXT PRIMARY KEY, method TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL,
  status TEXT NOT NULL, refunded_minor INTEGER NOT NULL DEFAULT 0, last_event_json TEXT, created_at TEXT NOT NULL
);

-- ───────── Banque, exceptions, ERP, clôture ─────────
CREATE TABLE bank_statements (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, filename TEXT NOT NULL, imported_by TEXT NOT NULL, imported_at TEXT NOT NULL,
  line_count INTEGER NOT NULL, matched_count INTEGER NOT NULL, skipped_count INTEGER NOT NULL
);
CREATE TABLE bank_lines (
  id TEXT PRIMARY KEY, statement_id TEXT NOT NULL REFERENCES bank_statements(id), company_id TEXT NOT NULL, line_hash TEXT NOT NULL,
  value_date TEXT NOT NULL, reference TEXT NOT NULL, label TEXT NOT NULL, gross_minor INTEGER NOT NULL, fee_minor INTEGER NOT NULL, net_minor INTEGER NOT NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('matched','unmatched','amount_mismatch','duplicate')), payment_id TEXT,
  UNIQUE (company_id, line_hash)
);
CREATE TABLE exceptions (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, domain TEXT NOT NULL CHECK (domain IN ('ops','finance')), type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')), entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  message TEXT NOT NULL, details_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL,
  resolution TEXT, resolution_note TEXT, resolved_by TEXT, resolved_at TEXT
);
CREATE INDEX idx_exceptions ON exceptions (company_id, status, domain);
CREATE TABLE erp_entries (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, kind TEXT NOT NULL, entity_id TEXT NOT NULL, label TEXT NOT NULL, amount_minor INTEGER NOT NULL,
  payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','failed')),
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, external_ref TEXT, created_at TEXT NOT NULL, synced_at TEXT,
  UNIQUE (company_id, kind, entity_id)
);
CREATE TABLE daily_closes (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, day TEXT NOT NULL, closed_by TEXT NOT NULL, closed_at TEXT NOT NULL, totals_json TEXT NOT NULL,
  UNIQUE (company_id, day)
);

-- Actions terrain déjà appliquées : la clé (company_id, action_id) évite les doublons à la reconnexion.
CREATE TABLE sync_actions (
  company_id TEXT NOT NULL, action_id TEXT NOT NULL, agent_id TEXT NOT NULL, type TEXT NOT NULL, result_json TEXT NOT NULL, applied_at TEXT NOT NULL,
  PRIMARY KEY (company_id, action_id)
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY, at TEXT NOT NULL, actor TEXT NOT NULL, actor_role TEXT NOT NULL, company_id TEXT,
  action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, details_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_audit ON audit_log (company_id, at);
`,
  be = `-- Clubs de sport : comptes membres, cotisations, consommations, recouvrement, barrière d'accès.
-- Même règles que la distribution : montants en cents, company_id sur chaque table, « confirmé » et « réglé en banque » distincts.

-- Métier de l'entreprise : chaque locataire voit les écrans de son métier.
ALTER TABLE companies ADD COLUMN vertical TEXT NOT NULL DEFAULT 'distribution' CHECK (vertical IN ('distribution','club'));

-- Catégories d'adhésion (individuel, famille, junior...) et leur cotisation.
CREATE TABLE club_plans (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), code TEXT NOT NULL, name TEXT NOT NULL,
  billing TEXT NOT NULL CHECK (billing IN ('annual','monthly')), fee_minor INTEGER NOT NULL CHECK (fee_minor > 0), active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (company_id, code)
);

-- reference : référence structurée (préfixe, numéro, clé de contrôle) à reporter sur tout virement.
-- badge : identifiant présenté à la barrière (carte, QR). portal_token : jeton opaque de la page membre.
CREATE TABLE members (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), number TEXT NOT NULL, name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', plan_id TEXT REFERENCES club_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','resigned')),
  reference TEXT NOT NULL, badge TEXT NOT NULL, portal_token TEXT NOT NULL UNIQUE, joined_at TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE (company_id, number), UNIQUE (company_id, reference), UNIQUE (company_id, badge)
);

-- Ce que doit le membre : cotisations, consommations (restaurant, bar, terrains...), frais, ajustements.
-- allocated_minor est recalculé (affectation des paiements aux dettes les plus anciennes) : jamais saisi.
CREATE TABLE member_charges (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), member_id TEXT NOT NULL REFERENCES members(id), number TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('dues','consumption','fee')), outlet TEXT NOT NULL DEFAULT '', label TEXT NOT NULL, period TEXT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), allocated_minor INTEGER NOT NULL DEFAULT 0, due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled')), cancel_reason TEXT, cancelled_at TEXT,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (company_id, number)
);
-- Une cotisation par membre et par période : relancer la facturation ne double rien.
CREATE UNIQUE INDEX idx_dues_once ON member_charges (company_id, member_id, period) WHERE kind = 'dues' AND status != 'cancelled';
CREATE INDEX idx_charges_member ON member_charges (member_id, due_date);

-- Encaissements sur le compte membre : paiement en ligne (lien), virement identifié sur le relevé, espèces au bureau.
CREATE TABLE member_payments (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), member_id TEXT NOT NULL REFERENCES members(id),
  method TEXT NOT NULL CHECK (method IN ('link','bank_transfer','cash')), amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','to_verify','confirmed','failed')),
  provider_ref TEXT, idempotency_key TEXT NOT NULL, reference TEXT NOT NULL, failure_reason TEXT, verify_reason TEXT, note TEXT NOT NULL DEFAULT '',
  settlement_status TEXT NOT NULL DEFAULT 'unsettled' CHECK (settlement_status IN ('unsettled','settled')), settled_at TEXT, fee_actual_minor INTEGER, bank_line_id TEXT,
  confirmed_at TEXT, confirmed_via TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT,
  UNIQUE (company_id, idempotency_key)
);
CREATE UNIQUE INDEX idx_member_payments_ref ON member_payments (method, provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX idx_member_payments_member ON member_payments (member_id, status);

-- Relances : une par membre, par dette la plus ancienne (cycle) et par niveau. Relancer deux fois le moteur n'envoie rien de plus.
CREATE TABLE member_reminders (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, member_id TEXT NOT NULL REFERENCES members(id), cycle TEXT NOT NULL, level INTEGER NOT NULL,
  channel TEXT NOT NULL, amount_minor INTEGER NOT NULL, overdue_days INTEGER NOT NULL, message TEXT NOT NULL, sent_by TEXT NOT NULL, sent_at TEXT NOT NULL,
  UNIQUE (company_id, member_id, cycle, level)
);

-- Lecteurs de la barrière. Le secret de signature d'un lecteur n'est pas stocké : il est dérivé du secret serveur.
CREATE TABLE gate_devices (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE gate_events (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, member_id TEXT, device_id TEXT, credential_hint TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow','flag','deny')), reason TEXT NOT NULL, overdue_minor INTEGER NOT NULL DEFAULT 0, overdue_days INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('reader','attendant')), at TEXT NOT NULL
);
CREATE INDEX idx_gate_events ON gate_events (company_id, at);
`,
  D = `0.1.0`,
  xe = Object.fromEntries(Object.entries(Object.assign({
    "../../../server/migrations/001_init.sql": ye,
    "../../../server/migrations/002_clubs.sql": be
  })).map(([e, t]) => [e.split(`/`).pop(), t])),
  Se = e => e.split(/[\\/]/).pop() ?? e;
function Ce(e) {
  let t = Se(e);
  if (t === `package.json`) return JSON.stringify({
    version: D
  });
  let n = xe[t];
  if (n === void 0) throw Error(`Fichier indisponible hors ligne : ${t}`);
  return n;
}
var we = e => Se(e) === `migrations` ? Object.keys(xe).sort() : [];
function Te(...e) {
  let t = [];
  for (let n of e.join(`/`).split(`/`)) n && n !== `.` && (n === `..` ? t.pop() : t.push(n));
  return `/` + t.join(`/`);
}
var Ee = e => Te(e, `..`),
  De = e => `/app/server/src/core.ts`,
  Oe = JSON.parse(Ce(Te(Ee(De({}.url)), `..`, `..`, `package.json`), `utf8`)).version,
  ke = `Indian/Mauritius`,
  Ae = Te(Ee(De({}.url)), `..`, `..`);
function O(e, t, ...n) {
  return e.prepare(t).all(...n);
}
function k(e, t, ...n) {
  return e.prepare(t).get(...n);
}
function A(e, t, ...n) {
  return Number(e.prepare(t).run(...n).changes);
}
var Me = new WeakMap();
function j(e, t) {
  let n = Me.get(e) ?? 0,
    r = `sp_${n}`;
  e.exec(n === 0 ? `BEGIN IMMEDIATE` : `SAVEPOINT ${r}`), Me.set(e, n + 1);
  try {
    let i = t();
    return e.exec(n === 0 ? `COMMIT` : `RELEASE ${r}`), i;
  } catch (t) {
    throw e.exec(n === 0 ? `ROLLBACK` : `ROLLBACK TO ${r}; RELEASE ${r}`), t;
  } finally {
    Me.set(e, n);
  }
}
var Ne = Te(Ae, `server`, `migrations`);
function Pe(e) {
  e.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  let t = new Set(O(e, `SELECT name FROM schema_migrations`).map(e => e.name)),
    n = [];
  for (let r of we(Ne).filter(e => e.endsWith(`.sql`)).sort()) t.has(r) || (j(e, () => {
    e.exec(Ce(Te(Ne, r), `utf8`)), A(e, `INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)`, r, new Date().toISOString());
  }), n.push(r));
  return n;
}
var Fe = e => `${e}_${_e().replace(/-/g, ``).slice(0, 20)}`,
  M = () => ge(16).toString(`base64url`),
  N = e => e.toISOString(),
  Ie = (e, t) => new Date(e.getTime() + t * 864e5),
  Le = new Intl.DateTimeFormat(`en-CA`, {
    timeZone: ke,
    year: `numeric`,
    month: `2-digit`,
    day: `2-digit`
  }),
  Re = e => Le.format(e),
  P = class extends Error {
    status;
    code;
    constructor(e, t, n) {
      super(n), this.status = e, this.code = t;
    }
  },
  ze = (e = `Élément`) => new P(404, `not_found`, `${e} introuvable.`),
  Be = () => new P(403, `forbidden`, `Accès non autorisé.`),
  Ve = {
    id: `system`,
    role: `system`
  };
function He(e, t, n, r, i, a = {}, o = t.companyId ?? null, s = new Date()) {
  A(e, `INSERT INTO audit_log (id, at, actor, actor_role, company_id, action, entity, entity_id, details_json) VALUES (?,?,?,?,?,?,?,?,?)`, Fe(`aud`), N(s), t.id, t.role, o, n, r, i, JSON.stringify(a));
}
function F(e, t) {
  let n = e => {
      let t = e == null ? `` : String(e);
      return (/^[=+@]/.test(t) || /^-(?!\d)/.test(t)) && (t = `'${t}`), /[",\n;]/.test(t) ? `"${t.replace(/"/g, `""`)}"` : t;
    },
    r = [t.map(([, e]) => n(e)).join(`,`)];
  for (let i of e) r.push(t.map(([e]) => n(i[e])).join(`,`));
  return `﻿` + r.join(`\r
`) + `\r
`;
}
var Ue = e => {
  if (e == null) return ``;
  let t = e < 0 ? `-` : ``,
    n = Math.abs(e);
  return `${t}${Math.trunc(n / 100)}.${String(n % 100).padStart(2, `0`)}`;
};

export { A, Ae, Be, Ce, D, De, Ee, F, Fe, He, Ie, Le, M, Me, N, Ne, O, Oe, P, Pe, Re, Se, Te, Ue, Ve, _e, be, j, k, ke, we, xe, ye, ze };
