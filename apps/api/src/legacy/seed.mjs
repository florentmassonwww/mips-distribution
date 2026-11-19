// GENERATED (step 1a, stage 2): v0.1.0 "seed" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TypeScript in the following commits.
/* eslint-disable */
import { Ef, Gf, If, Tf, Xf, gf, mf, pf, yf } from "./club.mjs";
import { A, Ie, N, O, Re, j, k } from "./core.mjs";
import { Id, Ld, Rd, Td, Yu, _d, fd, ud, yd } from "./distribution.mjs";
import { Cp, Ep, Sp, kp } from "./finance.mjs";
import { dp, hp } from "./payments.mjs";

var Ap = `co_cs`,
  jp = `http://127.0.0.1:8788`,
  Mp = [[`IND`, `Individuel`, `annual`, 18e3], [`FAM`, `Famille`, `annual`, 3e4], [`JUN`, `Junior (moins de 18 ans)`, `annual`, 6e3], [`SEN`, `Senior (65 ans et plus)`, `annual`, 9e3], [`MEN`, `Mensuel`, `monthly`, 1800]],
  Np = [[`Aditi Ramdin (démo)`, `IND`, !0], [`Christophe Lebon (démo)`, `FAM`, !0], [`Farah Joomun (démo)`, `IND`, !0], [`Kevin Appadoo (démo)`, `JUN`, !1], [`Laura Bégué (démo)`, `SEN`, !0], [`Nitin Gopaul (démo)`, `IND`, !0], [`Sandrine Hoareau (démo)`, `FAM`, !0], [`Yannick Ramsamy (démo)`, `IND`, !1], [`Zara Peerbux (démo)`, `MEN`, !0], [`Olivier Desvaux (démo)`, `MEN`, !0], [`Priya Seewoo (démo)`, `IND`, !0], [`Thomas Li Kwong (démo)`, `FAM`, !0], [`Amina Dulloo (démo)`, `JUN`, !1], [`Gérard Maurel (démo)`, `SEN`, !1], [`Hélène Tsang (démo)`, `IND`, !0]],
  Pp = [[`bar`, `Bar - consommations`, 650], [`restaurant`, `Restaurant - déjeuner`, 1450], [`tennis`, `Location court de tennis`, 400], [`squash`, `Location court de squash`, 350], [`golf`, `Green fee invités`, 1200], [`shop`, `Boutique - balles et accessoires`, 890], [`events`, `Soirée du club`, 2500], [`restaurant`, `Restaurant - dîner`, 2200]],
  Fp = (e, t) => {
    let n = k(e, `SELECT * FROM users WHERE id = ?`, t);
    return {
      id: n.id,
      name: n.name,
      email: n.email,
      role: n.role,
      companyId: n.company_id
    };
  },
  Ip = e => `${Math.trunc(e / 100)}.${String(e % 100).padStart(2, `0`)}`;
