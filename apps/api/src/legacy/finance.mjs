// GENERATED (step 1a, stage 2): v0.1.0 "finance" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TypeScript in the following commits.
/* eslint-disable */
import { Wd } from "./connectors.mjs";
import { A, Fe, He, N, O, P, Re, j, k } from "./core.mjs";
import { $u, Qu, U, Xu, ed } from "./distribution.mjs";
import { me } from "./lib.mjs";
import { gp } from "./payments.mjs";

var yp = e => `${e < 0 ? `-` : ``}${Math.trunc(Math.abs(e) / 100)}.${String(Math.abs(e) % 100).padStart(2, `0`)}`;
function bp(e, t, n = {}) {
  let r = [`p.company_id = ?`],
    i = [t];
  return n.status && (r.push(`p.status = ?`), i.push(n.status)), n.method && (r.push(`p.method = ?`), i.push(n.method)), n.settlement && (r.push(`p.settlement_status = ? AND p.status IN ('confirmed','refunded')`), i.push(n.settlement)), n.day && $u(n.day) && (r.push(`p.created_at >= ? AND p.created_at < ?`), i.push(...Qu(n.day))), O(e, `SELECT p.id, p.created_at, p.updated_at, p.confirmed_at, p.settled_at, p.method, p.amount_minor, p.refunded_minor, p.currency, p.status, p.settlement_status,
      p.provider_ref, p.failure_reason, p.verify_reason, p.confirmed_via, p.fee_expected_minor, p.fee_actual_minor,
      i.number AS invoice, i.id AS invoice_id, o.number AS order_number, o.id AS order_id, c.name AS customer, u.name AS agent, co.name AS company
    FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN orders o ON o.id = p.order_id JOIN customers c ON c.id = i.customer_id
    JOIN companies co ON co.id = p.company_id LEFT JOIN users u ON u.id = p.agent_id
    WHERE ${r.join(` AND `)} ORDER BY p.created_at DESC, p.rowid DESC LIMIT 500`, ...i);
}
var xp = (e, t) => O(e, `SELECT i.id, i.number, i.issued_at, i.amount_minor, i.paid_minor, i.refunded_minor, i.status, i.order_id, o.number AS order_number, c.name AS customer, u.name AS agent, r.name AS route,
      (SELECT COALESCE(SUM(amount_minor - refunded_minor), 0) FROM payments WHERE invoice_id = i.id AND settlement_status = 'settled') AS settled_minor,
      (SELECT status FROM erp_entries WHERE company_id = i.company_id AND kind = 'invoice' AND entity_id = i.id) AS erp_status
    FROM invoices i JOIN orders o ON o.id = i.order_id JOIN customers c ON c.id = i.customer_id LEFT JOIN users u ON u.id = i.agent_id LEFT JOIN routes r ON r.id = i.route_id
    WHERE i.company_id = ? ORDER BY i.issued_at DESC, i.rowid DESC LIMIT 500`, t);
