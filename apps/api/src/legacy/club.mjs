// GENERATED (step 1a, stage 2): v0.1.0 "club" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TypeScript in the following commits.
/* eslint-disable */
import { Wd } from "./connectors.mjs";
import { A, Fe, He, M, N, O, P, Re, Ve, j, k, ze } from "./core.mjs";
import { Ju, U, W, Xu, Zu, ed } from "./distribution.mjs";
import { he, me } from "./lib.mjs";

var Xd = e => e.companyId,
  Zd = e => `${e < 0 ? `-` : ``}${Math.trunc(Math.abs(e) / 100)}.${String(Math.abs(e) % 100).padStart(2, `0`)}`,
  Qd = e => Date.UTC(Number(e.slice(0, 4)), Number(e.slice(5, 7)) - 1, Number(e.slice(8, 10))) / 864e5,
  $d = (e, t) => new Date((Qd(e) + t) * 864e5).toISOString().slice(0, 10),
  ef = (e, t) => Qd(t) - Qd(e),
  tf = e => String(97 - Number(e) * 100 % 97).padStart(2, `0`),
  nf = (e, t) => `${e}-${t}-${tf(t)}`;
function rf(e, t) {
  let n = RegExp(`\\b${t}[\\s-]?(\\d{5})[\\s-]?(\\d{2})\\b`, `i`).exec(e);
  return n ? {
    number: n[1],
    valid: tf(n[1]) === n[2],
    raw: n[0]
  } : null;
}
var af = (e, t, n) => {
    let r = k(e, `SELECT * FROM members WHERE id = ? AND company_id = ?`, n, t);
    if (!r) throw ze(`Membre`);
    return r;
  },
  of = (e, t, n) => {
    let r = k(e, `SELECT * FROM member_payments WHERE id = ? AND company_id = ?`, n, t);
    if (!r) throw ze(`Paiement`);
    return r;
  },
  sf = (e, t) => t.kind === `dues` ? e.accounts.dues : t.kind === `fee` ? e.accounts.fee : e.accounts.outlets[Ju.includes(t.outlet) ? t.outlet : `other`];