async function Lp(e, t, n = new Date()) {
  let r = Yu();
  r.club.refPrefix = `CSD`, j(e, () => {
    A(e, `INSERT INTO companies (id, name, slug, vertical, plan, subscription_status, subscription_renews_at, settings_json, created_at) VALUES (?,?,?,?,?,?,?,?,?)`, Ap, `Club Sportif Démo`, `cs`, `club`, `pilote`, `essai`, N(Ie(n, 30)), JSON.stringify(r), N(Ie(n, -700)));
    for (let [t, r, i] of [[`admin`, `Véronique B. (démo)`, `company_admin`], [`secretariat`, `Arvind K. (démo)`, `dispatcher`], [`compta`, `Mélanie C. (démo)`, `finance`], [`accueil`, `Jean-Luc P. (démo)`, `agent`]]) A(e, `INSERT INTO users (id, company_id, name, email, role, created_at) VALUES (?,?,?,?,?,?)`, `u_cs_${t}`, Ap, r, `${t}@cs.exemple.invalid`, i, N(n));
    for (let [t, n, r, i] of Mp) A(e, `INSERT INTO club_plans (id, company_id, code, name, billing, fee_minor) VALUES (?,?,?,?,?,?)`, `plan_cs_${t.toLowerCase()}`, Ap, t, n, r, i * 100);
    A(e, `INSERT INTO gate_devices (id, company_id, name, created_at) VALUES (?,?,?,?)`, `gd_cs_main`, Ap, `Barrière entrée principale (démo)`, N(n));
  });
  let i = Fp(e, `u_cs_secretariat`),
    a = Fp(e, `u_cs_compta`),
    o = e => Ie(n, -e),
    s = Np.map(([t, n, r], a) => pf(e, i, {
      name: t,
      email: r ? `${t.split(` `)[0].toLowerCase()}.${a + 1}@membres.exemple.invalid` : ``,
      phone: `+230 5900 ${String(1100 + a)}`,
      planId: `plan_cs_${n.toLowerCase()}`
    }, o(700)).id),
    c = t => k(e, `SELECT * FROM members WHERE id = ?`, s[t]),
    l = async (n, r) => {
      let i = c(n),
        a = await Ef(e, t, Ap, i.id, `seed-link-${i.number}-${r.getTime()}`, jp, {
          id: `member:${i.number}`,
          role: `member`,
          companyId: Ap
        }, r),
        o = t.payments.link.simulate(a.payment.provider_ref, `success`, r);
      hp(e, t, `link`, o.rawBody, o.signature, r);
    },
    u = (n, i) => {
      let o = Re(n),
        s = r.payments.methods.link.feeBps,
        l = e.prepare(`SELECT provider_ref, amount_minor FROM member_payments WHERE company_id = ? AND method = 'link' AND status = 'confirmed' AND settlement_status = 'unsettled'`).all(Ap).map(e => {
          let t = Math.round(e.amount_minor * s / 1e4);
          return `${o};${e.provider_ref};REGLEMENT PAIEMENTS EN LIGNE;${Ip(e.amount_minor)};${Ip(t)};${Ip(e.amount_minor - t)}`;
        });
      i.forEach(([e, t], n) => l.push(`${o};VIR-${o.replace(/-/g, ``)}-${String(n + 1).padStart(2, `0`)};VIREMENT ${c(e).reference} COTISATION;${Ip(t)};0.00;${Ip(t)}`)), l.length && Xf(e, t, a, `releve-club-${o}.csv`, `date;reference;libelle;montant_brut;frais;montant_net\n${l.join(`
`)}\n`, n);
    },
    d = e => Mp.find(t => t[0] === e)[3] * 100,
    f = o(645);
  yf(e, a, String(f.getUTCFullYear()), f), u(Ie(f, 20), [0, 1, 2, 4, 5, 6, 10, 11, 14].map(e => [e, d(Np[e][1])])), Tf(e, a, s[3], d(`JUN`), `Espèces remises au secrétariat`, `seed-cash-prev-4`, Ie(f, 12)), Tf(e, a, s[12], d(`JUN`), `Espèces remises au secrétariat`, `seed-cash-prev-13`, Ie(f, 12)), mf(e, Fp(e, `u_cs_admin`), s[13], {
    status: `suspended`
  }, o(420));
  let p = o(280);
  yf(e, a, String(p.getUTCFullYear()), p), Tf(e, a, s[3], d(`JUN`), `Espèces remises au secrétariat`, `seed-cash-cur-4`, Ie(p, 10)), u(Ie(p, 25), [[0, d(`IND`)], [1, d(`FAM`)], [4, d(`SEN`)], [6, d(`FAM`)], [10, d(`IND`)], [5, d(`IND`) / 2]]), await l(2, Ie(p, 40)), u(Ie(p, 45), []), mf(e, Fp(e, `u_cs_admin`), s[14], {
    status: `resigned`
  }, o(100));
  let m = e => Re(e).slice(0, 7);
  for (let t of [3, 2, 1, 0]) {
    let r = new Date(n);
    r.setUTCDate(1), r.setUTCMonth(r.getUTCMonth() - t), r.setUTCDate(5), r.setUTCHours(6);
    let i = r > n ? n : r;
    yf(e, a, m(i), i), t > 0 && (await l(8, Ie(i, 3))), t === 3 && (await l(9, Ie(i, 4)));
  }
  s.push(pf(e, i, {
    name: `Rohan Bhugaloo (démo)`,
    email: `rohan.16@membres.exemple.invalid`,
    phone: `+230 5900 1115`,
    planId: `plan_cs_ind`
  }, o(20)).id);
  let h = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (let t = 0; t < 24; t++) {
    let [n, r, a] = Pp[t % Pp.length];
    gf(e, i, s[t >= 21 ? 15 : h[t * 5 % h.length]], {
      kind: `consumption`,
      outlet: n,
      label: r,
      amountMinor: (a + t % 3 * 50) * 100
    }, o(75 - t * 3));
  }
  for (let e of [0, 1, 4]) await l(e, o(40));
  u(o(35), [[11, d(`FAM`)]]);
  for (let e of [6, 10]) await l(e, o(10));
  If(e, a, jp, o(30)), If(e, a, jp, o(8));
  let g = e => new Date(n.getTime() - e * 36e5);
  for (let [t, n] of [[0, 4], [10, 3.5], [7, 3], [1, 2.5], [13, 2], [9, 1.5]]) Gf(e, Ap, `gd_cs_main`, c(t).badge, g(n));
  Gf(e, Ap, `gd_cs_main`, `B99999`, g(1)), await kp(e, t, Ap, {}, void 0, n);
}
var Rp = e => !!k(e, `SELECT 1 FROM companies LIMIT 1`),
  zp = `gate_events.gate_devices.member_reminders.member_payments.member_charges.members.club_plans.audit_log.sync_actions.daily_closes.erp_entries.exceptions.bank_lines.bank_statements.demo_provider_tx.payment_events.payments.invoices.deliveries.order_lines.orders.stock_movements.vehicle_stock.warehouse_stock.route_stops.routes.price_list_items.products.customers.price_lists.counters.users.companies`.split(`.`);
