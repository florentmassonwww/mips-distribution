// GENERATED (step 1a, stage 2): v0.1.0 "payments" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TypeScript in the following commits.
/* eslint-disable */
import { Of, np, rp } from "./club.mjs";
import { A, Fe, He, M, N, O, P, Ve, j, k, ze } from "./core.mjs";
import { U, W, Xu, ed } from "./distribution.mjs";

function ip(e, t) {
  let n = k(e, `SELECT * FROM invoices WHERE id = ?`, t),
    r = n => !!k(e, `SELECT 1 FROM payments WHERE invoice_id = ? AND status = ?`, t, n),
    i = n.paid_minor - n.refunded_minor,
    a = k(e, `SELECT status FROM payments WHERE invoice_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`, t)?.status,
    o = r(`to_verify`) ? `to_verify` : r(`pending`) ? `pending` : i >= n.amount_minor ? `paid` : i > 0 ? `partially_paid` : n.paid_minor > 0 ? `refunded` : a === `failed` ? `failed` : `unpaid`;
  return A(e, `UPDATE invoices SET status = ? WHERE id = ?`, o, t), o;
}
var ap = (e, t, n) => {
  A(e, `UPDATE payments SET updated_at = ? WHERE id = ?`, N(n), t);
};
function op(e, t, n, r, i) {
  if (t.status === `confirmed` || t.status === `refunded`) return !1;
  let a = Math.round(t.amount_minor * Xu(e, t.company_id).payments.methods[t.method].feeBps / 1e4);
  A(e, `UPDATE payments SET status = 'confirmed', confirmed_at = ?, confirmed_via = ?, fee_expected_minor = ?, failure_reason = NULL, verify_reason = NULL WHERE id = ?`, N(i), n, a, t.id), ap(e, t.id, i), A(e, `UPDATE invoices SET paid_minor = paid_minor + ? WHERE id = ?`, t.amount_minor, t.invoice_id), ip(e, t.invoice_id);
  let o = k(e, `SELECT * FROM invoices WHERE id = ?`, t.invoice_id);
  return W(e, t.company_id, `payment`, t.id, `Encaissement ${o.number} (${t.method})`, t.amount_minor, {
    invoice: o.number,
    method: t.method,
    providerRef: t.provider_ref,
    amountMinor: t.amount_minor,
    currency: t.currency,
    confirmedVia: n
  }, i), ed(e, t.company_id, [`payment_to_verify`, `amount_mismatch`], t.id, `Confirmé (${n}).`, i), o.paid_minor - o.refunded_minor > o.amount_minor && U(e, t.company_id, `finance`, `overpayment`, `invoice`, o.id, `Facture ${o.number} encaissée au-delà de son montant : remboursement à prévoir.`, {
    invoice: o.number,
    amountMinor: o.amount_minor,
    paidMinor: o.paid_minor - o.refunded_minor
  }, i), He(e, r, `payment.confirmed`, `payment`, t.id, {
    invoice: o.number,
    method: t.method,
    amountMinor: t.amount_minor,
    via: n
  }, t.company_id, i), !0;
}
function sp(e, t, n, r, i) {
  return t.status !== `pending` && t.status !== `to_verify` ? !1 : (A(e, `UPDATE payments SET status = 'failed', failure_reason = ?, verify_reason = NULL WHERE id = ?`, n, t.id), ap(e, t.id, i), ip(e, t.invoice_id), ed(e, t.company_id, [`payment_to_verify`], t.id, `Échec confirmé par le prestataire.`, i), He(e, r, `payment.failed`, `payment`, t.id, {
    method: t.method,
    amountMinor: t.amount_minor,
    reason: n
  }, t.company_id, i), !0);
}
function cp(e, t, n, r, i) {
  if (t.status !== `pending`) return !1;
  A(e, `UPDATE payments SET status = 'to_verify', verify_reason = ? WHERE id = ?`, n, t.id), ap(e, t.id, i), ip(e, t.invoice_id);
  let a = k(e, `SELECT number FROM invoices WHERE id = ?`, t.invoice_id);
  return U(e, t.company_id, `finance`, `payment_to_verify`, `payment`, t.id, `Paiement à vérifier sur ${a.number} (${t.method}) : ${n}`, {
    invoice: a.number,
    method: t.method,
    amountMinor: t.amount_minor,
    providerRef: t.provider_ref
  }, i), He(e, r, `payment.to_verify`, `payment`, t.id, {
    invoice: a.number,
    method: t.method,
    reason: n
  }, t.company_id, i), !0;
}
function lp(e, t, n) {
  if (t.role !== `agent`) return;
  let r = n.route_id ? k(e, `SELECT agent_id FROM routes WHERE id = ?`, n.route_id)?.agent_id : null;
  if (n.agent_id !== t.id && r !== t.id) throw new P(403, `forbidden`, `Accès non autorisé.`);
}
function up(e, t, n) {
  let r = np(e, t.companyId, n);
  return lp(e, t, k(e, `SELECT * FROM invoices WHERE id = ?`, r.invoice_id)), r;
}
async function dp(e, t, n, r, i, a = new Date()) {
  let o = n.companyId,
    s = Xu(e, o),
    c = t.payments[r.method],
    l = new Date(a.getTime() + s.payments.attemptMinutes * 6e4),
    u = j(e, () => {
      let t = k(e, `SELECT * FROM invoices WHERE id = ? AND company_id = ?`, r.invoiceId, o);
      if (!t) throw ze(`Facture`);
      lp(e, n, t);
      let i = k(e, `SELECT * FROM payments WHERE company_id = ? AND idempotency_key = ?`, o, r.idempotencyKey);
      if (i) {
        if (i.invoice_id !== t.id || i.amount_minor !== r.amountMinor || i.method !== r.method) throw new P(409, `idempotency_conflict`, `Cette clé d'idempotence a déjà servi pour une autre demande.`);
        return {
          payment: i,
          inv: t,
          replayed: !0
        };
      }
      if (!s.payments.methods[r.method].enabled) throw new P(400, `method_disabled`, `Ce moyen de paiement n'est pas activé pour l'entreprise.`);
      let c = k(e, `SELECT status FROM payments WHERE invoice_id = ? AND status IN ('pending','to_verify')`, t.id);
      if (c) throw new P(409, `attempt_in_progress`, c.status === `pending` ? `Un paiement est déjà en attente pour cette facture. Vérifiez son statut avant d'en lancer un autre.` : `Un paiement est à vérifier pour cette facture : nouvelle tentative bloquée pour éviter un double débit.`);
      let u = t.amount_minor - (t.paid_minor - t.refunded_minor);
      if (u <= 0) throw new P(409, `already_paid`, `Cette facture est déjà payée.`);
      if (r.amountMinor > u) throw new P(400, `amount_exceeds_balance`, `Le montant dépasse le solde restant dû.`);
      let d = Fe(`pay`);
      return A(e, `INSERT INTO payments (id, company_id, invoice_id, order_id, agent_id, method, amount_minor, currency, status, idempotency_key, link_token, created_at, updated_at, expires_at)
      VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?,?,?)`, d, o, t.id, t.order_id, n.role === `agent` ? n.id : t.agent_id, r.method, r.amountMinor, t.currency, r.idempotencyKey, r.method === `link` ? M() : null, N(a), N(a), N(l)), ip(e, t.id), He(e, n, `payment.initiated`, `payment`, d, {
        invoice: t.number,
        method: r.method,
        amountMinor: r.amountMinor
      }, o, a), {
        payment: np(e, o, d),
        inv: t,
        replayed: !1
      };
    });
  if (u.replayed) return {
    payment: u.payment,
    replayed: !0
  };
  let d = u.payment;
  try {
    let t = await c.initiate({
      paymentId: d.id,
      idempotencyKey: d.idempotency_key,
      companyId: o,
      merchantRef: s.payments.methods[d.method].merchantRef,
      amountMinor: d.amount_minor,
      currency: d.currency,
      invoiceNumber: u.inv.number,
      payUrl: d.link_token ? `${i}/payer/${d.link_token}` : void 0,
      expiresAt: l
    });
    A(e, `UPDATE payments SET provider_ref = ?, presentation_json = ? WHERE id = ?`, t.providerRef, JSON.stringify(t.presentation), d.id);
  } catch (t) {
    j(e, () => sp(e, d, `Le prestataire n'a pas pu initier le paiement.`, n, a)), console.error(`Initiation de paiement en échec :`, t instanceof Error ? t.message : `erreur inconnue`);
  }
  return {
    payment: np(e, o, d.id),
    replayed: !1
  };
}
async function fp(e, t, n, r, i = new Date()) {
  let a = n.companyId,
    o = np(e, a, r);
  if (lp(e, n, k(e, `SELECT * FROM invoices WHERE id = ?`, o.invoice_id)), (o.status === `pending` || o.status === `to_verify`) && o.provider_ref) {
    let s = await t.payments[o.method].queryStatus(o.provider_ref);
    j(e, () => {
      let t = np(e, a, r);
      s === `succeeded` ? op(e, t, `status_query`, n, i) : s === `failed` ? sp(e, t, `Refusé ou annulé chez le prestataire.`, n, i) : s === `unknown` ? cp(e, t, `Le prestataire ne connaît pas cette référence.`, n, i) : t.expires_at && N(i) > t.expires_at && cp(e, t, `Sans réponse du prestataire après expiration du délai.`, n, i);
    });
  }
  return np(e, a, r);
}
async function pp(e, t, n, r, i = new Date()) {
  let a = n.companyId,
    o = np(e, a, r);
  if (lp(e, n, k(e, `SELECT * FROM invoices WHERE id = ?`, o.invoice_id)), o.status !== `pending`) throw new P(409, `bad_status`, `Seule une tentative en attente peut être annulée.`);
  let s = t.payments[o.method],
    c = !o.provider_ref || (await s.cancel(o.provider_ref)),
    l = c || !o.provider_ref ? `failed` : await s.queryStatus(o.provider_ref);
  return j(e, () => {
    let t = np(e, a, r);
    c ? sp(e, t, `Annulée par l'utilisateur avant paiement.`, n, i) : l === `succeeded` ? op(e, t, `status_query`, n, i) : l === `failed` ? sp(e, t, `Refusé ou annulé chez le prestataire.`, n, i) : cp(e, t, `Annulation non garantie par le prestataire : le client peut encore payer.`, n, i);
  }), np(e, a, r);
}
function mp(e, t, n, r = new Date()) {
  let i = t.companyId;
  return j(e, () => {
    let a = np(e, i, n);
    if (lp(e, t, k(e, `SELECT * FROM invoices WHERE id = ?`, a.invoice_id)), a.status !== `pending`) throw new P(409, `bad_status`, `Cette tentative n'est plus en attente.`);
    return cp(e, a, `Preuve présentée par le client (capture d'écran) sans confirmation du prestataire.`, t, r), np(e, i, n);
  });
}
function hp(e, t, n, r, i, a = new Date()) {
  let o = t.payments[n].verifyNotification(r, i, a);
  return j(e, () => {
    let t = k(e, `SELECT payment_id, company_id FROM payment_events WHERE provider = ? AND event_id = ?`, n, o.eventId);
    if (t) return {
      result: `duplicate`,
      paymentId: t.payment_id,
      companyId: t.company_id
    };
    let r = k(e, `SELECT * FROM payments WHERE method = ? AND provider_ref = ?`, n, o.providerRef),
      i = r ? null : Of(e, n, o, a);
    if (i) return A(e, `INSERT INTO payment_events (id, provider, event_id, company_id, payment_id, type, payload_json, result, received_at) VALUES (?,?,?,?,?,?,?,?,?)`, Fe(`evt`), n, o.eventId, i.companyId, i.paymentId, o.type, JSON.stringify(o), i.result, N(a)), {
      result: i.result,
      paymentId: i.paymentId,
      companyId: i.companyId
    };
    let s;
    return r ? o.amountMinor !== r.amount_minor || o.currency !== r.currency ? (s = `amount_mismatch`, cp(e, r, `Montant ou devise notifié différent de la demande.`, Ve, a), U(e, r.company_id, `finance`, `amount_mismatch`, `payment`, r.id, `Notification ${n} incohérente : ${o.amountMinor / 100} ${o.currency} notifié pour ${r.amount_minor / 100} ${r.currency} demandé.`, {
      providerRef: r.provider_ref,
      notifiedMinor: o.amountMinor,
      expectedMinor: r.amount_minor
    }, a)) : o.type === `payment.succeeded` ? s = op(e, r, `notification`, Ve, a) ? `confirmed` : `already_confirmed` : sp(e, r, o.failureReason ?? `Refusé par le prestataire.`, Ve, a) ? s = `failed` : (s = `ignored`, r.status === `confirmed` && U(e, r.company_id, `finance`, `conflicting_notification`, `payment`, r.id, `Échec notifié pour un paiement déjà confirmé : à contrôler avec le prestataire.`, {
      providerRef: r.provider_ref
    }, a)) : s = `unknown_reference`, A(e, `INSERT INTO payment_events (id, provider, event_id, company_id, payment_id, type, payload_json, result, received_at) VALUES (?,?,?,?,?,?,?,?,?)`, Fe(`evt`), n, o.eventId, r?.company_id ?? null, r?.id ?? null, o.type, JSON.stringify(o), s, N(a)), {
      result: s,
      paymentId: r?.id ?? null,
      companyId: r?.company_id ?? null
    };
  });
}
function gp(e, t, n, r, i) {
  (t.status === `pending` || t.status === `to_verify`) && op(e, t, `bank_statement`, r, i), A(e, `UPDATE payments SET settlement_status = 'settled', settled_at = ?, fee_actual_minor = ?, bank_line_id = ? WHERE id = ?`, N(i), n.feeMinor, n.id, t.id), ap(e, t.id, i);
  let a = k(e, `SELECT * FROM payments WHERE id = ?`, t.id);
  W(e, t.company_id, `settlement`, t.id, `Règlement bancaire ${t.provider_ref}`, a.amount_minor - a.refunded_minor - n.feeMinor, {
    providerRef: t.provider_ref,
    grossMinor: a.amount_minor - a.refunded_minor,
    feeMinor: n.feeMinor,
    valueDate: n.valueDate
  }, i);
  let o = k(e, `SELECT number FROM invoices WHERE id = ?`, t.invoice_id);
  He(e, r, `payment.settled`, `payment`, t.id, {
    invoice: o.number,
    method: t.method,
    amountMinor: a.amount_minor - a.refunded_minor,
    feeMinor: n.feeMinor,
    providerRef: t.provider_ref,
    valueDate: n.valueDate
  }, t.company_id, i);
}
async function _p(e, t, n, r, i, a, o = new Date()) {
  let s = n.companyId,
    {
      p: c,
      key: l
    } = j(e, () => {
      let t = np(e, s, r);
      if (t.status !== `confirmed`) throw new P(409, `bad_status`, `Seul un paiement confirmé peut être remboursé.`);
      if (i <= 0 || i > t.amount_minor - t.refunded_minor) throw new P(400, `amount_exceeds_balance`, `Montant supérieur au solde remboursable.`);
      return A(e, `UPDATE payments SET refunded_minor = refunded_minor + ? WHERE id = ?`, i, t.id), {
        p: t,
        key: `${t.id}:${t.refunded_minor}`
      };
    }),
    u;
  try {
    ({
      refundRef: u
    } = await t.payments[c.method].refund(c.provider_ref, i, l));
  } catch (t) {
    throw A(e, `UPDATE payments SET refunded_minor = refunded_minor - ? WHERE id = ?`, i, c.id), t;
  }
  return j(e, () => {
    let t = np(e, s, r);
    t.refunded_minor >= t.amount_minor && A(e, `UPDATE payments SET status = 'refunded' WHERE id = ?`, c.id), ap(e, c.id, o), A(e, `UPDATE invoices SET refunded_minor = refunded_minor + ? WHERE id = ?`, i, c.invoice_id), ip(e, c.invoice_id);
    let d = k(e, `SELECT id, number FROM invoices WHERE id = ?`, c.invoice_id);
    W(e, s, `refund`, l, `Remboursement ${d.number}`, -i, {
      invoice: d.number,
      providerRef: c.provider_ref,
      refundRef: u,
      amountMinor: i,
      reason: a
    }, o), ed(e, s, [`overpayment`], d.id, `Remboursement effectué.`, o), He(e, n, `payment.refunded`, `payment`, c.id, {
      invoice: d.number,
      amountMinor: i,
      reason: a,
      refundRef: u
    }, s, o);
  }), np(e, s, r);
}
function vp(e, t, n) {
  let r = k(e, `SELECT i.*, c.name AS customer, c.address, co.name AS company, o.number AS order_number
    FROM invoices i JOIN customers c ON c.id = i.customer_id JOIN companies co ON co.id = i.company_id JOIN orders o ON o.id = i.order_id WHERE i.id = ? AND i.company_id = ?`, n, t.companyId);
  if (!r) throw ze(`Facture`);
  lp(e, t, r);
  let i = k(e, `SELECT returns_json, returns_minor, pod_name, at, outcome, pod_signature FROM deliveries WHERE order_id = ?`, r.order_id);
  return {
    invoice: r,
    lines: O(e, `SELECT p.name AS product, p.unit, l.qty_ordered, l.qty_delivered, l.unit_price_minor FROM order_lines l JOIN products p ON p.id = l.product_id WHERE l.order_id = ?`, r.order_id),
    delivery: i ? {
      ...i,
      returns_json: void 0,
      returns: JSON.parse(i.returns_json)
    } : null,
    payments: O(e, `SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at`, n).map(rp)
  };
}

export { _p, ap, cp, dp, fp, gp, hp, ip, lp, mp, op, pp, sp, up, vp };