function cf(e, t, n, r = !1) {
  let i = (r ? t.cancelled_at : t.created_at).slice(0, 10),
    a = `${r ? `Annulation ` : ``}${t.label} - ${n.name}`.slice(0, 80),
    [o, s] = r ? [0, t.amount_minor] : [t.amount_minor, 0];
  return [{
    date: i,
    journal: e.journals.sales,
    account: e.accounts.receivable,
    aux: `M${n.number}`,
    piece: t.number,
    label: a,
    debit: o,
    credit: s
  }, {
    date: i,
    journal: e.journals.sales,
    account: sf(e, t),
    aux: ``,
    piece: t.number,
    label: a,
    debit: s,
    credit: o
  }];
}
function lf(e, t, n) {
  let r = (t.confirmed_at ?? t.created_at).slice(0, 10),
    i = t.method === `cash` ? e.journals.cash : e.journals.bank,
    a = t.method === `cash` ? e.accounts.cash : t.method === `link` ? e.accounts.transit : e.accounts.bank,
    o = t.provider_ref ?? t.reference,
    s = `Encaissement ${t.method === `link` ? `en ligne` : t.method === `cash` ? `espèces` : `virement`} - ${n.name}`.slice(0, 80);
  return [{
    date: r,
    journal: i,
    account: a,
    aux: ``,
    piece: o,
    label: s,
    debit: t.amount_minor,
    credit: 0
  }, {
    date: r,
    journal: i,
    account: e.accounts.receivable,
    aux: `M${n.number}`,
    piece: o,
    label: s,
    debit: 0,
    credit: t.amount_minor
  }];
}
function uf(e, t) {
  let n = t.settled_at.slice(0, 10),
    r = t.fee_actual_minor ?? 0,
    i = `Règlement paiement en ligne ${t.provider_ref}`;
  return [{
    date: n,
    journal: e.journals.bank,
    account: e.accounts.bank,
    aux: ``,
    piece: t.provider_ref,
    label: i,
    debit: t.amount_minor - r,
    credit: 0
  }, ...(r ? [{
    date: n,
    journal: e.journals.bank,
    account: e.accounts.fees,
    aux: ``,
    piece: t.provider_ref,
    label: i,
    debit: r,
    credit: 0
  }] : []), {
    date: n,
    journal: e.journals.bank,
    account: e.accounts.transit,
    aux: ``,
    piece: t.provider_ref,
    label: i,
    debit: 0,
    credit: t.amount_minor
  }];
}
function df(e, t) {
  let n = k(e, `SELECT COALESCE(SUM(amount_minor), 0) AS n FROM member_payments WHERE member_id = ? AND status = 'confirmed'`, t).n;
  for (let r of O(e, `SELECT * FROM member_charges WHERE member_id = ? AND status != 'cancelled' ORDER BY due_date, created_at, rowid`, t)) {
    let t = Math.min(r.amount_minor, Math.max(n, 0));
    n -= t, A(e, `UPDATE member_charges SET allocated_minor = ?, status = ? WHERE id = ?`, t, t >= r.amount_minor ? `paid` : `open`, r.id);
  }
}
function ff(e, t, n) {
  let r = k(e, `SELECT COALESCE(SUM(amount_minor), 0) AS n FROM member_charges WHERE member_id = ? AND status != 'cancelled'`, t).n,
    i = k(e, `SELECT COALESCE(SUM(amount_minor), 0) AS n FROM member_payments WHERE member_id = ? AND status = 'confirmed'`, t).n,
    a = O(e, `SELECT id, due_date, amount_minor - allocated_minor AS rest FROM member_charges WHERE member_id = ? AND status = 'open' AND due_date < ? ORDER BY due_date, created_at, rowid`, t, n),
    o = r - i;
  return {
    chargedMinor: r,
    paidMinor: i,
    balanceMinor: o,
    dueMinor: Math.max(o, 0),
    creditMinor: Math.max(-o, 0),
    overdueMinor: a.reduce((e, t) => e + t.rest, 0),
    overdueDays: a[0] ? ef(a[0].due_date, n) : 0,
    oldestOverdueId: a[0]?.id ?? null
  };
}
function pf(e, t, n, r = new Date()) {
  let i = Xd(t);
  return j(e, () => {
    if (n.planId && !k(e, `SELECT 1 FROM club_plans WHERE id = ? AND company_id = ? AND active = 1`, n.planId, i)) throw ze(`Catégorie d'adhésion`);
    A(e, `INSERT INTO counters (company_id, name, value) VALUES (?, 'member', 1) ON CONFLICT (company_id, name) DO UPDATE SET value = value + 1`, i);
    let a = String(k(e, `SELECT value FROM counters WHERE company_id = ? AND name = 'member'`, i).value).padStart(5, `0`),
      o = (n.badge?.trim() || `B${a}`).toUpperCase();
    if (k(e, `SELECT 1 FROM members WHERE company_id = ? AND badge = ?`, i, o)) throw new P(409, `badge_taken`, `Ce badge est déjà attribué à un autre membre.`);
    let s = nf(Xu(e, i).club.refPrefix, a),
      c = Fe(`mbr`);
    return A(e, `INSERT INTO members (id, company_id, number, name, email, phone, plan_id, reference, badge, portal_token, joined_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, c, i, a, n.name.trim(), n.email.trim().toLowerCase(), n.phone.trim(), n.planId, s, o, M(), Re(r), N(r)), He(e, t, `member.created`, `member`, c, {
      number: a,
      name: n.name
    }, i, r), {
      id: c,
      number: a,
      reference: s
    };
  });
}
function mf(e, t, n, r, i = new Date()) {
  let a = Xd(t);
  j(e, () => {
    let o = af(e, a, n);
    if (r.planId && !k(e, `SELECT 1 FROM club_plans WHERE id = ? AND company_id = ?`, r.planId, a)) throw ze(`Catégorie d'adhésion`);
    r.status && A(e, `UPDATE members SET status = ? WHERE id = ?`, r.status, o.id), r.planId !== void 0 && A(e, `UPDATE members SET plan_id = ? WHERE id = ?`, r.planId, o.id), r.email !== void 0 && A(e, `UPDATE members SET email = ? WHERE id = ?`, r.email.trim().toLowerCase(), o.id), r.phone !== void 0 && A(e, `UPDATE members SET phone = ? WHERE id = ?`, r.phone.trim(), o.id), He(e, t, `member.updated`, `member`, o.id, {
      number: o.number,
      ...r
    }, a, i);
  });
}
function hf(e, t, n, r, i) {
  let a = Fe(`chg`),
    o = Zu(e, n.company_id, `member_charge`, `MC`);
  A(e, `INSERT INTO member_charges (id, company_id, member_id, number, kind, outlet, label, period, amount_minor, due_date, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, a, n.company_id, n.id, o, r.kind, r.outlet, r.label, r.period, r.amountMinor, r.dueDate, t.id, N(i));
  let s = k(e, `SELECT * FROM member_charges WHERE id = ?`, a),
    c = Xu(e, n.company_id).club;
  return W(e, n.company_id, `member_charge`, a, `${r.label} - ${n.name}`, r.amountMinor, {
    member: n.number,
    number: o,
    kind: r.kind,
    outlet: r.outlet,
    lines: cf(c, s, n)
  }, i), df(e, n.id), a;
}
function gf(e, t, n, r, i = new Date()) {
  let a = Xd(t);
  return j(e, () => {
    let o = af(e, a, n);
    if (o.status !== `active`) throw new P(409, `member_inactive`, `Ce membre n'est pas actif : aucune consommation ne peut être imputée à son compte.`);
    let s = $d(Re(i), Xu(e, a).club.dueDays),
      c = hf(e, t, o, {
        kind: r.kind,
        outlet: r.outlet,
        label: r.label.trim(),
        period: null,
        amountMinor: r.amountMinor,
        dueDate: s
      }, i);
    return He(e, t, `member.charged`, `member_charge`, c, {
      member: o.number,
      kind: r.kind,
      outlet: r.outlet,
      amountMinor: r.amountMinor
    }, a, i), {
      id: c
    };
  });
}
function _f(e, t, n, r, i = new Date()) {
  let a = Xd(t);
  j(e, () => {
    let o = k(e, `SELECT * FROM member_charges WHERE id = ? AND company_id = ?`, n, a);
    if (!o) throw ze(`Dû`);
    if (o.status === `cancelled`) throw new P(409, `bad_status`, `Ce dû est déjà annulé.`);
    A(e, `UPDATE member_charges SET status = 'cancelled', allocated_minor = 0, cancel_reason = ?, cancelled_at = ? WHERE id = ?`, r, N(i), o.id);
    let s = k(e, `SELECT * FROM members WHERE id = ?`, o.member_id),
      c = k(e, `SELECT * FROM member_charges WHERE id = ?`, o.id);
    W(e, a, `member_charge`, `${o.id}:annulation`, `Annulation ${o.label} - ${s.name}`, -o.amount_minor, {
      member: s.number,
      number: o.number,
      reason: r,
      lines: cf(Xu(e, a).club, c, s, !0)
    }, i), df(e, o.member_id), He(e, t, `member_charge.cancelled`, `member_charge`, o.id, {
      member: s.number,
      number: o.number,
      amountMinor: o.amount_minor,
      reason: r
    }, a, i);
  });
}
var vf = e => /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(e);
function yf(e, t, n, r = new Date()) {
  let i = Xd(t);
  if (!vf(n)) throw new P(400, `invalid_input`, `Période invalide (AAAA ou AAAA-MM).`);
  let a = n.length === 4 ? `annual` : `monthly`;
  return j(e, () => {
    let o = $d(Re(r), Xu(e, i).club.dueDays),
      s = {
        created: 0,
        skipped: 0,
        amountMinor: 0
      },
      c = O(e, `SELECT m.*, p.name AS plan_name, p.fee_minor FROM members m JOIN club_plans p ON p.id = m.plan_id
      WHERE m.company_id = ? AND m.status = 'active' AND p.billing = ? AND p.active = 1 ORDER BY m.number`, i, a);
    for (let a of c) k(e, `SELECT 1 FROM member_charges WHERE company_id = ? AND member_id = ? AND kind = 'dues' AND period = ? AND status != 'cancelled'`, i, a.id, n) ? s.skipped++ : (hf(e, t, a, {
      kind: `dues`,
      outlet: ``,
      label: `Cotisation ${n} - ${a.plan_name}`,
      period: n,
      amountMinor: a.fee_minor,
      dueDate: o
    }, r), s.created++, s.amountMinor += a.fee_minor);
    return He(e, t, `dues.billed`, `dues`, n, {
      period: n,
      ...s
    }, i, r), s;
  });
}
function bf(e, t) {
  return {
    plans: O(e, `SELECT p.id, p.code, p.name, p.billing, p.fee_minor, p.active, (SELECT COUNT(*) FROM members m WHERE m.plan_id = p.id AND m.status = 'active') AS members
      FROM club_plans p WHERE p.company_id = ? ORDER BY p.billing, p.fee_minor DESC`, t),
    periods: O(e, `SELECT period, COUNT(*) AS count, SUM(amount_minor) AS amount_minor, SUM(allocated_minor) AS collected_minor, MIN(created_at) AS billed_at
      FROM member_charges WHERE company_id = ? AND kind = 'dues' AND status != 'cancelled' GROUP BY period ORDER BY period DESC LIMIT 36`, t)
  };
}
function xf(e, t, n) {
  A(e, `UPDATE member_payments SET updated_at = ? WHERE id = ?`, N(n), t);
}
function Sf(e, t, n, r, i) {
  if (t.status === `confirmed`) return !1;
  A(e, `UPDATE member_payments SET status = 'confirmed', confirmed_at = ?, confirmed_via = ?, failure_reason = NULL, verify_reason = NULL WHERE id = ?`, N(i), n, t.id), xf(e, t.id, i), df(e, t.member_id);
  let a = k(e, `SELECT * FROM members WHERE id = ?`, t.member_id),
    o = k(e, `SELECT * FROM member_payments WHERE id = ?`, t.id);
  return W(e, t.company_id, `member_payment`, t.id, `Encaissement ${a.number} (${t.method})`, t.amount_minor, {
    member: a.number,
    method: t.method,
    reference: t.reference,
    providerRef: t.provider_ref,
    confirmedVia: n,
    lines: lf(Xu(e, t.company_id).club, o, a)
  }, i), ed(e, t.company_id, [`payment_to_verify`, `amount_mismatch`], t.id, `Confirmé (${n}).`, i), He(e, r, `member_payment.confirmed`, `member_payment`, t.id, {
    member: a.number,
    method: t.method,
    amountMinor: t.amount_minor,
    via: n
  }, t.company_id, i), !0;
}
function Cf(e, t, n, r, i) {
  return t.status !== `pending` && t.status !== `to_verify` ? !1 : (A(e, `UPDATE member_payments SET status = 'failed', failure_reason = ?, verify_reason = NULL WHERE id = ?`, n, t.id), xf(e, t.id, i), ed(e, t.company_id, [`payment_to_verify`], t.id, `Échec confirmé par le prestataire.`, i), He(e, r, `member_payment.failed`, `member_payment`, t.id, {
    method: t.method,
    amountMinor: t.amount_minor,
    reason: n
  }, t.company_id, i), !0);
}
function wf(e, t, n, r, i) {
  if (t.status !== `pending`) return !1;
  A(e, `UPDATE member_payments SET status = 'to_verify', verify_reason = ? WHERE id = ?`, n, t.id), xf(e, t.id, i);
  let a = k(e, `SELECT number FROM members WHERE id = ?`, t.member_id);
  return U(e, t.company_id, `finance`, `payment_to_verify`, `member_payment`, t.id, `Paiement en ligne à vérifier pour le membre ${a.number} : ${n}`, {
    member: a.number,
    method: t.method,
    amountMinor: t.amount_minor,
    providerRef: t.provider_ref
  }, i), He(e, r, `member_payment.to_verify`, `member_payment`, t.id, {
    member: a.number,
    reason: n
  }, t.company_id, i), !0;
}
function Tf(e, t, n, r, i, a, o = new Date()) {
  let s = Xd(t);
  return j(e, () => {
    let c = af(e, s, n),
      l = k(e, `SELECT * FROM member_payments WHERE company_id = ? AND idempotency_key = ?`, s, a);
    if (l) {
      if (l.member_id !== c.id || l.amount_minor !== r || l.method !== `cash`) throw new P(409, `idempotency_conflict`, `Cette clé d'idempotence a déjà servi pour une autre demande.`);
      return {
        payment: l,
        replayed: !0
      };
    }
    let u = Fe(`mpay`);
    return A(e, `INSERT INTO member_payments (id, company_id, member_id, method, amount_minor, currency, status, idempotency_key, reference, note, created_by, created_at, updated_at)
      VALUES (?,?,?,'cash',?,?,'pending',?,?,?,?,?,?)`, u, s, c.id, r, `MUR`, a, c.reference, i, t.id, N(o), N(o)), Sf(e, of(e, s, u), `cash_desk`, t, o), {
      payment: of(e, s, u),
      replayed: !1
    };
  });
}
async function Ef(e, t, n, r, i, a, o, s = new Date()) {
  let c = Xu(e, n),
    l = j(e, () => {
      let t = af(e, n, r),
        a = k(e, `SELECT * FROM member_payments WHERE company_id = ? AND idempotency_key = ?`, n, i);
      if (a) {
        if (a.member_id !== t.id || a.method !== `link`) throw new P(409, `idempotency_conflict`, `Cette clé d'idempotence a déjà servi pour une autre demande.`);
        return {
          payment: a,
          m: t,
          replayed: !0
        };
      }
      if (!c.payments.methods.link.enabled) throw new P(400, `method_disabled`, `Le paiement en ligne n'est pas activé pour ce club.`);
      let l = k(e, `SELECT * FROM member_payments WHERE member_id = ? AND method = 'link' AND status IN ('pending','to_verify') ORDER BY created_at DESC LIMIT 1`, t.id);
      if (l?.status === `pending`) return {
        payment: l,
        m: t,
        replayed: !0
      };
      if (l) throw new P(409, `attempt_in_progress`, `Un paiement est à vérifier pour ce membre : nouvelle tentative bloquée pour éviter un double débit.`);
      let u = ff(e, t.id, Re(s)).dueMinor;
      if (u <= 0) throw new P(409, `nothing_due`, `Aucun montant n'est dû sur ce compte.`);
      let d = Fe(`mpay`),
        f = new Date(s.getTime() + c.payments.attemptMinutes * 6e4);
      return A(e, `INSERT INTO member_payments (id, company_id, member_id, method, amount_minor, currency, status, idempotency_key, reference, created_by, created_at, updated_at, expires_at)
      VALUES (?,?,?,'link',?,?,'pending',?,?,?,?,?,?)`, d, n, t.id, u, `MUR`, i, t.reference, o.id, N(s), N(s), N(f)), He(e, o, `member_payment.initiated`, `member_payment`, d, {
        member: t.number,
        method: `link`,
        amountMinor: u
      }, n, s), {
        payment: of(e, n, d),
        m: t,
        replayed: !1
      };
    });
  if (l.replayed) return {
    payment: l.payment,
    replayed: !0
  };
  let u = l.payment;
  try {
    A(e, `UPDATE member_payments SET provider_ref = ? WHERE id = ?`, (await t.payments.link.initiate({
      paymentId: u.id,
      idempotencyKey: u.idempotency_key,
      companyId: n,
      merchantRef: c.payments.methods.link.merchantRef,
      amountMinor: u.amount_minor,
      currency: u.currency,
      invoiceNumber: l.m.reference,
      payUrl: `${a}/membre/${l.m.portal_token}`,
      expiresAt: new Date(u.expires_at)
    })).providerRef, u.id);
  } catch (t) {
    j(e, () => Cf(e, u, `Le prestataire n'a pas pu initier le paiement.`, o, s)), console.error(`Initiation de paiement membre en échec :`, t instanceof Error ? t.message : `erreur inconnue`);
  }
  return {
    payment: of(e, n, u.id),
    replayed: !1
  };
}
async function Df(e, t, n, r, i = new Date()) {
  let a = Xd(n),
    o = of(e, a, r);
  if (o.method === `link` && (o.status === `pending` || o.status === `to_verify`) && o.provider_ref) {
    let s = await t.payments.link.queryStatus(o.provider_ref);
    j(e, () => {
      let t = of(e, a, r);
      s === `succeeded` ? Sf(e, t, `status_query`, n, i) : s === `failed` ? Cf(e, t, `Refusé ou annulé chez le prestataire.`, n, i) : s === `unknown` ? wf(e, t, `Le prestataire ne connaît pas cette référence.`, n, i) : t.expires_at && N(i) > t.expires_at && wf(e, t, `Sans réponse du prestataire après expiration du délai.`, n, i);
    });
  }
  return of(e, a, r);
}
function Of(e, t, n, r) {
  let i = k(e, `SELECT * FROM member_payments WHERE method = ? AND provider_ref = ?`, t, n.providerRef);
  if (!i) return null;
  let a;
  return n.amountMinor !== i.amount_minor || n.currency !== i.currency ? (a = `amount_mismatch`, wf(e, i, `Montant ou devise notifié différent de la demande.`, Ve, r), U(e, i.company_id, `finance`, `amount_mismatch`, `member_payment`, i.id, `Notification ${t} incohérente : ${Zd(n.amountMinor)} ${n.currency} notifié pour ${Zd(i.amount_minor)} ${i.currency} demandé.`, {
    providerRef: i.provider_ref,
    notifiedMinor: n.amountMinor,
    expectedMinor: i.amount_minor
  }, r)) : a = n.type === `payment.succeeded` ? Sf(e, i, `notification`, Ve, r) ? `confirmed` : `already_confirmed` : Cf(e, i, n.failureReason ?? `Refusé par le prestataire.`, Ve, r) ? `failed` : `ignored`, {
    result: a,
    paymentId: i.id,
    companyId: i.company_id
  };
}
function kf(e, t, n = {}) {
  let r = [`p.company_id = ?`],
    i = [t];
  return n.status && (r.push(`p.status = ?`), i.push(n.status)), n.method && (r.push(`p.method = ?`), i.push(n.method)), O(e, `SELECT p.id, p.created_at, p.confirmed_at, p.settled_at, p.method, p.amount_minor, p.status, p.settlement_status, p.provider_ref, p.reference, p.confirmed_via,
      p.failure_reason, p.verify_reason, p.fee_actual_minor, p.note, m.id AS member_id, m.number AS member_number, m.name AS member
    FROM member_payments p JOIN members m ON m.id = p.member_id WHERE ${r.join(` AND `)} ORDER BY p.created_at DESC, p.rowid DESC LIMIT 500`, ...i);
}
var Af = [[`current`, -1 / 0, 0], [`d1_30`, 1, 30], [`d31_60`, 31, 60], [`d61_90`, 61, 90], [`d90`, 91, 1 / 0]];
function jf(e, t, n, r = {}) {
  let i = Re(n),
    a = O(e, `SELECT m.*, p.name AS plan,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM member_charges WHERE member_id = m.id AND status != 'cancelled') AS charged,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM member_payments WHERE member_id = m.id AND status = 'confirmed') AS paid,
      (SELECT COALESCE(SUM(amount_minor - allocated_minor), 0) FROM member_charges WHERE member_id = m.id AND status = 'open' AND due_date < ?) AS overdue,
      (SELECT MIN(due_date) FROM member_charges WHERE member_id = m.id AND status = 'open' AND due_date < ?) AS oldest_due,
      (SELECT level || '|' || sent_at FROM member_reminders WHERE member_id = m.id AND level > 0 ORDER BY sent_at DESC, rowid DESC LIMIT 1) AS last_reminder
    FROM members m LEFT JOIN club_plans p ON p.id = m.plan_id WHERE m.company_id = ? ORDER BY m.number`, i, i, t),
    o = r.q?.trim().toLowerCase(),
    s = a.map(e => ({
      id: e.id,
      number: e.number,
      name: e.name,
      email: e.email,
      phone: e.phone,
      plan: e.plan,
      status: e.status,
      reference: e.reference,
      badge: e.badge,
      balance_minor: e.charged - e.paid,
      overdue_minor: e.overdue,
      overdue_days: e.oldest_due ? ef(e.oldest_due, i) : 0,
      last_reminder_level: e.last_reminder ? Number(e.last_reminder.split(`|`)[0]) : null,
      last_reminder_at: e.last_reminder?.split(`|`)[1] ?? null
    })).filter(e => (!o || `${e.number} ${e.name} ${e.reference} ${e.badge}`.toLowerCase().includes(o)) && (r.filter !== `arrears` || e.overdue_minor > 0));
  return r.sort === `age` ? s.sort((e, t) => t.overdue_days - e.overdue_days || t.overdue_minor - e.overdue_minor) : r.sort === `amount` && s.sort((e, t) => t.balance_minor - e.balance_minor), s;
}
function Mf(e, t, n = new Date()) {
  let r = Re(n),
    i = jf(e, t, n),
    a = Object.fromEntries(Af.map(([e]) => [e, 0]));
  for (let n of O(e, `SELECT due_date, amount_minor - allocated_minor AS rest FROM member_charges WHERE company_id = ? AND status = 'open'`, t)) {
    let e = ef(n.due_date, r),
      t = Af.find(([, t, n]) => e >= t && e <= n)[0];
    a[t] += n.rest;
  }
  let o = `${r.slice(0, 7)}-01`,
    s = (n, ...r) => k(e, n, t, ...r).n,
    c = O(e, `SELECT decision, COUNT(*) AS n FROM gate_events WHERE company_id = ? AND at >= ? GROUP BY decision`, t, N(new Date(`${r}T00:00:00+04:00`)));
  return {
    day: r,
    generatedAt: N(n),
    totals: {
      owedMinor: i.reduce((e, t) => e + Math.max(t.balance_minor, 0), 0),
      overdueMinor: i.reduce((e, t) => e + t.overdue_minor, 0),
      creditMinor: i.reduce((e, t) => e + Math.max(-t.balance_minor, 0), 0),
      members: i.filter(e => e.status === `active`).length,
      inArrears: i.filter(e => e.overdue_minor > 0).length
    },
    aging: a,
    collectedMonth: O(e, `SELECT method, COUNT(*) AS count, SUM(amount_minor) AS amount_minor FROM member_payments WHERE company_id = ? AND status = 'confirmed' AND confirmed_at >= ?
      GROUP BY method ORDER BY method`, t, N(new Date(`${o}T00:00:00+04:00`))),
    unsettledOnlineMinor: s(`SELECT COALESCE(SUM(amount_minor), 0) AS n FROM member_payments WHERE company_id = ? AND method = 'link' AND status = 'confirmed' AND settlement_status = 'unsettled'`),
    remindersMonth: s(`SELECT COUNT(*) AS n FROM member_reminders WHERE company_id = ? AND level > 0 AND sent_at >= ?`, N(new Date(`${o}T00:00:00+04:00`))),
    openExceptions: s(`SELECT COUNT(*) AS n FROM exceptions WHERE company_id = ? AND status = 'open' AND domain = 'finance'`),
    gateToday: Object.fromEntries([`allow`, `flag`, `deny`].map(e => [e, c.find(t => t.decision === e)?.n ?? 0])),
    topDebtors: [...i].filter(e => e.overdue_minor > 0).sort((e, t) => t.overdue_minor - e.overdue_minor).slice(0, 8)
  };
}
function Nf(e, t, n, r = new Date()) {
  let i = af(e, t, n),
    a = Re(r),
    o = O(e, `SELECT * FROM member_charges WHERE member_id = ? ORDER BY due_date DESC, created_at DESC, rowid DESC`, i.id),
    s = O(e, `SELECT * FROM member_payments WHERE member_id = ? ORDER BY created_at DESC, rowid DESC`, i.id),
    c = [...o.filter(e => e.status !== `cancelled`).map(e => ({
      at: e.created_at,
      ref: e.number,
      label: e.label,
      debit: e.amount_minor,
      credit: 0
    })), ...s.filter(e => e.status === `confirmed`).map(e => ({
      at: e.confirmed_at,
      ref: e.provider_ref ?? e.reference,
      label: `Encaissement (${e.method})`,
      debit: 0,
      credit: e.amount_minor
    }))].sort((e, t) => e.at.localeCompare(t.at)),
    l = 0,
    u = c.map(e => ({
      ...e,
      balance: l += e.debit - e.credit
    }));
  return {
    member: {
      ...i,
      portal_token: void 0,
      plan: i.plan_id ? k(e, `SELECT id, name, billing, fee_minor FROM club_plans WHERE id = ?`, i.plan_id) : null
    },
    account: ff(e, i.id, a),
    portalPath: `/membre/${i.portal_token}`,
    gate: zf(e, t, i.badge, r),
    charges: o.map(e => ({
      ...e,
      remaining_minor: e.status === `cancelled` ? 0 : e.amount_minor - e.allocated_minor,
      overdue: e.status === `open` && e.due_date < a
    })),
    payments: s.map(e => ({
      ...e,
      idempotency_key: void 0
    })),
    statement: u.reverse(),
    reminders: O(e, `SELECT id, level, channel, amount_minor, overdue_days, message, sent_at FROM member_reminders WHERE member_id = ? ORDER BY sent_at DESC, rowid DESC LIMIT 30`, i.id),
    gateEvents: O(e, `SELECT id, decision, reason, source, at, overdue_minor, overdue_days FROM gate_events WHERE member_id = ? ORDER BY at DESC, rowid DESC LIMIT 20`, i.id)
  };
}
var Pf = {
  0: `Votre relevé de compte`,
  1: `Rappel : un montant reste dû sur votre compte`,
  2: `Second rappel : votre compte présente un retard`,
  3: `Dernier rappel : votre retard sera signalé à l'entrée du club`
};
function Ff(e, t, n, r, i) {
  return `${Pf[n]} - ${t}. Membre ${e.number} : ${Zd(r.dueMinor)} MUR dû${r.overdueMinor ? `, dont ${Zd(r.overdueMinor)} MUR en retard de ${r.overdueDays} jour(s)` : ``}. Payer en ligne : ${i}. Par virement, indiquez la référence ${e.reference}.`;
}
function If(e, t, n, r = new Date()) {
  let i = Xd(t),
    a = Xu(e, i).club,
    o = k(e, `SELECT name FROM companies WHERE id = ?`, i).name,
    s = Re(r);
  return j(e, () => {
    let c = {
      sent: 0,
      alreadySent: 0,
      byLevel: {
        1: 0,
        2: 0,
        3: 0
      }
    };
    for (let l of O(e, `SELECT * FROM members WHERE company_id = ? ORDER BY number`, i)) {
      let u = ff(e, l.id, s);
      if (!u.oldestOverdueId || u.overdueMinor < a.reminders.minAmountMinor) continue;
      let d = a.reminders.levels.filter(e => u.overdueDays >= e).length;
      d && (k(e, `SELECT 1 FROM member_reminders WHERE company_id = ? AND member_id = ? AND cycle = ? AND level = ?`, i, l.id, u.oldestOverdueId, d) ? c.alreadySent++ : (A(e, `INSERT INTO member_reminders (id, company_id, member_id, cycle, level, channel, amount_minor, overdue_days, message, sent_by, sent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, Fe(`rem`), i, l.id, u.oldestOverdueId, d, l.email ? `email` : `sms`, u.dueMinor, u.overdueDays, Ff(l, o, d, u, `${n}/membre/${l.portal_token}`), t.id, N(r)), c.sent++, c.byLevel[d] = (c.byLevel[d] ?? 0) + 1));
    }
    return He(e, t, `reminders.run`, `reminders`, null, {
      sent: c.sent,
      alreadySent: c.alreadySent,
      level1: c.byLevel[1],
      level2: c.byLevel[2],
      level3: c.byLevel[3]
    }, i, r), c;
  });
}
function Lf(e, t, n, r, i = new Date()) {
  let a = Xd(t);
  return j(e, () => {
    let o = af(e, a, n),
      s = ff(e, o.id, Re(i)),
      c = `${r}/membre/${o.portal_token}`,
      l = Ff(o, k(e, `SELECT name FROM companies WHERE id = ?`, a).name, 0, s, c);
    return A(e, `INSERT INTO member_reminders (id, company_id, member_id, cycle, level, channel, amount_minor, overdue_days, message, sent_by, sent_at) VALUES (?,?,?,?,0,?,?,?,?,?,?)`, Fe(`rem`), a, o.id, `manuel:${Fe(`c`)}`, o.email ? `email` : `sms`, s.dueMinor, s.overdueDays, l, t.id, N(i)), He(e, t, `member.statement_sent`, `member`, o.id, {
      number: o.number,
      dueMinor: s.dueMinor
    }, a, i), {
      url: c,
      message: l
    };
  });
}
var Rf = (e, t) => O(e, `SELECT r.id, r.level, r.channel, r.amount_minor, r.overdue_days, r.message, r.sent_at, m.id AS member_id, m.number AS member_number, m.name AS member, u.name AS sent_by
    FROM member_reminders r JOIN members m ON m.id = r.member_id LEFT JOIN users u ON u.id = r.sent_by WHERE r.company_id = ? ORDER BY r.sent_at DESC, r.rowid DESC LIMIT 400`, t);
function zf(e, t, n, r = new Date()) {
  let i = k(e, `SELECT * FROM members WHERE company_id = ? AND badge = ?`, t, n.trim().toUpperCase());
  if (!i) return {
    decision: `deny`,
    reason: `Badge inconnu.`,
    memberId: null,
    overdueMinor: 0,
    overdueDays: 0
  };
  if (i.status === `resigned`) return {
    decision: `deny`,
    reason: `Adhésion résiliée.`,
    memberId: i.id,
    overdueMinor: 0,
    overdueDays: 0
  };
  if (i.status === `suspended`) return {
    decision: `deny`,
    reason: `Membre suspendu par le club.`,
    memberId: i.id,
    overdueMinor: 0,
    overdueDays: 0
  };
  let a = Xu(e, t).club.gate,
    o = ff(e, i.id, Re(r)),
    s = {
      memberId: i.id,
      overdueMinor: o.overdueMinor,
      overdueDays: o.overdueDays
    };
  return o.overdueMinor >= a.minAmountMinor && a.denyAfterDays > 0 && o.overdueDays >= a.denyAfterDays ? {
    ...s,
    decision: `deny`,
    reason: `Retard de ${o.overdueDays} jour(s) : ${Zd(o.overdueMinor)} MUR à régulariser avant l'entrée.`
  } : o.overdueMinor >= a.minAmountMinor && o.overdueDays >= a.flagAfterDays ? {
    ...s,
    decision: `flag`,
    reason: `Entrée signalée : ${Zd(o.overdueMinor)} MUR en retard de ${o.overdueDays} jour(s).`
  } : {
    ...s,
    decision: `allow`,
    reason: `Compte à jour.`
  };
}
var Bf = (e, t) => he(`sha256`, e).update(`gate:${t}`).digest(`hex`),
  Vf = e => (e.length <= 4 ? `****` : `${`*`.repeat(e.length - 4)}${e.slice(-4)}`).toUpperCase();
function Hf(e, t, n, r, i, a, o) {
  A(e, `INSERT INTO gate_events (id, company_id, member_id, device_id, credential_hint, decision, reason, overdue_minor, overdue_days, source, at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, Fe(`gev`), t, n.memberId, a, Vf(r), n.decision, n.reason, n.overdueMinor, n.overdueDays, i, N(o));
}
function Uf(e, t, n, r = new Date()) {
  let i = Xd(t);
  return j(e, () => {
    let t = zf(e, i, n, r);
    Hf(e, i, t, n, `attendant`, null, r);
    let a = t.memberId ? k(e, `SELECT * FROM members WHERE id = ?`, t.memberId) : null;
    return {
      ...t,
      member: a ? {
        id: a.id,
        number: a.number,
        name: a.name,
        status: a.status,
        reference: a.reference,
        portalPath: `/membre/${a.portal_token}`
      } : null
    };
  });
}
function Wf(e, t, n, r, i, a, o = new Date()) {
  let s = k(e, `SELECT * FROM gate_devices WHERE id = ?`, r);
  if (!s || !s.active) throw new P(401, `unknown_device`, `Lecteur inconnu ou désactivé.`);
  let c = t.access.verifyRequest(i, a, Bf(n, s.id), o);
  return {
    requestId: c.requestId,
    ...Gf(e, s.company_id, s.id, c.credential, o)
  };
}
function Gf(e, t, n, r, i = new Date()) {
  return j(e, () => {
    let a = zf(e, t, r, i);
    return Hf(e, t, a, r, `reader`, n, i), {
      decision: a.decision,
      open: a.decision !== `deny`,
      display: a.decision === `allow` ? `Bienvenue` : a.decision === `flag` ? `Bienvenue - merci de passer à l'accueil` : `Accès refusé - voir l'accueil`
    };
  });
}
var Kf = (e, t, n) => O(e, `SELECT e.id, e.at, e.decision, e.reason, e.source, e.credential_hint, e.overdue_minor, e.overdue_days, m.id AS member_id, m.number AS member_number, m.name AS member, d.name AS device
    FROM gate_events e LEFT JOIN members m ON m.id = e.member_id LEFT JOIN gate_devices d ON d.id = e.device_id WHERE e.company_id = ? ${n ? `AND e.at >= ?` : ``} ORDER BY e.at DESC, e.rowid DESC LIMIT 300`, t, ...(n ? [n] : []));
function qf(e, t, n = new Date()) {
  let r = Re(n),
    i = Xu(e, t).payments.methods.link.feeBps,
    a = O(e, `SELECT * FROM member_payments WHERE company_id = ? AND method = 'link' AND status = 'confirmed' AND settlement_status = 'unsettled' ORDER BY confirmed_at`, t).map(e => {
      let t = Math.round(e.amount_minor * i / 1e4);
      return [r, e.provider_ref, `REGLEMENT PAIEMENTS EN LIGNE`, Zd(e.amount_minor), Zd(t), Zd(e.amount_minor - t)].join(`;`);
    }),
    o = jf(e, t, n, {
      filter: `arrears`,
      sort: `age`
    }).filter(e => e.status === `active`).slice(0, 4),
    s = e => `VIR-${r.replace(/-/g, ``)}-${String(e + 1).padStart(2, `0`)}`,
    c = e => e.replace(/\s*\(.*\)$/, ``).split(` `).slice(-1)[0].toUpperCase();
  return o.forEach((e, t) => {
    let n = t === 1 ? Math.max(100, Math.round(e.overdue_minor / 200) * 100) : e.overdue_minor,
      [i, o] = [e.reference.split(`-`)[1], e.reference.split(`-`)[2]],
      l = [`VIREMENT ${e.reference} COTISATION`, `VIR ${e.reference.replace(/-/g, ``)} ${c(e.name)}`, `VIREMENT ${e.reference.split(`-`)[0]}-${i}-${String((Number(o) + 1) % 100).padStart(2, `0`)} ${c(e.name)}`, `VIREMENT ${c(e.name)} COTISATION CLUB`][t];
    a.push([r, s(t), l, Zd(n), `0.00`, Zd(n)].join(`;`));
  }), [Wd, ...a].join(`\r
`) + `\r
`;
}
function Jf(e, t, n, r, i) {
  (t.status === `pending` || t.status === `to_verify`) && Sf(e, t, `bank_statement`, r, i), A(e, `UPDATE member_payments SET settlement_status = 'settled', settled_at = ?, fee_actual_minor = ?, bank_line_id = ? WHERE id = ?`, N(i), n.feeMinor, n.id, t.id), xf(e, t.id, i);
  let a = k(e, `SELECT * FROM member_payments WHERE id = ?`, t.id);
  W(e, t.company_id, `settlement`, t.id, `Règlement bancaire ${t.provider_ref}`, a.amount_minor - n.feeMinor, {
    providerRef: t.provider_ref,
    grossMinor: a.amount_minor,
    feeMinor: n.feeMinor,
    valueDate: n.valueDate,
    lines: uf(Xu(e, t.company_id).club, a)
  }, i), He(e, r, `member_payment.settled`, `member_payment`, t.id, {
    amountMinor: a.amount_minor,
    feeMinor: n.feeMinor,
    providerRef: t.provider_ref,
    valueDate: n.valueDate
  }, t.company_id, i);
}
function Yf(e, t, n, r, i, a, o) {
  let s = Fe(`mpay`);
  return A(e, `INSERT INTO member_payments (id, company_id, member_id, method, amount_minor, currency, status, idempotency_key, reference, note, settlement_status, settled_at, fee_actual_minor, bank_line_id, created_by, created_at, updated_at)
    VALUES (?,?,?,'bank_transfer',?,?,'pending',?,?,?,'settled',?,?,?,?,?,?)`, s, t.company_id, t.id, n.grossMinor, `MUR`, `bank:${n.hash}`, n.reference, i, N(o), n.feeMinor, n.id, a.id, N(o), N(o)), Sf(e, k(e, `SELECT * FROM member_payments WHERE id = ?`, s), r, a, o), s;
}
function Xf(e, t, n, r, i, a = new Date()) {
  let o = Xd(n),
    s = t.bank.parse(i);
  if (!s.length) throw new P(400, `bad_statement`, `Le relevé ne contient aucune ligne.`);
  let c = Xu(e, o).club.refPrefix;
  return j(e, () => {
    let t = Fe(`stm`);
    A(e, `INSERT INTO bank_statements (id, company_id, filename, imported_by, imported_at, line_count, matched_count, skipped_count) VALUES (?,?,?,?,?,0,0,0)`, t, o, r.slice(0, 120), n.id, N(a));
    let i = {
      matched: 0,
      exceptions: 0,
      skipped: 0
    };
    for (let r of s) {
      let s = me(`sha256`).update([r.valueDate, r.reference, r.label, r.grossMinor, r.feeMinor].join(`|`)).digest(`hex`);
      if (k(e, `SELECT 1 FROM bank_lines WHERE company_id = ? AND line_hash = ?`, o, s)) {
        i.skipped++;
        continue;
      }
      let l = Fe(`bl`),
        u = `unmatched`,
        d = null,
        f = k(e, `SELECT * FROM member_payments WHERE company_id = ? AND provider_ref = ?`, o, r.reference);
      if (f) d = f.id, f.settlement_status === `settled` ? (u = `duplicate`, U(e, o, `finance`, `duplicate_settlement`, `bank_line`, l, `Référence ${r.reference} créditée une seconde fois sur le relevé.`, {
        reference: r.reference,
        grossMinor: r.grossMinor
      }, a)) : f.status === `failed` ? U(e, o, `finance`, `credit_on_failed`, `bank_line`, l, `Crédit reçu pour ${r.reference}, enregistré comme échoué : à contrôler avec le prestataire.`, {
        reference: r.reference,
        grossMinor: r.grossMinor,
        paymentId: f.id
      }, a) : r.grossMinor === f.amount_minor ? (u = `matched`, Jf(e, f, {
        id: l,
        feeMinor: r.feeMinor,
        valueDate: r.valueDate
      }, n, a)) : (u = `amount_mismatch`, U(e, o, `finance`, `settlement_amount_mismatch`, `bank_line`, l, `Écart de montant sur ${r.reference} : ${Zd(r.grossMinor)} crédité pour ${Zd(f.amount_minor)} attendu.`, {
        reference: r.reference,
        creditedMinor: r.grossMinor,
        expectedMinor: f.amount_minor,
        paymentId: f.id
      }, a));else if (r.grossMinor > 0) {
        let t = rf(`${r.reference} ${r.label}`, c),
          i = t?.valid ? k(e, `SELECT * FROM members WHERE company_id = ? AND number = ?`, o, t.number) : void 0;
        i ? (u = `matched`, d = Yf(e, i, {
          id: l,
          hash: s,
          grossMinor: r.grossMinor,
          feeMinor: r.feeMinor,
          reference: i.reference
        }, `bank_statement`, r.label, n, a)) : t ? U(e, o, `finance`, `reference_invalid`, `bank_line`, l, `Virement de ${Zd(r.grossMinor)} avec une référence incorrecte (${t.raw}) : clé de contrôle fausse ou membre inconnu. À affecter à la main.`, {
          reference: t.raw,
          grossMinor: r.grossMinor,
          label: r.label,
          valueDate: r.valueDate
        }, a) : U(e, o, `finance`, `unidentified_transfer`, `bank_line`, l, `Virement de ${Zd(r.grossMinor)} sans référence de membre (« ${r.label} ») : à affecter à la main.`, {
          grossMinor: r.grossMinor,
          label: r.label,
          valueDate: r.valueDate
        }, a);
      } else U(e, o, `finance`, `unknown_credit`, `bank_line`, l, `Ligne de relevé sans correspondance : ${r.reference} (${Zd(r.grossMinor)}).`, {
        reference: r.reference,
        grossMinor: r.grossMinor
      }, a);
      u === `matched` ? i.matched++ : i.exceptions++, A(e, `INSERT INTO bank_lines (id, statement_id, company_id, line_hash, value_date, reference, label, gross_minor, fee_minor, net_minor, match_status, payment_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, l, t, o, s, r.valueDate, r.reference, r.label, r.grossMinor, r.feeMinor, r.netMinor, u, d);
    }
    return A(e, `UPDATE bank_statements SET line_count = ?, matched_count = ?, skipped_count = ? WHERE id = ?`, s.length - i.skipped, i.matched, i.skipped, t), He(e, n, `statement.imported`, `bank_statement`, t, {
      filename: r,
      lines: s.length,
      ...i
    }, o, a), {
      statementId: t,
      lines: s.length,
      ...i
    };
  });
}
function Zf(e, t, n, r, i, a = new Date()) {
  let o = Xd(t);
  return j(e, () => {
    let s = k(e, `SELECT * FROM bank_lines WHERE id = ? AND company_id = ?`, n, o);
    if (!s) throw ze(`Ligne de relevé`);
    if (s.match_status !== `unmatched` || s.payment_id || s.gross_minor <= 0) throw new P(409, `bad_status`, `Seul un virement non identifié peut être affecté à un membre.`);
    let c = af(e, o, r),
      l = Yf(e, c, {
        id: s.id,
        hash: s.line_hash,
        grossMinor: s.gross_minor,
        feeMinor: s.fee_minor,
        reference: c.reference
      }, `manual_assignment`, `${s.label} - ${i}`, t, a);
    return A(e, `UPDATE bank_lines SET match_status = 'matched', payment_id = ? WHERE id = ?`, l, s.id), ed(e, o, [`unidentified_transfer`, `reference_invalid`], s.id, `Affecté au membre ${c.number}.`, a), He(e, t, `bank_line.assigned`, `bank_line`, s.id, {
      member: c.number,
      amountMinor: s.gross_minor,
      label: s.label,
      note: i
    }, o, a), {
      paymentId: l
    };
  });
}
var Qf = (e, t) => ({
  statements: O(e, `SELECT s.*, u.name AS imported_by_name FROM bank_statements s LEFT JOIN users u ON u.id = s.imported_by WHERE s.company_id = ? ORDER BY s.imported_at DESC LIMIT 30`, t),
  lines: O(e, `SELECT b.id, b.value_date, b.reference, b.label, b.gross_minor, b.fee_minor, b.net_minor, b.match_status, p.method, p.confirmed_via, m.id AS member_id, m.number AS member_number, m.name AS member
    FROM bank_lines b LEFT JOIN member_payments p ON p.id = b.payment_id LEFT JOIN members m ON m.id = p.member_id WHERE b.company_id = ? ORDER BY b.rowid DESC LIMIT 300`, t),
  unsettled: O(e, `SELECT p.id, p.provider_ref, p.amount_minor, p.confirmed_at, m.number AS member_number, m.name AS member FROM member_payments p JOIN members m ON m.id = p.member_id
    WHERE p.company_id = ? AND p.method = 'link' AND p.status = 'confirmed' AND p.settlement_status = 'unsettled' ORDER BY p.confirmed_at`, t)
});
function $f(e, t, n, r) {
  let i = Xu(e, t).club,
    a = [],
    o = e => !!e && e.slice(0, 10) >= n && e.slice(0, 10) <= r,
    s = t => k(e, `SELECT number, name FROM members WHERE id = ?`, t);
  for (let n of O(e, `SELECT * FROM member_charges WHERE company_id = ? ORDER BY created_at, rowid`, t)) o(n.created_at) && a.push(...cf(i, n, s(n.member_id))), n.status === `cancelled` && o(n.cancelled_at) && a.push(...cf(i, n, s(n.member_id), !0));
  for (let n of O(e, `SELECT * FROM member_payments WHERE company_id = ? AND status = 'confirmed' ORDER BY confirmed_at, rowid`, t)) o(n.confirmed_at) && a.push(...lf(i, n, s(n.member_id))), n.method === `link` && n.settlement_status === `settled` && o(n.settled_at) && a.push(...uf(i, n));
  a.sort((e, t) => e.date.localeCompare(t.date) || e.journal.localeCompare(t.journal));
  let c = a.reduce((e, t) => e + t.debit, 0),
    l = a.reduce((e, t) => e + t.credit, 0);
  return {
    from: n,
    to: r,
    lines: a,
    totals: {
      debit: c,
      credit: l,
      balanced: c === l
    }
  };
}
function ep(e, t, n = new Date()) {
  let r = k(e, `SELECT m.*, c.name AS club FROM members m JOIN companies c ON c.id = m.company_id WHERE m.portal_token = ?`, t);
  if (!r) throw ze(`Compte membre`);
  let i = Re(n),
    a = ff(e, r.id, i),
    o = k(e, `SELECT * FROM member_payments WHERE member_id = ? AND method = 'link' ORDER BY created_at DESC, rowid DESC LIMIT 1`, r.id);
  return {
    club: r.club,
    number: r.number,
    firstName: r.name.replace(/\s*\(.*\)$/, ``).split(` `)[0],
    status: r.status,
    reference: r.reference,
    dueMinor: a.dueMinor,
    overdueMinor: a.overdueMinor,
    overdueDays: a.overdueDays,
    creditMinor: a.creditMinor,
    open: O(e, `SELECT label, due_date, amount_minor - allocated_minor AS rest FROM member_charges WHERE member_id = ? AND status = 'open' ORDER BY due_date, rowid`, r.id).map(e => ({
      label: e.label,
      dueDate: e.due_date,
      remainingMinor: e.rest,
      overdue: e.due_date < i
    })),
    lastPayment: o ? {
      status: o.status,
      amountMinor: o.amount_minor,
      at: o.created_at
    } : null
  };
}
var tp = (e, t) => {
    let n = k(e, `SELECT * FROM members WHERE portal_token = ?`, t);
    if (!n) throw ze(`Compte membre`);
    return n;
  },
  np = (e, t, n) => {
    let r = k(e, `SELECT * FROM payments WHERE id = ? AND company_id = ?`, n, t);
    if (!r) throw ze(`Paiement`);
    return r;
  },
  rp = e => ({
    id: e.id,
    invoiceId: e.invoice_id,
    method: e.method,
    amountMinor: e.amount_minor,
    currency: e.currency,
    status: e.status,
    refundedMinor: e.refunded_minor,
    providerRef: e.provider_ref,
    presentation: JSON.parse(e.presentation_json),
    failureReason: e.failure_reason,
    verifyReason: e.verify_reason,
    settlementStatus: e.settlement_status,
    createdAt: e.created_at,
    expiresAt: e.expires_at,
    confirmedAt: e.confirmed_at,
    confirmedVia: e.confirmed_via
  });

export { $d, $f, Af, Bf, Cf, Df, Ef, Ff, Gf, Hf, If, Jf, Kf, Lf, Mf, Nf, Of, Pf, Qd, Qf, Rf, Sf, Tf, Uf, Vf, Wf, Xd, Xf, Yf, Zd, Zf, _f, af, bf, cf, df, ef, ep, ff, gf, hf, jf, kf, lf, mf, nf, np, of, pf, qf, rf, rp, sf, tf, tp, uf, vf, wf, xf, yf, zf };