async function Bp(e, t, n = new Date()) {
  j(e, () => {
    for (let t of zp) e.exec(`DELETE FROM ${t}`);
  }), await Gp(e, t, n);
}
var Vp = [[`BIE-33`, `Bière blonde 33 cl`, `casier de 24`, 1150, 400], [`COL-150`, `Boisson gazeuse cola 1,5 L`, `pack de 6`, 390, 600], [`CIT-33`, `Soda citron 33 cl`, `casier de 24`, 520, 350], [`EAU-150`, `Eau plate 1,5 L`, `pack de 6`, 150, 900], [`EAG-50`, `Eau gazeuse 50 cl`, `pack de 12`, 260, 300], [`JUS-100`, `Jus de fruits 1 L`, `carton de 12`, 780, 250], [`MAL-33`, `Boisson maltée 33 cl`, `casier de 24`, 690, 200], [`ENE-25`, `Boisson énergisante 25 cl`, `pack de 24`, 1320, 120]],
  Hp = [[`tilakaz`, `Boutique Ti Lakaz (démo)`, `Route Royale, Grand-Baie`, `Nord`], [`bellevue`, `Supérette Belle Vue (démo)`, `Avenue des Flamboyants, Pereybère`, `Nord`, !0], [`lagon`, `Snack Lagon Bleu (démo)`, `Front de mer, Trou-aux-Biches`, `Nord`], [`flamboyant`, `Restaurant Le Flamboyant (démo)`, `Rue du Marché, Triolet`, `Nord`], [`central`, `Tabagie Centrale (démo)`, `Rue Châteauneuf, Curepipe`, `Centre`], [`plaza`, `Supermarché Plaza (démo)`, `Route Saint-Jean, Quatre-Bornes`, `Centre`, !0], [`corail`, `Hôtel Baie Corail (démo)`, `Route côtière, Mahébourg`, `Sud`, !0], [`bambou`, `Boutique Bambou (démo)`, `Rue des Tulipes, Rose-Belle`, `Sud`], [`soleil`, `Snack Soleil (démo)`, `Place du Marché, Mahébourg`, `Sud`]];
