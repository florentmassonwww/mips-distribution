// GENERATED (step 1a, stage 2): v0.1.0 "distribution" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TypeScript in the following commits.
/* eslint-disable */
import { A, Fe, He, N, O, P, Re, j, k, ze } from "./core.mjs";
import { H, Ql, V, cu, he, iu, ol, ve, yu } from "./lib.mjs";

var Gu = [`paystation`, `card_tpe`, `juice`, `link`],
  Ku = [`company_admin`, `dispatcher`],
  qu = [`company_admin`, `finance`],
  Ju = [`restaurant`, `bar`, `tennis`, `squash`, `golf`, `shop`, `events`, `other`];
function Yu() {
  let e = {
    paystation: 100,
    card_tpe: 175,
    juice: 90,
    link: 150
  };
  return {
    payments: {
      methods: Object.fromEntries(Gu.map(t => [t, {
        enabled: !0,
        feeBps: e[t],
        merchantRef: `DEMO-${t.toUpperCase()}`
      }])),
      settlementAccountLabel: `Compte courant MCB du distributeur (libellé de démonstration)`,
      attemptMinutes: 10
    },
    erp: {
      system: `ERP de démonstration`,
      endpoint: `https://erp.exemple.invalid/api`,
      secretRef: `ERP_API_KEY`,
      autoSync: !0,
      simulateFailure: !1
    },
    club: {
      refPrefix: `CLB`,
      dueDays: 30,
      reminders: {
        levels: [7, 30, 60],
        minAmountMinor: 5e4
      },
      gate: {
        flagAfterDays: 30,
        denyAfterDays: 0,
        minAmountMinor: 5e4
      },
      accounts: {
        receivable: `411000`,
        bank: `512000`,
        transit: `511500`,
        cash: `530000`,
        fees: `627000`,
        dues: `706100`,
        fee: `708800`,
        outlets: {
          restaurant: `707100`,
          bar: `707200`,
          tennis: `706210`,
          squash: `706220`,
          golf: `706230`,
          shop: `707300`,
          events: `706300`,
          other: `708000`
        }
      },
      journals: {
        sales: `VT`,
        bank: `BQ`,
        cash: `CA`
      }
    }
  };
}
function Xu(e, t) {
  let n = k(e, `SELECT settings_json FROM companies WHERE id = ?`, t),
    r = JSON.parse(n?.settings_json || `{}`),
    i = Yu();
  return {
    payments: {
      ...i.payments,
      ...r.payments,
      methods: {
        ...i.payments.methods,
        ...r.payments?.methods
      }
    },
    erp: {
      ...i.erp,
      ...r.erp
    },
    club: {
      ...i.club,
      ...r.club,
      reminders: {
        ...i.club.reminders,
        ...r.club?.reminders
      },
      gate: {
        ...i.club.gate,
        ...r.club?.gate
      },
      accounts: {
        ...i.club.accounts,
        ...r.club?.accounts,
        outlets: {
          ...i.club.accounts.outlets,
          ...r.club?.accounts?.outlets
        }
      },
      journals: {
        ...i.club.journals,
        ...r.club?.journals
      }
    }
  };
}
function Zu(e, t, n, r) {
  A(e, `INSERT INTO counters (company_id, name, value) VALUES (?,?,1) ON CONFLICT (company_id, name) DO UPDATE SET value = value + 1`, t, n);
  let i = k(e, `SELECT value FROM counters WHERE company_id = ? AND name = ?`, t, n).value;
  return `${r}-${String(i).padStart(6, `0`)}`;
}
function Qu(e) {
  let t = new Date(`${e}T00:00:00+04:00`);
  return [N(t), N(new Date(t.getTime() + 864e5))];
}
var $u = e => /^\d{4}-\d{2}-\d{2}$/.test(e) && !Number.isNaN(new Date(`${e}T00:00:00+04:00`).getTime());
function U(e, t, n, r, i, a, o, s = {}, c = new Date()) {
  k(e, `SELECT 1 FROM exceptions WHERE company_id = ? AND type = ? AND entity_id = ? AND status = 'open'`, t, r, a) || A(e, `INSERT INTO exceptions (id, company_id, domain, type, entity, entity_id, message, details_json, created_at) VALUES (?,?,?,?,?,?,?,?,?)`, Fe(`exc`), t, n, r, i, a, o, JSON.stringify(s), N(c));
}
function ed(e, t, n, r, i, a = new Date()) {
  for (let o of n) A(e, `UPDATE exceptions SET status = 'resolved', resolution = 'auto', resolution_note = ?, resolved_by = 'system', resolved_at = ? WHERE company_id = ? AND type = ? AND entity_id = ? AND status = 'open'`, i, N(a), t, o, r);
}
function W(e, t, n, r, i, a, o, s = new Date()) {
  A(e, `INSERT OR IGNORE INTO erp_entries (id, company_id, kind, entity_id, label, amount_minor, payload_json, created_at) VALUES (?,?,?,?,?,?,?,?)`, Fe(`erp`), t, n, r, i, a, JSON.stringify(o), N(s));
}
var td = (e, t, n, r) => O(e, `SELECT e.*, u.name AS resolved_by_name FROM exceptions e LEFT JOIN users u ON u.id = e.resolved_by
    WHERE e.company_id = ? AND e.domain = ? AND e.status = ? ORDER BY e.created_at DESC LIMIT 300`, t, n, r).map(e => ({
    ...e,
    details_json: void 0,
    details: JSON.parse(e.details_json)
  })),
  nd = e => {
    if (!e.companyId) throw new P(403, `forbidden`, `Accès non autorisé.`);
    return e.companyId;
  };