function Sp(e, t, n, r = new Date()) {
  let i = O(e, `SELECT p.* FROM payments p LEFT JOIN demo_provider_tx d ON d.provider_ref = p.provider_ref
    WHERE p.company_id = ? AND p.settlement_status = 'unsettled' AND p.amount_minor > p.refunded_minor
      AND (p.status = 'confirmed' OR (p.status = 'to_verify' AND d.status = 'succeeded')) ORDER BY p.created_at`, t),
    a = Xu(e, t).payments.methods,
    o = Re(r),
    s = i.map((e, t) => {
      let r = e.amount_minor - e.refunded_minor,
        s = Math.round(e.amount_minor * a[e.method].feeBps / 1e4);
      return n && i.length >= 3 && t === 0 && (s += 500), n && i.length >= 3 && t === 1 && (r -= 1e4), [o, e.provider_ref, `REGLEMENT ${e.method.toUpperCase()}`, yp(r), yp(s), yp(r - s)].join(`;`);
    });
  return n && s.push([o, `VIR-INCONNU-${o.replace(/-/g, ``)}`, `VIREMENT RECU SANS REFERENCE`, `1250.00`, `0.00`, `1250.00`].join(`;`)), [Wd, ...s].join(`\r
`) + `\r
`;
}
function Cp(e, t, n, r, i, a = new Date()) {
  let o = n.companyId,
    s = t.bank.parse(i);
  if (!s.length) throw new P(400, `bad_statement`, `Le relevé ne contient aucune ligne.`);
  return j(e, () => {
    let t = Fe(`stm`);
    A(e, `INSERT INTO bank_statements (id, company_id, filename, imported_by, imported_at, line_count, matched_count, skipped_count) VALUES (?,?,?,?,?,0,0,0)`, t, o, r.slice(0, 120), n.id, N(a));
    let i = {
      matched: 0,
      exceptions: 0,
      skipped: 0
    };
    for (let r of s) {
      let s = me(`sha256`).update([r.valueDate, r.reference, r.grossMinor, r.feeMinor].join(`|`)).digest(`hex`);
      if (k(e, `SELECT 1 FROM bank_lines WHERE company_id = ? AND line_hash = ?`, o, s)) {
        i.skipped++;
        continue;
      }
      let c = Fe(`bl`),
        l = k(e, `SELECT * FROM payments WHERE company_id = ? AND provider_ref = ?`, o, r.reference),
        u;
      if (!l) u = `unmatched`, U(e, o, `finance`, `unknown_credit`, `bank_line`, c, `Crédit bancaire sans paiement correspondant : ${r.reference} (${yp(r.grossMinor)}).`, {
        reference: r.reference,
        grossMinor: r.grossMinor,
        valueDate: r.valueDate
      }, a);else if (l.settlement_status === `settled`) u = `duplicate`, U(e, o, `finance`, `duplicate_settlement`, `bank_line`, c, `Référence ${r.reference} créditée une seconde fois sur le relevé.`, {
        reference: r.reference,
        grossMinor: r.grossMinor
      }, a);else if (l.status === `failed`) u = `unmatched`, U(e, o, `finance`, `credit_on_failed`, `bank_line`, c, `Crédit reçu pour ${r.reference}, enregistré comme échoué : à contrôler avec le prestataire.`, {
        reference: r.reference,
        grossMinor: r.grossMinor,
        paymentId: l.id
      }, a);else if (r.grossMinor !== l.amount_minor - l.refunded_minor) u = `amount_mismatch`, U(e, o, `finance`, `settlement_amount_mismatch`, `bank_line`, c, `Écart de montant sur ${r.reference} : ${yp(r.grossMinor)} crédité pour ${yp(l.amount_minor - l.refunded_minor)} attendu.`, {
        reference: r.reference,
        creditedMinor: r.grossMinor,
        expectedMinor: l.amount_minor - l.refunded_minor,
        paymentId: l.id
      }, a);else {
        u = `matched`, gp(e, l, {
          id: c,
          feeMinor: r.feeMinor,
          valueDate: r.valueDate
        }, n, a);
        let t = k(e, `SELECT fee_expected_minor FROM payments WHERE id = ?`, l.id).fee_expected_minor;
        r.feeMinor !== t && U(e, o, `finance`, `fee_variance`, `bank_line`, c, `Écart de frais sur ${r.reference} : ${yp(r.feeMinor)} prélevé pour ${yp(t)} attendu.`, {
          reference: r.reference,
          feeMinor: r.feeMinor,
          expectedMinor: t,
          paymentId: l.id
        }, a);
      }
      u === `matched` ? i.matched++ : i.exceptions++, A(e, `INSERT INTO bank_lines (id, statement_id, company_id, line_hash, value_date, reference, label, gross_minor, fee_minor, net_minor, match_status, payment_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, c, t, o, s, r.valueDate, r.reference, r.label, r.grossMinor, r.feeMinor, r.netMinor, u, l?.id ?? null);
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
var wp = (e, t) => ({
  statements: O(e, `SELECT s.*, u.name AS imported_by_name FROM bank_statements s LEFT JOIN users u ON u.id = s.imported_by WHERE s.company_id = ? ORDER BY s.imported_at DESC LIMIT 30`, t),
  lines: O(e, `SELECT b.id, b.value_date, b.reference, b.label, b.gross_minor, b.fee_minor, b.net_minor, b.match_status, i.number AS invoice, p.fee_expected_minor, p.method
    FROM bank_lines b LEFT JOIN payments p ON p.id = b.payment_id LEFT JOIN invoices i ON i.id = p.invoice_id WHERE b.company_id = ? ORDER BY b.rowid DESC LIMIT 300`, t),
  unsettled: O(e, `SELECT p.id, p.provider_ref, p.method, p.amount_minor - p.refunded_minor AS amount_minor, p.confirmed_at, i.number AS invoice FROM payments p JOIN invoices i ON i.id = p.invoice_id
    WHERE p.company_id = ? AND p.status = 'confirmed' AND p.settlement_status = 'unsettled' ORDER BY p.confirmed_at`, t)
});
function Tp(e, t, n) {
  if (!$u(n)) throw new P(400, `invalid_input`, `Jour invalide.`);
  let [r, i] = Qu(n),
    a = (n, ...r) => k(e, n, t, ...r).n;
  return {
    day: n,
    closed: k(e, `SELECT c.closed_at, u.name AS closed_by FROM daily_closes c LEFT JOIN users u ON u.id = c.closed_by WHERE c.company_id = ? AND c.day = ?`, t, n) ?? null,
    invoiced: a(`SELECT COALESCE(SUM(amount_minor), 0) AS n FROM invoices WHERE company_id = ? AND issued_at >= ? AND issued_at < ?`, r, i),
    byMethod: O(e, `SELECT method, COUNT(*) AS count, SUM(amount_minor) AS confirmed_minor, SUM(refunded_minor) AS refunded_minor, SUM(fee_expected_minor) AS fee_expected_minor,
        SUM(CASE WHEN settlement_status = 'settled' THEN amount_minor - refunded_minor ELSE 0 END) AS settled_minor, SUM(COALESCE(fee_actual_minor, 0)) AS fee_actual_minor
      FROM payments WHERE company_id = ? AND status IN ('confirmed','refunded') AND confirmed_at >= ? AND confirmed_at < ? GROUP BY method ORDER BY method`, t, r, i),
    failed: a(`SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'failed' AND created_at >= ? AND created_at < ?`, r, i),
    pending: a(`SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'pending' AND created_at < ?`, i),
    toVerify: a(`SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'to_verify' AND created_at < ?`, i),
    openExceptions: a(`SELECT COUNT(*) AS n FROM exceptions WHERE company_id = ? AND status = 'open' AND domain = 'finance'`),
    erpPending: a(`SELECT COUNT(*) AS n FROM erp_entries WHERE company_id = ? AND status != 'synced'`),
    outstanding: a(`SELECT COALESCE(SUM(amount_minor - paid_minor + refunded_minor), 0) AS n FROM invoices WHERE company_id = ? AND issued_at >= ? AND issued_at < ? AND status NOT IN ('paid','refunded')`, r, i)
  };
}
function Ep(e, t, n, r = new Date()) {
  let i = t.companyId;
  return j(e, () => {
    let a = Tp(e, i, n);
    if (n > Re(r)) throw new P(400, `future_day`, `Impossible de clôturer un jour à venir.`);
    if (a.closed) throw new P(409, `already_closed`, `Cette journée est déjà clôturée.`);
    if (a.pending) throw new P(409, `payments_pending`, `${a.pending} paiement(s) encore en attente : vérifiez leur statut avant de clôturer.`);
    return A(e, `INSERT INTO daily_closes (id, company_id, day, closed_by, closed_at, totals_json) VALUES (?,?,?,?,?,?)`, Fe(`cls`), i, n, t.id, N(r), JSON.stringify(a)), He(e, t, `day.closed`, `daily_close`, n, {
      day: n,
      invoicedMinor: a.invoiced,
      toVerify: a.toVerify,
      openExceptions: a.openExceptions
    }, i, r), Tp(e, i, n);
  });
}
var Dp = (e, t) => O(e, `SELECT c.day, c.closed_at, c.totals_json, u.name AS closed_by FROM daily_closes c LEFT JOIN users u ON u.id = c.closed_by WHERE c.company_id = ? ORDER BY c.day DESC LIMIT 60`, t).map(e => ({
    ...e,
    totals_json: void 0,
    totals: JSON.parse(e.totals_json)
  })),
  Op = (e, t) => O(e, `SELECT id, kind, entity_id, label, amount_minor, status, attempts, last_error, external_ref, created_at, synced_at FROM erp_entries WHERE company_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 400`, t);
async function kp(e, t, n, r = {}, i, a = new Date()) {
  let o = Xu(e, n).erp,
    s = O(e, `SELECT * FROM erp_entries WHERE company_id = ? AND status IN (${r.retryFailed || r.ids ? `'pending','failed'` : `'pending'`}) ORDER BY created_at, rowid LIMIT 200`, n).filter(e => !r.ids || r.ids.includes(e.id)),
    c = {
      synced: 0,
      failed: 0
    };
  for (let r of s) try {
    let {
      externalRef: i
    } = await t.erp.push({
      id: r.id,
      kind: r.kind,
      companyId: n,
      entityId: r.entity_id,
      label: r.label,
      amountMinor: r.amount_minor,
      payload: JSON.parse(r.payload_json)
    }, o);
    A(e, `UPDATE erp_entries SET status = 'synced', attempts = attempts + 1, last_error = NULL, external_ref = ?, synced_at = ? WHERE id = ?`, i, N(a), r.id), ed(e, n, [`erp_sync_failed`], r.id, `Écriture synchronisée.`, a), c.synced++;
  } catch (t) {
    let i = (t instanceof Error ? t.message : `Erreur inconnue`).slice(0, 300);
    A(e, `UPDATE erp_entries SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?`, i, r.id), U(e, n, `finance`, `erp_sync_failed`, `erp_entry`, r.id, `Écriture ERP en erreur : ${r.label}.`, {
      error: i
    }, a), c.failed++;
  }
  return i && s.length && He(e, i, `erp.sync`, `erp`, null, c, n, a), c;
}

export { Cp, Dp, Ep, Op, Sp, Tp, bp, kp, wp, xp, yp };