function Up(e, t, n, r, i, a, o, s, c = Vp, l = Hp) {
  A(e, `INSERT INTO companies (id, name, slug, plan, subscription_status, subscription_renews_at, settings_json, created_at) VALUES (?,?,?,?,?,?,?,?)`, t, n, r, i, a, N(Ie(o, 30)), JSON.stringify(Yu()), N(o));
  for (let [n, i, a] of s) A(e, `INSERT INTO users (id, company_id, name, email, role, created_at) VALUES (?,?,?,?,?,?)`, `u_${r}_${n}`, t, i, `${n}@${r}.exemple.invalid`, a, N(o));
  A(e, `INSERT INTO price_lists (id, company_id, name) VALUES (?,?,?)`, `pl_${r}_gc`, t, `Grands comptes (-5 %)`);
  for (let [n, i, a, o, s] of c) {
    let c = `p_${r}_${n.toLowerCase()}`;
    A(e, `INSERT INTO products (id, company_id, sku, name, unit, price_minor) VALUES (?,?,?,?,?,?)`, c, t, n, i, a, o * 100), A(e, `INSERT INTO warehouse_stock (company_id, product_id, qty) VALUES (?,?,?)`, t, c, s), A(e, `INSERT INTO price_list_items (price_list_id, product_id, price_minor) VALUES (?,?,?)`, `pl_${r}_gc`, c, Math.round(o * 95));
  }
  l.forEach(([n, i, a, o, s], c) => A(e, `INSERT INTO customers (id, company_id, code, name, address, zone, phone, price_list_id) VALUES (?,?,?,?,?,?,?,?)`, `c_${r}_${n}`, t, `C${String(c + 1).padStart(3, `0`)}`, i, a, o, `+230 5000 ${String(1e3 + c)}`, s ? `pl_${r}_gc` : null));
}
var Wp = (e, t) => {
  let n = k(e, `SELECT * FROM users WHERE id = ?`, t);
  return {
    id: n.id,
    name: n.name,
    email: n.email,
    role: n.role,
    companyId: n.company_id
  };
};
async function Gp(e, t, n = new Date()) {
  let r = Re(n),
    i = Ie(n, -1),
    a = Re(i);
  j(e, () => {
    A(e, `INSERT INTO users (id, company_id, name, email, role, created_at) VALUES ('u_platform', NULL, 'Équipe plateforme MIPS (démo)', 'plateforme@mips.exemple.invalid', 'platform_admin', ?)`, N(n)), Up(e, `co_bd`, `Boissons Démo Ltée`, `bd`, `pilote`, `essai`, n, [[`admin`, `Anjali R. (démo)`, `company_admin`], [`centrale`, `Kevin L. (démo)`, `dispatcher`], [`finance`, `Sophie M. (démo)`, `finance`], [`agent1`, `Ravi D. (démo)`, `agent`], [`agent2`, `Nadia P. (démo)`, `agent`]]), Up(e, `co_go`, `Grossiste Démo Océan`, `go`, `standard`, `actif`, n, [[`admin`, `Marc T. (démo)`, `company_admin`], [`centrale`, `Priya S. (démo)`, `dispatcher`], [`finance`, `Jean C. (démo)`, `finance`], [`agent1`, `Yusuf A. (démo)`, `agent`]], Vp.slice(1, 6), Hp.slice(4, 8));
  });
  let o = (e, t) => `p_${e}_${t.toLowerCase()}`,
    s = (e, t, n) => ({
      productId: o(e, t),
      qty: n
    }),
    c = Wp(e, `u_bd_centrale`),
    l = Wp(e, `u_bd_agent1`),
    u = Wp(e, `u_bd_finance`),
    d = [`paystation`, `card_tpe`, `juice`, `link`],
    f = [[`Est - Flacq`, `Camion 05 (démo)`], [`Ouest - Tamarin`, `Camion 09 (démo)`]],
    p = Hp.map(([e]) => `c_bd_${e}`),
    m = Vp.map(([e]) => e),
    h = [`M. Paul`, `Mme Devi`, `M. Ali`, `Mme Lakshmi`, `M. Kumar`],
    g = (n, r, i, a) => {
      let o = t.payments[r].simulate(n, i, a);
      hp(e, t, r, o.rawBody, o.signature, a);
    };
  for (let r = 6; r >= 2; r--) {
    let i = Ie(n, -r),
      a = Re(i),
      o = Wp(e, r % 2 ? `u_bd_agent1` : `u_bd_agent2`),
      [l, _] = f[r % 2],
      v = _d(e, c, {
        name: l,
        day: a,
        agentId: o.id,
        vehicle: _,
        customerIds: []
      }, i).id,
      y = [0, 1, 2].map(t => ud(e, c, {
        customerId: p[(r * 2 + t) % p.length],
        routeId: v,
        note: ``,
        lines: [s(`bd`, m[(r + t) % 8], 4 + (r + t) % 5 * 2), s(`bd`, m[(r + t + 3) % 8], 6 + t * 3)]
      }, i).id);
    for (let t of y) fd(e, c, t, `prepared`, i);
    yd(e, c, v, [s(`bd`, `COL-150`, 12), s(`bd`, `EAU-150`, 12)], i), Td(e, o, v, i);
    let b = y.map((t, n) => {
      let a = +(n === 1 && r % 3 == 0),
        s = O(e, `SELECT id, qty_ordered FROM order_lines WHERE order_id = ?`, t);
      return Id(e, o, {
        id: `seed-${t}`,
        type: `deliver`,
        payload: {
          orderId: t,
          lines: s.map((e, t) => ({
            lineId: e.id,
            qtyDelivered: t === 0 ? e.qty_ordered - a : e.qty_ordered
          })),
          reason: a ? `Casier endommagé au déchargement` : ``,
          pod: {
            name: `${h[(r + n) % h.length]} (réception)`,
            note: ``
          },
          at: N(i)
        }
      }, i).result;
    });
    b.push(Id(e, o, {
      id: `seed-sale-j${r}`,
      type: `sale`,
      payload: {
        routeId: v,
        customerId: p[(r * 2 + 4) % p.length],
        lines: [s(`bd`, `COL-150`, 3 + r), s(`bd`, `EAU-150`, 6)],
        pod: {
          name: h[r % h.length],
          note: ``
        },
        at: N(i)
      }
    }, i).result);
    for (let [n, a] of b.entries()) {
      if (n === 0 && r % 2 == 0) {
        let n = (await dp(e, t, o, {
          invoiceId: a.invoiceId,
          method: `card_tpe`,
          amountMinor: a.amountMinor,
          idempotencyKey: `seed-${a.invoiceId}-refus`
        }, `http://127.0.0.1`, i)).payment;
        g(n.provider_ref, `card_tpe`, `failure`, i);
      }
      let s = d[(r + n) % d.length],
        c = (await dp(e, t, o, {
          invoiceId: a.invoiceId,
          method: s,
          amountMinor: a.amountMinor,
          idempotencyKey: `seed-${a.invoiceId}-${s}`
        }, `http://127.0.0.1`, i)).payment;
      g(c.provider_ref, s, `success`, i);
    }
    Ld(e, o, v, i), Cp(e, t, u, `releve-demo-${a}.csv`, Sp(e, `co_bd`, !1, i), i), await kp(e, t, `co_bd`, {}, void 0, i);
    for (let t of O(e, `SELECT id FROM exceptions WHERE company_id = 'co_bd' AND status = 'open' AND domain = 'ops'`)) Rd(e, c, t.id, [`ops`], `approved`, `Avoir émis au commerce (démonstration)`, i);
    Ep(e, u, a, i);
  }
  let _ = _d(e, c, {
      name: `Sud - Mahébourg`,
      day: a,
      agentId: l.id,
      vehicle: `Camion 12 (démo)`,
      customerIds: []
    }, i).id,
    v = ud(e, c, {
      customerId: `c_bd_corail`,
      routeId: _,
      note: ``,
      lines: [s(`bd`, `BIE-33`, 10), s(`bd`, `EAU-150`, 30)]
    }, i).id,
    y = ud(e, c, {
      customerId: `c_bd_bambou`,
      routeId: _,
      note: ``,
      lines: [s(`bd`, `COL-150`, 12), s(`bd`, `CIT-33`, 6)]
    }, i).id;
  for (let t of [v, y]) fd(e, c, t, `prepared`, i);
  yd(e, c, _, [s(`bd`, `COL-150`, 20), s(`bd`, `JUS-100`, 10)], i), Td(e, l, _, i);
  let b = t => O(e, `SELECT id, qty_ordered FROM order_lines WHERE order_id = ?`, t),
    ee = (t, n, r = 0) => Id(e, l, {
      id: `seed-${t}`,
      type: `deliver`,
      payload: {
        orderId: t,
        lines: b(t).map((e, t) => ({
          lineId: e.id,
          qtyDelivered: t === 0 ? e.qty_ordered - r : e.qty_ordered
        })),
        reason: r ? `Casier endommagé au déchargement` : ``,
        pod: {
          name: n,
          note: ``
        },
        at: N(i)
      }
    }, i).result,
    x = async (n, r, a) => {
      let {
          payment: o
        } = await dp(e, t, l, {
          invoiceId: n,
          method: r,
          amountMinor: a,
          idempotencyKey: `seed-${n}-${r}`
        }, `http://127.0.0.1`, i),
        s = t.payments[r].simulate(o.provider_ref, `success`, i);
      hp(e, t, r, s.rawBody, s.signature, i);
    },
    S = ee(v, `M. Paul (réception)`);
  await x(S.invoiceId, `juice`, S.amountMinor);
  let C = ee(y, `Mme Devi`, 1);
  await x(C.invoiceId, `card_tpe`, C.amountMinor);
  let w = Id(e, l, {
    id: `seed-sale-1`,
    type: `sale`,
    payload: {
      routeId: _,
      customerId: `c_bd_soleil`,
      lines: [s(`bd`, `COL-150`, 8), s(`bd`, `JUS-100`, 4)],
      pod: {
        name: `M. Ali`,
        note: ``
      },
      at: N(i)
    }
  }, i).result;
  await x(w.invoiceId, `paystation`, w.amountMinor), Ld(e, l, _, i);
  let te = k(e, `SELECT provider_ref FROM payments WHERE invoice_id = ?`, S.invoiceId).provider_ref,
    T = Math.round(S.amountMinor * Yu().payments.methods.juice.feeBps / 1e4),
    E = e => `${Math.trunc(e / 100)}.${String(e % 100).padStart(2, `0`)}`;
  Cp(e, t, Wp(e, `u_bd_finance`), `releve-demo-${a}.csv`, `date;reference;libelle;montant_brut;frais;montant_net\n${a};${te};REGLEMENT JUICE;${E(S.amountMinor)};${E(T)};${E(S.amountMinor - T)}\n`, i), await kp(e, t, `co_bd`, {}, void 0, i);
  let ne = _d(e, c, {
      name: `Nord - Grand-Baie`,
      day: r,
      agentId: l.id,
      vehicle: `Camion 07 (démo)`,
      customerIds: [`c_bd_tilakaz`, `c_bd_bellevue`, `c_bd_lagon`, `c_bd_flamboyant`]
    }, n).id,
    re = ud(e, c, {
      customerId: `c_bd_tilakaz`,
      routeId: ne,
      note: `Livrer avant 11 h`,
      lines: [s(`bd`, `BIE-33`, 6), s(`bd`, `COL-150`, 10), s(`bd`, `EAU-150`, 12)]
    }, n).id,
    ie = ud(e, c, {
      customerId: `c_bd_bellevue`,
      routeId: ne,
      note: ``,
      lines: [s(`bd`, `COL-150`, 24), s(`bd`, `CIT-33`, 8), s(`bd`, `JUS-100`, 6)]
    }, n).id,
    ae = ud(e, c, {
      customerId: `c_bd_lagon`,
      routeId: ne,
      note: ``,
      lines: [s(`bd`, `BIE-33`, 4), s(`bd`, `EAG-50`, 5)]
    }, n).id;
  for (let t of [re, ie, ae]) fd(e, c, t, `prepared`, n);
  yd(e, c, ne, [s(`bd`, `COL-150`, 30), s(`bd`, `EAU-150`, 40), s(`bd`, `BIE-33`, 10), s(`bd`, `MAL-33`, 8), s(`bd`, `ENE-25`, 4)], n);
  let oe = _d(e, c, {
    name: `Centre - Curepipe`,
    day: r,
    agentId: `u_bd_agent2`,
    vehicle: `Camion 03 (démo)`,
    customerIds: [`c_bd_central`, `c_bd_plaza`]
  }, n).id;
  ud(e, c, {
    customerId: `c_bd_central`,
    routeId: oe,
    note: ``,
    lines: [s(`bd`, `COL-150`, 6), s(`bd`, `EAU-150`, 10)]
  }, n), ud(e, c, {
    customerId: `c_bd_plaza`,
    routeId: oe,
    note: `Quai de livraison n° 2`,
    lines: [s(`bd`, `BIE-33`, 20), s(`bd`, `JUS-100`, 15), s(`bd`, `ENE-25`, 6)]
  }, n), ud(e, c, {
    customerId: `c_bd_corail`,
    note: `À affecter`,
    lines: [s(`bd`, `EAU-150`, 50), s(`bd`, `EAG-50`, 20)]
  }, n);
  let se = Wp(e, `u_go_centrale`),
    ce = _d(e, se, {
      name: `Centre - Quatre-Bornes`,
      day: r,
      agentId: `u_go_agent1`,
      vehicle: `Fourgon 1 (démo)`,
      customerIds: [`c_go_central`, `c_go_plaza`]
    }, n).id,
    le = ud(e, se, {
      customerId: `c_go_plaza`,
      routeId: ce,
      note: ``,
      lines: [s(`go`, `COL-150`, 10), s(`go`, `EAU-150`, 20)]
    }, n).id;
  fd(e, se, le, `prepared`, n), yd(e, se, ce, [s(`go`, `CIT-33`, 10)], n), await Lp(e, t, n);
}

export { Ap, Bp, Fp, Gp, Hp, Ip, Lp, Mp, Np, Pp, Rp, Up, Vp, Wp, jp, zp };