function rd(e, t, n) {
  let r = O(e, `SELECT p.id, COALESCE(pli.price_minor, p.price_minor) AS price FROM products p
    LEFT JOIN customers c ON c.id = ? AND c.company_id = p.company_id
    LEFT JOIN price_list_items pli ON pli.price_list_id = c.price_list_id AND pli.product_id = p.id
    WHERE p.company_id = ? AND p.active = 1`, n, t);
  return new Map(r.map(e => [e.id, e.price]));
}
var id = (e, t, n) => {
    let r = k(e, `SELECT id, name FROM customers WHERE id = ? AND company_id = ? AND active = 1`, n, t);
    if (!r) throw ze(`Commerce`);
    return r;
  },
  ad = (e, t, n) => {
    let r = k(e, `SELECT * FROM routes WHERE id = ? AND company_id = ?`, n, t);
    if (!r) throw ze(`Tournée`);
    return r;
  },
  od = (e, t, n) => {
    let r = k(e, `SELECT * FROM orders WHERE id = ? AND company_id = ?`, n, t);
    if (!r) throw ze(`Commande`);
    return r;
  };
function sd(e, t, n, r) {
  let i = k(e, `SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM route_stops WHERE route_id = ?`, n).n;
  A(e, `INSERT OR IGNORE INTO route_stops (id, route_id, company_id, customer_id, seq) VALUES (?,?,?,?,?)`, Fe(`stp`), n, t, r, i);
}
function cd(e, t, n, r, i, a, o, s, c, l = ``) {
  A(e, `INSERT INTO stock_movements (id, company_id, product_id, route_id, type, qty, ref, note, actor, at) VALUES (?,?,?,?,?,?,?,?,?,?)`, Fe(`mv`), t, n, r, i, a, o, l, s, N(c));
}
var ld = H({
  customerId: V(),
  routeId: V().nullish(),
  note: V().max(300).default(``),
  lines: cu(H({
    productId: V(),
    qty: Ql().int().min(1).max(1e5)
  })).min(1).max(100)
});
function ud(e, t, n, r = new Date()) {
  let i = nd(t);
  return j(e, () => {
    id(e, i, n.customerId);
    let a = rd(e, i, n.customerId),
      o = Fe(`ord`),
      s = Zu(e, i, `order`, `CMD`);
    A(e, `INSERT INTO orders (id, company_id, number, customer_id, kind, status, note, created_by, created_at) VALUES (?,?,?,?,'preorder','confirmed',?,?,?)`, o, i, s, n.customerId, n.note, t.id, N(r));
    for (let t of n.lines) {
      let n = a.get(t.productId);
      if (n === void 0) throw ze(`Produit`);
      A(e, `INSERT INTO order_lines (id, order_id, company_id, product_id, qty_ordered, unit_price_minor) VALUES (?,?,?,?,?,?)`, Fe(`ol`), o, i, t.productId, t.qty, n);
    }
    return He(e, t, `order.created`, `order`, o, {
      number: s,
      lines: n.lines.length
    }, i, r), n.routeId && dd(e, t, o, n.routeId, r), {
      id: o,
      number: s
    };
  });
}
function dd(e, t, n, r, i = new Date()) {
  let a = nd(t);
  j(e, () => {
    let o = od(e, a, n);
    if (o.kind !== `preorder` || ![`confirmed`, `prepared`].includes(o.status)) throw new P(409, `bad_status`, `Cette commande ne peut plus être réaffectée.`);
    if (o.route_id && ad(e, a, o.route_id).status !== `planned`) throw new P(409, `route_locked`, `La tournée actuelle de cette commande est déjà chargée.`);
    if (r) {
      if (ad(e, a, r).status !== `planned`) throw new P(409, `route_locked`, `Cette tournée est déjà chargée : affectez la commande à une tournée planifiée.`);
      sd(e, a, r, o.customer_id);
    }
    A(e, `UPDATE orders SET route_id = ? WHERE id = ?`, r, n), He(e, t, `order.assigned`, `order`, n, {
      number: o.number,
      routeId: r
    }, a, i);
  });
}
function fd(e, t, n, r, i = new Date()) {
  let a = nd(t);
  j(e, () => {
    let o = od(e, a, n),
      s = r === `prepared` ? [`confirmed`] : r === `confirmed` ? [`prepared`] : [`confirmed`, `prepared`];
    if (o.kind !== `preorder` || !s.includes(o.status)) throw new P(409, `bad_status`, `Action impossible dans l'état actuel de la commande.`);
    A(e, `UPDATE orders SET status = ?, route_id = CASE WHEN ? = 'cancelled' THEN NULL ELSE route_id END WHERE id = ?`, r, r, n), He(e, t, `order.${r}`, `order`, n, {
      number: o.number
    }, a, i);
  });
}
function pd(e, t, n = {}) {
  let r = [`o.company_id = ?`],
    i = [t];
  return n.status && (r.push(`o.status = ?`), i.push(n.status)), n.routeId && (r.push(`o.route_id = ?`), i.push(n.routeId)), O(e, `SELECT o.id, o.number, o.kind, o.status, o.created_at, o.delivered_at, o.route_id, c.name AS customer, c.zone, r.name AS route, r.status AS route_status,
      (SELECT SUM(qty_ordered * unit_price_minor) FROM order_lines WHERE order_id = o.id) AS ordered_minor,
      i.id AS invoice_id, i.number AS invoice_number, i.amount_minor AS invoice_minor, i.status AS invoice_status
    FROM orders o JOIN customers c ON c.id = o.customer_id LEFT JOIN routes r ON r.id = o.route_id LEFT JOIN invoices i ON i.order_id = o.id
    WHERE ${r.join(` AND `)} ORDER BY o.created_at DESC, o.rowid DESC LIMIT 300`, ...i);
}
function md(e, t, n) {
  let r = k(e, `SELECT o.*, c.name AS customer, c.address, r.name AS route, u.name AS created_by_name FROM orders o JOIN customers c ON c.id = o.customer_id
    LEFT JOIN routes r ON r.id = o.route_id LEFT JOIN users u ON u.id = o.created_by WHERE o.id = ? AND o.company_id = ?`, n, t);
  if (!r) throw ze(`Commande`);
  let i = k(e, `SELECT * FROM invoices WHERE order_id = ? AND company_id = ?`, n, t) ?? null,
    a = i ? O(e, `SELECT p.id, p.method, p.amount_minor, p.refunded_minor, p.status, p.provider_ref, p.created_at, p.confirmed_at, p.confirmed_via, p.failure_reason, p.verify_reason,
    p.settlement_status, p.settled_at, p.fee_expected_minor, p.fee_actual_minor, u.name AS agent FROM payments p LEFT JOIN users u ON u.id = p.agent_id WHERE p.invoice_id = ? ORDER BY p.created_at`, i.id) : [],
    o = [n, i?.id, ...a.map(e => e.id)].filter(Boolean),
    s = O(e, `SELECT id, kind, label, amount_minor, status, attempts, last_error, external_ref, synced_at FROM erp_entries
    WHERE company_id = ? AND (${o.map(() => `entity_id LIKE ? || '%'`).join(` OR `)}) ORDER BY created_at`, t, ...o);
  return {
    order: r,
    lines: O(e, `SELECT l.*, p.name AS product, p.sku, p.unit FROM order_lines l JOIN products p ON p.id = l.product_id WHERE l.order_id = ?`, n),
    delivery: k(e, `SELECT d.*, u.name AS agent FROM deliveries d LEFT JOIN users u ON u.id = d.agent_id WHERE d.order_id = ?`, n) ?? null,
    invoice: i,
    payments: a,
    erp: s
  };
}
var hd = H({
  name: V().min(2).max(80),
  day: V().regex(/^\d{4}-\d{2}-\d{2}$/),
  agentId: V().nullish(),
  vehicle: V().max(40).default(``),
  customerIds: cu(V()).max(200).default([])
});
function gd(e, t, n) {
  if (!n) return null;
  if (!k(e, `SELECT 1 FROM users WHERE id = ? AND company_id = ? AND role = 'agent' AND active = 1`, n, t)) throw ze(`Agent`);
  return n;
}
function _d(e, t, n, r = new Date()) {
  let i = nd(t);
  return j(e, () => {
    let a = Fe(`rte`);
    A(e, `INSERT INTO routes (id, company_id, name, day, agent_id, vehicle, created_at) VALUES (?,?,?,?,?,?,?)`, a, i, n.name, n.day, gd(e, i, n.agentId), n.vehicle, N(r));
    for (let t of n.customerIds) id(e, i, t), sd(e, i, a, t);
    return He(e, t, `route.created`, `route`, a, {
      name: n.name,
      day: n.day
    }, i, r), {
      id: a
    };
  });
}
function vd(e, t, n, r, i = new Date()) {
  let a = nd(t);
  j(e, () => {
    let o = ad(e, a, n);
    if (o.status === `closed`) throw new P(409, `route_locked`, `Tournée clôturée.`);
    if (r.agentId !== void 0) {
      if (o.status === `in_progress`) throw new P(409, `route_locked`, `L'agent ne peut pas être changé pendant la tournée.`);
      A(e, `UPDATE routes SET agent_id = ? WHERE id = ?`, gd(e, a, r.agentId), n);
    }
    if (r.name && A(e, `UPDATE routes SET name = ? WHERE id = ?`, r.name, n), r.vehicle !== void 0 && A(e, `UPDATE routes SET vehicle = ? WHERE id = ?`, r.vehicle, n), r.customerIds) {
      let t = new Set(O(e, `SELECT DISTINCT customer_id FROM orders WHERE route_id = ? AND status != 'cancelled'`, n).map(e => e.customer_id));
      for (let t of r.customerIds) id(e, a, t);
      let i = [...new Set([...r.customerIds, ...t])];
      A(e, `DELETE FROM route_stops WHERE route_id = ?`, n), i.forEach((t, r) => A(e, `INSERT INTO route_stops (id, route_id, company_id, customer_id, seq) VALUES (?,?,?,?,?)`, Fe(`stp`), n, a, t, r + 1));
    }
    He(e, t, `route.updated`, `route`, n, {
      name: o.name,
      fields: Object.keys(r)
    }, a, i);
  });
}
function yd(e, t, n, r, i = new Date()) {
  let a = nd(t);
  j(e, () => {
    let o = ad(e, a, n);
    if (o.status !== `planned`) throw new P(409, `bad_status`, `Cette tournée est déjà chargée.`);
    if (!o.agent_id) throw new P(409, `no_agent`, `Affectez un agent avant de charger le véhicule.`);
    let s = O(e, `SELECT number FROM orders WHERE route_id = ? AND status = 'confirmed'`, n);
    if (s.length) throw new P(409, `orders_not_prepared`, `Commandes à préparer avant le chargement : ${s.map(e => e.number).join(`, `)}.`);
    let c = new Map();
    for (let t of O(e, `SELECT l.product_id, SUM(l.qty_ordered) AS q FROM order_lines l JOIN orders o ON o.id = l.order_id
      WHERE o.route_id = ? AND o.status = 'prepared' GROUP BY l.product_id`, n)) c.set(t.product_id, t.q);
    for (let e of r) e.qty > 0 && c.set(e.productId, (c.get(e.productId) ?? 0) + e.qty);
    if (!c.size) throw new P(409, `nothing_to_load`, `Rien à charger : ajoutez des commandes préparées ou du stock de vente.`);
    for (let [r, s] of c) {
      let c = k(e, `SELECT p.name, w.qty FROM products p LEFT JOIN warehouse_stock w ON w.product_id = p.id AND w.company_id = p.company_id
        WHERE p.id = ? AND p.company_id = ?`, r, a);
      if (!c) throw ze(`Produit`);
      if ((c.qty ?? 0) < s) throw new P(409, `insufficient_stock`, `Stock dépôt insuffisant pour ${c.name} : ${c.qty ?? 0} disponible(s), ${s} demandé(s).`);
      A(e, `UPDATE warehouse_stock SET qty = qty - ? WHERE company_id = ? AND product_id = ?`, s, a, r), A(e, `INSERT INTO vehicle_stock (route_id, product_id, company_id, loaded_qty, qty) VALUES (?,?,?,?,?)`, n, r, a, s, s), cd(e, a, r, n, `load`, -s, o.name, t.id, i);
    }
    A(e, `UPDATE orders SET status = 'loaded' WHERE route_id = ? AND status = 'prepared'`, n), A(e, `UPDATE routes SET status = 'loaded' WHERE id = ?`, n), He(e, t, `route.loaded`, `route`, n, {
      name: o.name,
      products: c.size
    }, a, i);
  });
}
function bd(e, t, n) {
  return O(e, `SELECT r.*, u.name AS agent,
      (SELECT COUNT(*) FROM route_stops WHERE route_id = r.id) AS stops,
      (SELECT COUNT(*) FROM orders WHERE route_id = r.id AND kind = 'preorder' AND status != 'cancelled') AS orders_total,
      (SELECT COUNT(*) FROM orders WHERE route_id = r.id AND kind = 'preorder' AND status IN ('delivered','partially_delivered','refused')) AS orders_done,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM invoices WHERE route_id = r.id) AS invoiced_minor,
      (SELECT COALESCE(SUM(paid_minor - refunded_minor), 0) FROM invoices WHERE route_id = r.id) AS paid_minor
    FROM routes r LEFT JOIN users u ON u.id = r.agent_id WHERE r.company_id = ? ${n ? `AND r.agent_id = ?` : ``} ORDER BY r.day DESC, r.name LIMIT 100`, t, ...(n ? [n] : []));
}
function xd(e, t, n) {
  let r = k(e, `SELECT r.*, u.name AS agent FROM routes r LEFT JOIN users u ON u.id = r.agent_id WHERE r.id = ? AND r.company_id = ?`, n, t);
  if (!r) throw ze(`Tournée`);
  let i = t => k(e, t, n).n;
  return {
    route: r,
    orders: {
      total: i(`SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND kind = 'preorder' AND status != 'cancelled'`),
      toDeliver: i(`SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND status IN ('prepared','loaded','confirmed')`),
      delivered: i(`SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND kind = 'preorder' AND status = 'delivered'`),
      partial: i(`SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND status = 'partially_delivered'`),
      refused: i(`SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND status = 'refused'`),
      routeSales: i(`SELECT COUNT(*) AS n FROM orders WHERE route_id = ? AND kind = 'route_sale'`)
    },
    money: {
      invoiced: i(`SELECT COALESCE(SUM(amount_minor), 0) AS n FROM invoices WHERE route_id = ?`),
      confirmed: i(`SELECT COALESCE(SUM(paid_minor - refunded_minor), 0) AS n FROM invoices WHERE route_id = ?`),
      pending: i(`SELECT COALESCE(SUM(p.amount_minor), 0) AS n FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? AND p.status = 'pending'`),
      toVerify: i(`SELECT COALESCE(SUM(p.amount_minor), 0) AS n FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? AND p.status = 'to_verify'`),
      settled: i(`SELECT COALESCE(SUM(p.amount_minor - p.refunded_minor), 0) AS n FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? AND p.settlement_status = 'settled'`)
    },
    byMethod: O(e, `SELECT p.method, COUNT(*) AS count, SUM(p.amount_minor - p.refunded_minor) AS amount_minor FROM payments p JOIN invoices i ON i.id = p.invoice_id
      WHERE i.route_id = ? AND p.status IN ('confirmed','refunded') GROUP BY p.method`, n),
    stock: O(e, `SELECT v.product_id, p.name, p.sku, p.unit, v.loaded_qty, v.qty, v.returned_qty FROM vehicle_stock v JOIN products p ON p.id = v.product_id WHERE v.route_id = ? ORDER BY p.name`, n)
  };
}
function Sd(e, t) {
  return {
    warehouse: O(e, `SELECT p.id, p.sku, p.name, p.unit, p.price_minor, COALESCE(w.qty, 0) AS qty,
        (SELECT COALESCE(SUM(v.qty), 0) FROM vehicle_stock v JOIN routes r ON r.id = v.route_id WHERE v.product_id = p.id AND r.status IN ('loaded','in_progress')) AS on_vehicles,
        (SELECT COALESCE(SUM(l.qty_ordered), 0) FROM order_lines l JOIN orders o ON o.id = l.order_id WHERE l.product_id = p.id AND o.status IN ('confirmed','prepared')) AS reserved
      FROM products p LEFT JOIN warehouse_stock w ON w.product_id = p.id AND w.company_id = p.company_id WHERE p.company_id = ? AND p.active = 1 ORDER BY p.name`, t),
    movements: O(e, `SELECT m.id, m.at, m.type, m.qty, m.ref, m.note, p.name AS product, u.name AS actor, r.name AS route FROM stock_movements m JOIN products p ON p.id = m.product_id
      LEFT JOIN users u ON u.id = m.actor LEFT JOIN routes r ON r.id = m.route_id WHERE m.company_id = ? ORDER BY m.at DESC, m.rowid DESC LIMIT 80`, t)
  };
}
function Cd(e, t, n, r, i, a = new Date()) {
  let o = nd(t);
  j(e, () => {
    let s = k(e, `SELECT name FROM products WHERE id = ? AND company_id = ?`, n, o);
    if (!s) throw ze(`Produit`);
    if (A(e, `INSERT INTO warehouse_stock (company_id, product_id, qty) VALUES (?,?,?) ON CONFLICT (company_id, product_id) DO UPDATE SET qty = qty + excluded.qty`, o, n, r), k(e, `SELECT qty FROM warehouse_stock WHERE company_id = ? AND product_id = ?`, o, n).qty < 0) throw new P(409, `negative_stock`, `L'ajustement rendrait le stock négatif.`);
    cd(e, o, n, null, `adjust`, r, `Ajustement`, t.id, a, i), He(e, t, `stock.adjusted`, `product`, n, {
      product: s.name,
      delta: r,
      reason: i
    }, o, a);
  });
}
function wd(e, t, n) {
  let r = ad(e, nd(t), n);
  if (r.agent_id !== t.id) throw new P(403, `forbidden`, `Cette tournée est affectée à un autre agent.`);
  return r;
}
function Td(e, t, n, r = new Date()) {
  j(e, () => {
    let i = wd(e, t, n);
    if (i.status !== `in_progress`) {
      if (i.status !== `loaded`) throw new P(409, `bad_status`, i.status === `planned` ? `Le véhicule n'est pas encore chargé par la centrale.` : `Tournée clôturée.`);
      A(e, `UPDATE routes SET status = 'in_progress', started_at = ? WHERE id = ?`, N(r), n), He(e, t, `route.started`, `route`, n, {
        name: i.name
      }, i.company_id, r);
    }
  });
}
function Ed(e, t, n, r = new Date()) {
  let i = wd(e, t, n),
    a = i.company_id,
    o = O(e, `SELECT s.customer_id, s.seq, c.name, c.code, c.address, c.zone, c.phone, c.price_list_id
    FROM route_stops s JOIN customers c ON c.id = s.customer_id WHERE s.route_id = ? ORDER BY s.seq`, n),
    s = O(e, `SELECT o.id, o.number, o.kind, o.status, o.customer_id, o.note, o.delivered_at FROM orders o WHERE o.route_id = ? AND o.status != 'cancelled' ORDER BY o.created_at`, n),
    c = O(e, `SELECT l.id, l.order_id, l.product_id, l.qty_ordered, l.qty_delivered, l.unit_price_minor FROM order_lines l JOIN orders o ON o.id = l.order_id WHERE o.route_id = ?`, n),
    l = O(e, `SELECT id, number, order_id, customer_id, amount_minor, paid_minor, refunded_minor, status, issued_at FROM invoices WHERE route_id = ? ORDER BY issued_at`, n),
    u = O(e, `SELECT p.id, p.invoice_id, p.method, p.amount_minor, p.refunded_minor, p.status, p.provider_ref, p.created_at, p.failure_reason, p.verify_reason
    FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? ORDER BY p.created_at`, n),
    d = [...new Set(o.map(e => e.price_list_id).filter(Boolean))];
  return {
    generatedAt: N(r),
    route: {
      id: i.id,
      name: i.name,
      day: i.day,
      vehicle: i.vehicle,
      status: i.status
    },
    stops: o,
    orders: s.map(e => ({
      ...e,
      lines: c.filter(t => t.order_id === e.id)
    })),
    invoices: l.map(e => ({
      ...e,
      payments: u.filter(t => t.invoice_id === e.id)
    })),
    products: O(e, `SELECT id, sku, name, unit, price_minor FROM products WHERE company_id = ? AND active = 1 ORDER BY name`, a),
    priceLists: Object.fromEntries(d.map(t => [t, Object.fromEntries(O(e, `SELECT product_id, price_minor FROM price_list_items WHERE price_list_id = ?`, t).map(e => [e.product_id, e.price_minor]))])),
    stock: Object.fromEntries(O(e, `SELECT product_id, qty FROM vehicle_stock WHERE route_id = ?`, n).map(e => [e.product_id, e.qty])),
    customers: O(e, `SELECT id, name, code, zone, address, phone, price_list_id FROM customers WHERE company_id = ? AND active = 1 ORDER BY name`, a)
  };
}
var Dd = H({
    name: V().max(80).default(``),
    signature: V().max(2e5).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/).nullish(),
    note: V().max(300).default(``)
  }),
  Od = cu(H({
    productId: V(),
    qty: Ql().int().min(1).max(1e4)
  })).max(50).default([]),
  kd = H({
    orderId: V(),
    lines: cu(H({
      lineId: V(),
      qtyDelivered: Ql().int().min(0)
    })).max(100),
    returns: Od,
    reason: V().max(200).default(``),
    pod: Dd.default({
      name: ``,
      note: ``
    }),
    at: V(),
    expectedTotalMinor: Ql().int().optional()
  }),
  Ad = H({
    routeId: V(),
    customerId: V(),
    lines: cu(H({
      productId: V(),
      qty: Ql().int().min(1).max(1e4)
    })).min(1).max(100),
    returns: Od,
    pod: Dd,
    at: V(),
    expectedTotalMinor: Ql().int().optional()
  }),
  jd = H({
    id: V().min(8).max(64),
    type: yu([`deliver`, `sale`]),
    payload: iu()
  });
function Md(e, t) {
  let n = t.route.company_id,
    r = t.delivered.reduce((e, t) => e + t.qty, 0),
    i = r === 0 ? `refused` : r < t.ordered ? `partial` : `full`;
  if (i === `refused` && t.reason.trim().length < 3) throw new P(400, `reason_required`, `Indiquez le motif du refus ou de la non-livraison.`);
  if (i === `partial` && t.reason.trim().length < 3) throw new P(400, `reason_required`, `Indiquez le motif de la livraison partielle.`);
  if (i !== `refused` && t.pod.name.trim().length < 2) throw new P(400, `pod_required`, `Le nom du réceptionnaire est requis comme preuve de livraison.`);
  if (i === `refused` && t.returns.length) throw new P(400, `invalid_returns`, `Un retour ne peut pas être saisi sur une livraison refusée.`);
  let a = rd(e, n, t.order.customer_id),
    o = new Map(O(e, `SELECT id, name FROM products WHERE company_id = ?`, n).map(e => [e.id, e.name])),
    s = 0,
    c = t.returns.map(e => {
      let t = a.get(e.productId);
      if (t === void 0) throw ze(`Produit retourné`);
      return s += t * e.qty, {
        ...e,
        product: o.get(e.productId),
        unitPriceMinor: t
      };
    }),
    l = t.delivered.reduce((e, t) => e + t.qty * t.price, 0) - s;
  if (l < 0) throw new P(400, `returns_exceed_delivery`, `La valeur des retours dépasse celle de la livraison.`);
  let u = t.order.number;
  for (let r of t.delivered) {
    if (!r.qty) continue;
    A(e, `INSERT INTO vehicle_stock (route_id, product_id, company_id, qty) VALUES (?,?,?,?) ON CONFLICT (route_id, product_id) DO UPDATE SET qty = qty + excluded.qty`, t.route.id, r.productId, n, -r.qty), cd(e, n, r.productId, t.route.id, t.order.kind === `route_sale` ? `sale` : `delivery`, -r.qty, u, t.agent.id, t.at);
    let i = k(e, `SELECT qty FROM vehicle_stock WHERE route_id = ? AND product_id = ?`, t.route.id, r.productId).qty;
    i < 0 && U(e, n, `ops`, `stock_variance`, `route`, `${t.route.id}:${r.productId}`, `Stock véhicule négatif pour ${o.get(r.productId)} sur ${t.route.name} (${i}) : écart d'inventaire à vérifier.`, {
      routeId: t.route.id,
      productId: r.productId,
      qty: i,
      order: u
    }, t.now);
  }
  for (let r of c) A(e, `INSERT INTO vehicle_stock (route_id, product_id, company_id, returned_qty) VALUES (?,?,?,?) ON CONFLICT (route_id, product_id) DO UPDATE SET returned_qty = returned_qty + excluded.returned_qty`, t.route.id, r.productId, n, r.qty), cd(e, n, r.productId, t.route.id, `return`, r.qty, u, t.agent.id, t.at);
  A(e, `UPDATE orders SET status = ?, delivered_at = ? WHERE id = ?`, i === `full` ? `delivered` : i === `partial` ? `partially_delivered` : `refused`, N(t.at), t.order.id);
  let d = +(t.now.getTime() - t.at.getTime() > 12e4);
  A(e, `INSERT INTO deliveries (id, company_id, order_id, route_id, agent_id, outcome, reason, returns_json, returns_minor, pod_name, pod_signature, pod_note, at, synced_at, offline)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, Fe(`dlv`), n, t.order.id, t.route.id, t.agent.id, i, t.reason.trim(), JSON.stringify(c), s, t.pod.name.trim(), t.pod.signature ?? null, t.pod.note, N(t.at), N(t.now), d);
  let f = null;
  if (l > 0) {
    f = {
      id: Fe(`inv`),
      number: Zu(e, n, `invoice`, `FAC`)
    };
    let r = k(e, `SELECT currency FROM companies WHERE id = ?`, n).currency;
    A(e, `INSERT INTO invoices (id, company_id, number, order_id, customer_id, route_id, agent_id, currency, amount_minor, issued_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, f.id, n, f.number, t.order.id, t.order.customer_id, t.route.id, t.agent.id, r, l, N(t.at)), W(e, n, `invoice`, f.id, `Facture ${f.number}`, l, {
      invoice: f.number,
      order: u,
      customerId: t.order.customer_id,
      amountMinor: l,
      returnsMinor: s,
      currency: r
    }, t.now);
  }
  let p = k(e, `SELECT name FROM customers WHERE id = ?`, t.order.customer_id).name;
  return i === `partial` && U(e, n, `ops`, `delivery_partial`, `order`, t.order.id, `Livraison partielle de ${u} chez ${p} : ${t.reason.trim()}`, {
    order: u,
    customer: p,
    reason: t.reason.trim()
  }, t.now), i === `refused` && U(e, n, `ops`, `delivery_refused`, `order`, t.order.id, `${u} non livrée chez ${p} : ${t.reason.trim()}`, {
    order: u,
    customer: p,
    reason: t.reason.trim()
  }, t.now), c.length && U(e, n, `ops`, `return`, `delivery`, t.order.id, `Retour de marchandise chez ${p} sur ${u} : avoir à valider.`, {
    order: u,
    customer: p,
    returns: c,
    returnsMinor: s
  }, t.now), t.expectedTotalMinor !== void 0 && t.expectedTotalMinor !== l && U(e, n, `ops`, `price_mismatch`, `invoice`, f?.id ?? t.order.id, `Montant affiché à l'agent différent du montant facturé sur ${u} (prix mis à jour pendant le hors-ligne).`, {
    order: u,
    shownMinor: t.expectedTotalMinor,
    invoicedMinor: l
  }, t.now), He(e, t.agent, `delivery.${i}`, `order`, t.order.id, {
    order: u,
    customer: p,
    amountMinor: l,
    offline: !!d
  }, n, t.now), {
    orderId: t.order.id,
    orderNumber: u,
    outcome: i,
    invoiceId: f?.id ?? null,
    invoiceNumber: f?.number ?? null,
    amountMinor: l
  };
}
var Nd = (e, t) => {
  let n = new Date(e);
  return Number.isNaN(n.getTime()) || n > t || t.getTime() - n.getTime() > 6048e5 ? t : n;
};
function Pd(e, t, n, r) {
  let i = kd.parse(n),
    a = od(e, nd(t), i.orderId);
  if (!a.route_id) throw new P(409, `bad_status`, `Commande non affectée à une tournée.`);
  let o = wd(e, t, a.route_id);
  if (o.status !== `in_progress`) throw new P(409, `route_not_started`, `La tournée n'est pas en cours.`);
  if (a.status !== `loaded`) throw new P(409, `already_handled`, `La commande ${a.number} a déjà été traitée.`);
  let s = O(e, `SELECT * FROM order_lines WHERE order_id = ?`, a.id),
    c = new Map(i.lines.map(e => [e.lineId, e.qtyDelivered]));
  return Md(e, {
    agent: t,
    route: o,
    order: a,
    delivered: s.map(t => {
      let n = c.get(t.id) ?? 0;
      if (n > t.qty_ordered) throw new P(400, `qty_exceeds_order`, `Quantité livrée supérieure à la quantité commandée.`);
      return A(e, `UPDATE order_lines SET qty_delivered = ? WHERE id = ?`, n, t.id), {
        productId: t.product_id,
        qty: n,
        price: t.unit_price_minor
      };
    }),
    ordered: s.reduce((e, t) => e + t.qty_ordered, 0),
    returns: i.returns,
    reason: i.reason,
    pod: i.pod,
    at: Nd(i.at, r),
    now: r,
    expectedTotalMinor: i.expectedTotalMinor
  });
}
function Fd(e, t, n, r) {
  let i = Ad.parse(n),
    a = wd(e, t, i.routeId),
    o = a.company_id;
  if (a.status !== `in_progress`) throw new P(409, `route_not_started`, `La tournée n'est pas en cours.`);
  id(e, o, i.customerId);
  let s = rd(e, o, i.customerId),
    c = Nd(i.at, r),
    l = Fe(`ord`),
    u = Zu(e, o, `order`, `CMD`);
  A(e, `INSERT INTO orders (id, company_id, number, customer_id, route_id, kind, status, created_by, created_at) VALUES (?,?,?,?,?,'route_sale','loaded',?,?)`, l, o, u, i.customerId, a.id, t.id, N(c)), sd(e, o, a.id, i.customerId);
  let d = i.lines.map(t => {
    let n = s.get(t.productId);
    if (n === void 0) throw ze(`Produit`);
    return A(e, `INSERT INTO order_lines (id, order_id, company_id, product_id, qty_ordered, qty_delivered, unit_price_minor) VALUES (?,?,?,?,?,?,?)`, Fe(`ol`), l, o, t.productId, t.qty, t.qty, n), {
      productId: t.productId,
      qty: t.qty,
      price: n
    };
  });
  return Md(e, {
    agent: t,
    route: a,
    order: {
      id: l,
      company_id: o,
      number: u,
      customer_id: i.customerId,
      route_id: a.id,
      kind: `route_sale`,
      status: `loaded`
    },
    delivered: d,
    ordered: d.reduce((e, t) => e + t.qty, 0),
    returns: i.returns,
    reason: ``,
    pod: i.pod,
    at: c,
    now: r,
    expectedTotalMinor: i.expectedTotalMinor
  });
}
function Id(e, t, n, r = new Date()) {
  let i = nd(t),
    a = k(e, `SELECT result_json FROM sync_actions WHERE company_id = ? AND action_id = ?`, i, n.id);
  if (a) return {
    id: n.id,
    status: `duplicate`,
    result: JSON.parse(a.result_json)
  };
  try {
    let a = j(e, () => {
      let a = n.type === `deliver` ? Pd(e, t, n.payload, r) : Fd(e, t, n.payload, r);
      return A(e, `INSERT INTO sync_actions (company_id, action_id, agent_id, type, result_json, applied_at) VALUES (?,?,?,?,?,?)`, i, n.id, t.id, n.type, JSON.stringify(a), N(r)), a;
    });
    return {
      id: n.id,
      status: `applied`,
      result: a
    };
  } catch (e) {
    if (e instanceof P) return {
      id: n.id,
      status: `rejected`,
      code: e.code,
      message: e.message
    };
    if (e instanceof ol) return {
      id: n.id,
      status: `rejected`,
      code: `invalid_input`,
      message: `Action illisible : données invalides.`
    };
    throw e;
  }
}
function Ld(e, t, n, r = new Date()) {
  return j(e, () => {
    let i = wd(e, t, n);
    if (i.status !== `in_progress`) throw new P(409, `bad_status`, `Seule une tournée en cours peut être clôturée.`);
    let a = O(e, `SELECT number FROM orders WHERE route_id = ? AND status = 'loaded'`, n);
    if (a.length) throw new P(409, `orders_open`, `Commandes non traitées : ${a.map(e => e.number).join(`, `)}. Livrez-les ou déclarez-les non livrées.`);
    if (k(e, `SELECT COUNT(*) AS n FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.route_id = ? AND p.status = 'pending'`, n).n) throw new P(409, `payments_pending`, `Des paiements sont encore en attente : vérifiez leur statut avant de clôturer.`);
    for (let a of O(e, `SELECT product_id, qty, returned_qty FROM vehicle_stock WHERE route_id = ?`, n)) a.qty > 0 && (A(e, `INSERT INTO warehouse_stock (company_id, product_id, qty) VALUES (?,?,?) ON CONFLICT (company_id, product_id) DO UPDATE SET qty = qty + excluded.qty`, i.company_id, a.product_id, a.qty), cd(e, i.company_id, a.product_id, n, `unload`, a.qty, i.name, t.id, r)), a.returned_qty > 0 && cd(e, i.company_id, a.product_id, n, `return_in`, a.returned_qty, i.name, t.id, r, `Retours clients à contrôler`);
    A(e, `UPDATE routes SET status = 'closed', closed_at = ? WHERE id = ?`, N(r), n);
    let o = xd(e, i.company_id, n);
    return He(e, t, `route.closed`, `route`, n, {
      name: i.name,
      invoicedMinor: o.money.invoiced,
      confirmedMinor: o.money.confirmed
    }, i.company_id, r), o;
  });
}
function Rd(e, t, n, r, i, a, o = new Date()) {
  let s = nd(t);
  j(e, () => {
    let c = k(e, `SELECT domain, type, status, message FROM exceptions WHERE id = ? AND company_id = ?`, n, s);
    if (!c) throw ze(`Exception`);
    if (!r.includes(c.domain)) throw new P(403, `forbidden`, `Accès non autorisé.`);
    if (c.status !== `open`) throw new P(409, `already_resolved`, `Cette exception est déjà traitée.`);
    if (c.type === `payment_to_verify`) throw new P(409, `needs_provider`, `Un paiement à vérifier se lève par l'interrogation du prestataire ou par le relevé bancaire, pas par validation manuelle.`);
    A(e, `UPDATE exceptions SET status = 'resolved', resolution = ?, resolution_note = ?, resolved_by = ?, resolved_at = ? WHERE id = ?`, i, a, t.id, N(o), n), He(e, t, `exception.${i}`, `exception`, n, {
      type: c.type,
      message: c.message,
      note: a
    }, s, o);
  });
}
function zd(e, t, n = new Date()) {
  let r = Re(n),
    [i, a] = Qu(r),
    o = (n, ...r) => k(e, n, t, ...r).n;
  return {
    day: r,
    generatedAt: N(n),
    sales: {
      invoiced: o(`SELECT COALESCE(SUM(amount_minor), 0) AS n FROM invoices WHERE company_id = ? AND issued_at >= ? AND issued_at < ?`, i, a),
      invoices: o(`SELECT COUNT(*) AS n FROM invoices WHERE company_id = ? AND issued_at >= ? AND issued_at < ?`, i, a),
      routeSales: o(`SELECT COUNT(*) AS n FROM orders WHERE company_id = ? AND kind = 'route_sale' AND created_at >= ? AND created_at < ?`, i, a)
    },
    deliveries: {
      planned: o(`SELECT COUNT(*) AS n FROM orders o JOIN routes r ON r.id = o.route_id WHERE o.company_id = ? AND r.day = ? AND o.kind = 'preorder' AND o.status != 'cancelled'`, r),
      done: o(`SELECT COUNT(*) AS n FROM orders o JOIN routes r ON r.id = o.route_id WHERE o.company_id = ? AND r.day = ? AND o.kind = 'preorder' AND o.status IN ('delivered','partially_delivered')`, r),
      partial: o(`SELECT COUNT(*) AS n FROM orders o JOIN routes r ON r.id = o.route_id WHERE o.company_id = ? AND r.day = ? AND o.status = 'partially_delivered'`, r),
      refused: o(`SELECT COUNT(*) AS n FROM orders o JOIN routes r ON r.id = o.route_id WHERE o.company_id = ? AND r.day = ? AND o.status = 'refused'`, r)
    },
    money: {
      confirmed: o(`SELECT COALESCE(SUM(amount_minor - refunded_minor), 0) AS n FROM payments WHERE company_id = ? AND status IN ('confirmed','refunded') AND confirmed_at >= ? AND confirmed_at < ?`, i, a),
      settled: o(`SELECT COALESCE(SUM(amount_minor - refunded_minor), 0) AS n FROM payments WHERE company_id = ? AND settlement_status = 'settled' AND confirmed_at >= ? AND confirmed_at < ?`, i, a),
      outstanding: o(`SELECT COALESCE(SUM(amount_minor - paid_minor + refunded_minor), 0) AS n FROM invoices WHERE company_id = ? AND status NOT IN ('paid','refunded')`),
      pending: o(`SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'pending'`),
      toVerify: o(`SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'to_verify'`),
      failed: o(`SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'failed' AND created_at >= ? AND created_at < ?`, i, a)
    },
    exceptions: {
      ops: o(`SELECT COUNT(*) AS n FROM exceptions WHERE company_id = ? AND status = 'open' AND domain = 'ops'`),
      finance: o(`SELECT COUNT(*) AS n FROM exceptions WHERE company_id = ? AND status = 'open' AND domain = 'finance'`)
    },
    byMethod: O(e, `SELECT method, COUNT(*) AS count, SUM(amount_minor - refunded_minor) AS amount_minor FROM payments
      WHERE company_id = ? AND status IN ('confirmed','refunded') AND confirmed_at >= ? AND confirmed_at < ? GROUP BY method`, t, i, a),
    routes: bd(e, t).filter(e => e.day === r),
    recent: O(e, `SELECT a.at, a.action, a.details_json, u.name AS actor FROM audit_log a LEFT JOIN users u ON u.id = a.actor
      WHERE a.company_id = ? AND (a.action LIKE 'delivery.%' OR a.action LIKE 'payment.%' OR a.action LIKE 'route.%') ORDER BY a.at DESC, a.rowid DESC LIMIT 14`, t).map(e => ({
      ...e,
      details_json: void 0,
      details: JSON.parse(e.details_json)
    }))
  };
}
function Bd(e, t, n) {
  let r = Math.floor(n.getTime() / 1e3);
  return `t=${r},v1=${he(`sha256`, e).update(`${r}.${t}`).digest(`hex`)}`;
}
function Vd(e, t, n, r, i) {
  let a = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(n ?? ``);
  if (!a) throw new P(401, `bad_signature`, `Signature absente ou mal formée.`);
  let o = Number(a[1]);
  if (Math.abs(r.getTime() / 1e3 - o) > i) throw new P(401, `stale_signature`, `Notification trop ancienne.`);
  let s = Buffer.from(he(`sha256`, e).update(`${o}.${t}`).digest(`hex`)),
    c = Buffer.from(a[2]);
  if (s.length !== c.length || !ve(s, c)) throw new P(401, `bad_signature`, `Signature invalide.`);
}

export { $u, Ad, Bd, Cd, Dd, Ed, Fd, Gu, Id, Ju, Ku, Ld, Md, Nd, Od, Pd, Qu, Rd, Sd, Td, U, Vd, W, Xu, Yu, Zu, _d, ad, bd, cd, dd, ed, fd, gd, hd, id, jd, kd, ld, md, nd, od, pd, qu, rd, sd, td, ud, vd, wd, xd, yd, zd };
